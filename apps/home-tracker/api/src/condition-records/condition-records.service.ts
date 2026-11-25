import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConditionSessionType, Room } from '../generated/prisma/enums';
import { HomeAccessService } from '../homes/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { sha256 } from '../common/utils/crypto';
import { UploadPhotoDto } from './dto/condition.dto';

/** Photos whose camera time is further than this from the server time are rejected. */
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ConditionRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly storage: StorageService,
  ) {}

  async list(homeId: string, userId: string) {
    await this.access.get(homeId, userId);
    const sessions = await this.prisma.conditionSession.findMany({
      where: { homeId },
      orderBy: { startedAt: 'desc' },
      include: { photos: { select: { room: true } } },
    });
    return sessions.map(({ photos, ...session }) => ({
      ...session,
      photoCount: photos.length,
      rooms: countByRoom(photos),
    }));
  }

  async create(homeId: string, userId: string, type: ConditionSessionType) {
    const { activeTenancy } = await this.access.get(homeId, userId);
    const open = await this.prisma.conditionSession.findFirst({
      where: { homeId, status: 'OPEN' },
    });
    if (open) {
      throw new ConflictException('Finish the open photo session first');
    }
    return this.prisma.conditionSession.create({
      data: {
        homeId,
        type,
        createdById: userId,
        tenancyId: activeTenancy?.id,
      },
    });
  }

  async get(sessionId: string, userId: string) {
    const session = await this.load(sessionId, userId);
    const photos = await this.prisma.conditionPhoto.findMany({
      where: { sessionId },
      orderBy: [{ room: 'asc' }, { receivedAt: 'asc' }],
      omit: { storageKey: true },
    });
    return {
      ...session,
      rooms: countByRoom(photos),
      // A hidden photo stays listed: it is part of the record's fingerprint.
      photos: photos.map((p) => (p.hiddenAt ? { ...p, note: null } : p)),
    };
  }

  async addPhoto(
    sessionId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadPhotoDto,
  ) {
    const session = await this.load(sessionId, userId);
    if (session.status !== 'OPEN') {
      throw new ConflictException('This record is locked; start a new photo session');
    }
    const capturedAt = new Date(dto.capturedAt);
    if (Math.abs(Date.now() - capturedAt.getTime()) > MAX_CLOCK_SKEW_MS) {
      throw new BadRequestException(
        'capturedAt must be within 24 hours of now; take a fresh photo',
      );
    }
    const hash = sha256(file.buffer);
    const duplicate = await this.prisma.conditionPhoto.findUnique({
      where: { sessionId_sha256: { sessionId, sha256: hash } },
    });
    if (duplicate) throw new ConflictException('This photo was already added');

    const storageKey = await this.storage.save('condition', file.buffer, file.mimetype);
    return this.prisma.conditionPhoto
      .create({
        data: {
          sessionId,
          uploadedById: userId,
          room: dto.room,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sha256: hash,
          capturedAt,
          latitude: dto.latitude,
          longitude: dto.longitude,
          note: dto.note,
        },
        omit: { storageKey: true },
      })
      .catch(async (error: unknown) => {
        await this.storage.remove([storageKey]);
        throw error;
      });
  }

  /**
   * Freezes the record. The content hash covers every photo hash in a fixed
   * order, so any later change to the set of photos is detectable.
   */
  async lock(sessionId: string, userId: string) {
    const session = await this.load(sessionId, userId);
    if (session.status !== 'OPEN') throw new ConflictException('Already locked');
    const photos = await this.prisma.conditionPhoto.findMany({
      where: { sessionId },
      orderBy: { id: 'asc' },
      select: { id: true, sha256: true, receivedAt: true },
    });
    if (photos.length === 0) {
      throw new BadRequestException('Add at least one photo before locking');
    }
    const contentHash = sha256(
      photos.map((p) => `${p.id}:${p.sha256}:${p.receivedAt.toISOString()}`).join('\n'),
    );
    const now = new Date();
    const confirmation =
      session.role === 'OWNER' ? { ownerConfirmedAt: now } : { tenantConfirmedAt: now };
    const updated = await this.prisma.conditionSession.update({
      // Guarded update: a concurrent lock or upload loses the race cleanly.
      where: { id: sessionId, status: 'OPEN' },
      data: { status: 'LOCKED', lockedAt: now, contentHash, ...confirmation },
    });
    return this.settle(updated.id);
  }

  async confirm(sessionId: string, userId: string) {
    const session = await this.load(sessionId, userId);
    if (session.status === 'OPEN') {
      throw new ConflictException('Lock the record before confirming');
    }
    if (session.role === 'TENANT' && session.tenancyId !== session.callerTenancyId) {
      throw new BadRequestException('This record belongs to another tenancy');
    }
    const field = session.role === 'OWNER' ? 'ownerConfirmedAt' : 'tenantConfirmedAt';
    if (!session[field]) {
      await this.prisma.conditionSession.update({
        where: { id: sessionId },
        data: { [field]: new Date() },
      });
    }
    return this.settle(sessionId);
  }

  async photoFile(photoId: string, userId: string) {
    const photo = await this.prisma.conditionPhoto.findUnique({
      where: { id: photoId },
      include: { session: { select: { homeId: true } } },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.access.get(photo.session.homeId, userId);
    if (photo.hiddenAt) throw new NotFoundException('This photo was hidden by a moderator');
    return { stream: await this.storage.open(photo.storageKey), mimeType: photo.mimeType };
  }

  /** CONFIRMED once every party that exists has confirmed. */
  private async settle(sessionId: string) {
    const session = await this.prisma.conditionSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const tenantDone = !session.tenancyId || session.tenantConfirmedAt !== null;
    if (session.status === 'LOCKED' && session.ownerConfirmedAt && tenantDone) {
      return this.prisma.conditionSession.update({
        where: { id: sessionId },
        data: { status: 'CONFIRMED' },
      });
    }
    return session;
  }

  private async load(sessionId: string, userId: string) {
    const session = await this.prisma.conditionSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Condition record not found');
    const { role, tenancy } = await this.access.get(session.homeId, userId);
    return { ...session, role, callerTenancyId: tenancy?.id };
  }
}

const countByRoom = (photos: { room: Room }[]) => {
  const counts: Partial<Record<Room, number>> = {};
  for (const { room } of photos) counts[room] = (counts[room] ?? 0) + 1;
  return counts;
};
