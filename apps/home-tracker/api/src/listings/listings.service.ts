import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { Prisma } from '../generated/prisma/client';
import { ReportTarget } from '../generated/prisma/enums';
import { HomeAccessService } from '../homes/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { RatingsService } from '../ratings/ratings.service';
import { StorageService } from '../storage/storage.service';
import { randomToken, sha256 } from '../common/utils/crypto';
import { AddBrokerDto, LinkListingDto, UpdateListingDto } from './dto/listing.dto';
import { visiblePart } from './listing-snapshot';
import { SahibindenProvider } from './providers/sahibinden.provider';

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly ratings: RatingsService,
    private readonly storage: StorageService,
    private readonly sahibinden: SahibindenProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async list(homeId: string, userId: string) {
    await this.access.get(homeId, userId, ['OWNER']);
    return this.prisma.listing.findMany({
      where: { homeId },
      orderBy: { createdAt: 'desc' },
      include: {
        brokers: {
          where: { revokedAt: null },
          select: { id: true, agencyName: true, contactName: true, email: true, lastViewAt: true },
        },
        updates: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } },
      },
    });
  }

  async link(homeId: string, userId: string, dto: LinkListingDto) {
    await this.access.get(homeId, userId, ['OWNER']);
    const ref = this.sahibinden.parseReference(dto.reference);
    if (!ref) {
      throw new BadRequestException('Paste a sahibinden.com listing link or listing number');
    }
    const listing = await this.prisma.listing.create({
      data: { homeId, provider: 'SAHIBINDEN', ...ref, type: dto.type },
    });
    return this.syncListing(listing.id);
  }

  async sync(listingId: string, userId: string) {
    await this.owned(listingId, userId);
    return this.syncListing(listingId);
  }

  async update(listingId: string, userId: string, dto: UpdateListingDto) {
    const listing = await this.owned(listingId, userId);
    if (dto.coverPhotoId) {
      const photo = await this.prisma.conditionPhoto.findFirst({
        where: { id: dto.coverPhotoId, hiddenAt: null, session: { homeId: listing.homeId } },
      });
      if (!photo) throw new BadRequestException('Cover photo must be from this home');
    }
    return this.prisma.listing.update({ where: { id: listingId }, data: dto });
  }

  async remove(listingId: string, userId: string) {
    await this.owned(listingId, userId);
    await this.prisma.listing.delete({ where: { id: listingId } });
  }

  /** Gives an agency read-only access. The share link is only returned once. */
  async addBroker(listingId: string, userId: string, dto: AddBrokerDto) {
    await this.owned(listingId, userId);
    const token = randomToken(32);
    const broker = await this.prisma.brokerAccess.create({
      data: {
        listingId,
        agencyName: dto.agencyName,
        contactName: dto.contactName,
        email: dto.email,
        tokenHash: sha256(token),
      },
      omit: { tokenHash: true },
    });
    const shareUrl = new URL(
      `/api/v1/shared/listings/${token}`,
      this.config.get('PUBLIC_API_URL', { infer: true }),
    ).toString();
    return { broker, shareToken: token, shareUrl };
  }

  async revokeBroker(listingId: string, brokerId: string, userId: string) {
    await this.owned(listingId, userId);
    const { count } = await this.prisma.brokerAccess.updateMany({
      where: { id: brokerId, listingId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Broker access not found');
  }

  /** "Send update": freezes what is shared right now for the brokers. */
  async sendUpdate(listingId: string, userId: string) {
    const listing = await this.owned(listingId, userId);
    if (listing.hiddenAt) throw new ForbiddenException('A moderator hid this listing');
    const snapshot = await this.buildSnapshot(listing.id);
    const update = await this.prisma.listingUpdate.create({
      data: { listingId, snapshot: snapshot as Prisma.InputJsonValue },
    });
    const recipients = await this.prisma.brokerAccess.count({
      where: { listingId, revokedAt: null },
    });
    // Delivery (e-mail/push to brokers) plugs in here.
    return { id: update.id, createdAt: update.createdAt, recipients, snapshot };
  }

  /** Public, token-based view for brokers. */
  async sharedView(token: string) {
    const broker = await this.brokerByToken(token);
    const { sharedAt, snapshot } = await this.latestShared(broker);
    await this.prisma.brokerAccess.update({
      where: { id: broker.id },
      data: { lastViewAt: new Date() },
    });
    return { sharedAt, ...snapshot };
  }

  /** Whether this link shows that rating or photo. */
  async shares(token: string, targetType: ReportTarget, targetId: string): Promise<boolean> {
    const { snapshot } = await this.latestShared(await this.brokerByToken(token));
    const list = targetType === ReportTarget.RATING ? snapshot.ratings : snapshot.photos;
    return ((list ?? []) as { id: string }[]).some((item) => item.id === targetId);
  }

  async sharedPhoto(token: string, photoId: string) {
    if (!(await this.shares(token, ReportTarget.CONDITION_PHOTO, photoId))) {
      throw new NotFoundException('Photo not found');
    }
    const photo = await this.prisma.conditionPhoto.findUniqueOrThrow({ where: { id: photoId } });
    return { stream: await this.storage.open(photo.storageKey), mimeType: photo.mimeType };
  }

  private async buildSnapshot(listingId: string) {
    const listing = await this.prisma.listing.findUniqueOrThrow({
      where: { id: listingId },
      include: { home: true },
    });
    const { home } = listing;
    const snapshot: Record<string, unknown> = {
      listing: {
        provider: listing.provider,
        url: listing.url,
        type: listing.type,
        title: listing.title,
        price: listing.priceAmount?.toFixed(2) ?? null,
        currency: listing.currency,
      },
      home: {
        city: home.city,
        district: home.district,
        neighborhood: home.neighborhood,
        roomLayout: home.roomLayout,
        areaM2: home.areaM2,
      },
    };

    if (listing.sharePhotos) {
      const record = await this.prisma.conditionSession.findFirst({
        where: { homeId: home.id, status: 'CONFIRMED' },
        orderBy: { startedAt: 'desc' },
        include: {
          photos: {
            where: { hiddenAt: null },
            orderBy: [{ room: 'asc' }, { receivedAt: 'asc' }],
            select: { id: true, room: true, receivedAt: true, sha256: true },
          },
        },
      });
      snapshot.conditionRecord = record && {
        type: record.type,
        lockedAt: record.lockedAt,
        contentHash: record.contentHash,
        confirmedByOwner: record.ownerConfirmedAt !== null,
        confirmedByTenant: record.tenantConfirmedAt !== null,
      };
      const cover = listing.coverPhotoId
        ? await this.prisma.conditionPhoto.findFirst({
            where: { id: listing.coverPhotoId, hiddenAt: null },
            select: { id: true },
          })
        : null;
      snapshot.coverPhotoId = cover?.id ?? record?.photos[0]?.id ?? null;
      snapshot.photos = record?.photos ?? [];
    }

    if (listing.shareRatings) {
      snapshot.score = await this.ratings.homeScore(home.id);
      snapshot.ratings = await this.ratings.published(home.id);
    }

    if (listing.shareHeatingBills) {
      // Monthly totals only; no names, merchants or images.
      snapshot.heatingBills = await this.prisma.$queryRaw<{ month: string; total: string }[]>`
        SELECT to_char(date_trunc('month', "issuedAt"), 'YYYY-MM') AS month,
               SUM("totalAmount")::text AS total
        FROM "Receipt"
        WHERE "homeId" = ${home.id}::uuid AND "kind" = 'UTILITY_GAS' AND "status" = 'CONFIRMED'
          AND "issuedAt" >= now() - interval '12 months'
        GROUP BY 1 ORDER BY 1
      `;
    }
    return snapshot;
  }

  private async syncListing(listingId: string) {
    const listing = await this.prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
    if (!this.sahibinden.canSync) return { ...listing, syncMode: 'link-only' as const };
    try {
      const data = await this.sahibinden.fetch(listing.externalId);
      const updated = await this.prisma.listing.update({
        where: { id: listingId },
        data: data
          ? {
              title: data.title,
              priceAmount: data.price,
              currency: data.currency,
              type: data.type,
              lastSyncedAt: new Date(),
              syncError: null,
            }
          : { syncError: 'Listing not found on sahibinden.com', lastSyncedAt: new Date() },
      });
      return { ...updated, syncMode: 'live' as const };
    } catch (error) {
      this.logger.warn(`Sync failed for ${listingId}: ${String(error)}`);
      const updated = await this.prisma.listing.update({
        where: { id: listingId },
        data: { syncError: 'Could not reach sahibinden.com' },
      });
      return { ...updated, syncMode: 'live' as const };
    }
  }

  private async owned(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    await this.access.get(listing.homeId, userId, ['OWNER']);
    return listing;
  }

  /** The broker behind a share link, while the link works. */
  async brokerByToken(token: string) {
    const broker = await this.prisma.brokerAccess.findUnique({
      where: { tokenHash: sha256(token) },
      include: { listing: { select: { homeId: true, hiddenAt: true } } },
    });
    if (!broker || broker.revokedAt || broker.listing.hiddenAt) {
      throw new NotFoundException('Link is invalid or revoked');
    }
    return broker;
  }

  private async latestShared(broker: { listingId: string; listing: { homeId: string } }) {
    const latest = await this.prisma.listingUpdate.findFirst({
      where: { listingId: broker.listingId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) throw new NotFoundException('Nothing has been shared yet');
    return {
      sharedAt: latest.createdAt,
      snapshot: await this.visible(broker.listing.homeId, latest.snapshot as Record<string, unknown>),
    };
  }

  /** Leaves out what moderators hid after the owner sent the snapshot. */
  private async visible(homeId: string, snapshot: Record<string, unknown>) {
    const [ratings, photos] = await Promise.all([
      this.prisma.rating.findMany({
        where: { homeId, hiddenAt: null },
        select: { id: true, noteHiddenAt: true },
      }),
      this.prisma.conditionPhoto.findMany({
        where: { session: { homeId }, hiddenAt: null },
        select: { id: true },
      }),
    ]);
    return visiblePart(snapshot, {
      ratings: new Set(ratings.map((r) => r.id)),
      notes: new Set(ratings.filter((r) => !r.noteHiddenAt).map((r) => r.id)),
      photos: new Set(photos.map((p) => p.id)),
    });
  }
}
