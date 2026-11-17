import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeDto, UpdateHomeDto } from './dto/home.dto';
import { HomeAccessService } from './home-access.service';
import { RatingsService } from '../ratings/ratings.service';
import { UpkeepService } from '../appliances/upkeep.service';
import { KitchenService } from '../kitchen/kitchen.service';

@Injectable()
export class HomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly ratings: RatingsService,
    private readonly upkeep: UpkeepService,
    private readonly kitchen: KitchenService,
  ) {}

  create(ownerId: string, dto: CreateHomeDto) {
    return this.prisma.home.create({
      data: {
        ownerId,
        city: dto.city,
        district: dto.district,
        neighborhood: dto.neighborhood,
        addressLine: dto.addressLine,
        roomLayout: dto.roomLayout,
        areaM2: dto.areaM2,
      },
    });
  }

  async update(homeId: string, userId: string, dto: UpdateHomeDto) {
    await this.access.get(homeId, userId, ['OWNER']);
    return this.prisma.home.update({ where: { id: homeId }, data: dto });
  }

  /** Everything the "My home" dashboard needs in one round trip. */
  async dashboard(homeId: string, userId: string) {
    const { home, role, activeTenancy } = await this.access.get(homeId, userId);
    const [score, latestRecord, listingCount, lowItems, nextTask] =
      await Promise.all([
        this.ratings.homeScore(homeId),
        this.prisma.conditionSession.findFirst({
          where: { homeId },
          orderBy: { startedAt: 'desc' },
          include: {
            photos: {
              select: { id: true, room: true },
              orderBy: { receivedAt: 'asc' },
            },
          },
        }),
        this.prisma.listing.count({ where: { homeId } }),
        this.kitchen.runningLow(homeId),
        this.upkeep.nextDue(homeId),
      ]);

    return {
      home,
      role,
      activeTenancy: activeTenancy
        ? {
            id: activeTenancy.id,
            startDate: activeTenancy.startDate,
            verified: activeTenancy.verifiedAt !== null,
          }
        : null,
      score,
      conditionRecord: latestRecord
        ? {
            id: latestRecord.id,
            type: latestRecord.type,
            status: latestRecord.status,
            startedAt: latestRecord.startedAt,
            photoCount: latestRecord.photos.length,
            previewPhotoIds: latestRecord.photos.slice(0, 3).map((p) => p.id),
          }
        : null,
      listings: { count: listingCount },
      kitchen: { lowCount: lowItems.length },
      upkeep: nextTask,
    };
  }
}
