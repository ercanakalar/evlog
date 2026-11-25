import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportTarget } from '../generated/prisma/enums';
import { HomeAccessService } from '../homes/home-access.service';
import { ListingsService } from '../listings/listings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, CreateSharedReportDto } from './dto/report.dto';

/** What the reporter gets back. */
const receiptOf = { id: true, status: true, createdAt: true } as const;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly listings: ListingsService,
  ) {}

  /** Reports content the user can see. Reporting the same thing again changes nothing. */
  async create(userId: string, dto: CreateReportDto) {
    const { targetType, targetId, reason, details } = dto;
    const target = await this.find(targetType, targetId);
    await this.access.get(target.homeId, userId);
    if (target.byUserId === userId) {
      throw new BadRequestException('You cannot report your own content');
    }
    const report = await this.prisma.report.upsert({
      where: { reporterId_targetType_targetId: { reporterId: userId, targetType, targetId } },
      create: { reporterId: userId, targetType, targetId, reason, details },
      update: {},
      select: receiptOf,
    });
    this.logger.warn(`Report ${report.id}: ${targetType} ${targetId} (${reason})`);
    return report;
  }

  /** The same for a broker, who has a share link instead of an account. */
  async createShared(token: string, dto: CreateSharedReportDto) {
    const broker = await this.listings.brokerByToken(token);
    const { targetType, reason, details } = dto;
    const targetId = targetType === ReportTarget.LISTING ? broker.listingId : dto.targetId!;
    if (targetType !== ReportTarget.LISTING && !(await this.listings.shares(token, targetType, targetId))) {
      throw new NotFoundException('Content not found');
    }
    const report = await this.prisma.report.upsert({
      where: {
        brokerAccessId_targetType_targetId: { brokerAccessId: broker.id, targetType, targetId },
      },
      create: { brokerAccessId: broker.id, targetType, targetId, reason, details },
      update: {},
      select: receiptOf,
    });
    this.logger.warn(`Report ${report.id}: ${targetType} ${targetId} (${reason})`);
    return report;
  }

  private async find(
    targetType: ReportTarget,
    targetId: string,
  ): Promise<{ homeId: string; byUserId: string | null }> {
    if (targetType === ReportTarget.RATING) {
      const rating = await this.prisma.rating.findFirst({
        where: { id: targetId, hiddenAt: null },
        select: { homeId: true, authorId: true },
      });
      if (rating) return { homeId: rating.homeId, byUserId: rating.authorId };
    } else if (targetType === ReportTarget.CONDITION_PHOTO) {
      const photo = await this.prisma.conditionPhoto.findFirst({
        where: { id: targetId, hiddenAt: null },
        select: { uploadedById: true, session: { select: { homeId: true } } },
      });
      if (photo) return { homeId: photo.session.homeId, byUserId: photo.uploadedById };
    }
    throw new NotFoundException('Content not found');
  }
}
