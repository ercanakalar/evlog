import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ReportTarget } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ListReportsQueryDto, ResolveReportDto } from './dto/report.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Reports, oldest first, each with the content it is about (null once deleted). */
  async list({ status, cursor, take }: ListReportsQueryDto) {
    const reports = await this.prisma.report.findMany({
      where: { status },
      orderBy: { id: 'asc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { brokerAccess: { select: { agencyName: true } } },
    });
    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        content: await this.content(report.targetType, report.targetId),
      })),
    );
  }

  /** Applies the decision to the content and closes every open report about it. */
  async resolve(reportId: string, moderatorId: string, { action, note }: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    const { targetType, targetId } = report;
    if (action === 'HIDE_NOTE' && targetType !== ReportTarget.RATING) {
      throw new BadRequestException('Only ratings have a note');
    }
    const resolution = {
      status: action === 'HIDE' || action === 'HIDE_NOTE' ? ('ACTIONED' as const) : ('DISMISSED' as const),
      resolvedById: moderatorId,
      resolvedAt: new Date(),
      resolutionNote: note ?? null,
    };
    return this.prisma.$transaction(async (tx) => {
      await this.apply(tx, targetType, targetId, action);
      await tx.report.updateMany({
        where: { targetType, targetId, status: 'OPEN' },
        data: resolution,
      });
      return tx.report.update({ where: { id: reportId }, data: resolution });
    });
  }

  /** A reported photo, hidden or not. Other photos stay private to the home. */
  async photo(photoId: string) {
    const reported = await this.prisma.report.count({
      where: { targetType: ReportTarget.CONDITION_PHOTO, targetId: photoId },
    });
    const photo = reported
      ? await this.prisma.conditionPhoto.findUnique({ where: { id: photoId } })
      : null;
    if (!photo) throw new NotFoundException('No report about this photo');
    return { stream: await this.storage.open(photo.storageKey), mimeType: photo.mimeType };
  }

  /** `updateMany`: the content may have been deleted since it was reported. */
  private async apply(
    tx: Prisma.TransactionClient,
    targetType: ReportTarget,
    id: string,
    action: ResolveReportDto['action'],
  ): Promise<void> {
    if (action === 'DISMISS') return;
    const hiddenAt = action === 'RESTORE' ? null : new Date();
    if (targetType === ReportTarget.CONDITION_PHOTO) {
      await tx.conditionPhoto.updateMany({ where: { id }, data: { hiddenAt } });
    } else if (targetType === ReportTarget.LISTING) {
      await tx.listing.updateMany({ where: { id }, data: { hiddenAt } });
    } else {
      const data =
        action === 'RESTORE'
          ? { hiddenAt: null, noteHiddenAt: null }
          : action === 'HIDE_NOTE'
            ? { noteHiddenAt: hiddenAt }
            : { hiddenAt };
      await tx.rating.updateMany({ where: { id }, data });
    }
  }

  private content(targetType: ReportTarget, id: string) {
    switch (targetType) {
      case ReportTarget.RATING:
        return this.prisma.rating.findUnique({
          where: { id },
          select: {
            homeId: true,
            noteForNextTenant: true,
            noteHiddenAt: true,
            hiddenAt: true,
            submittedAt: true,
            scores: { select: { category: true, score: true } },
          },
        });
      case ReportTarget.CONDITION_PHOTO:
        return this.prisma.conditionPhoto.findUnique({
          where: { id },
          select: { room: true, note: true, receivedAt: true, hiddenAt: true },
        });
      case ReportTarget.LISTING:
        return this.prisma.listing.findUnique({
          where: { id },
          select: { homeId: true, url: true, title: true, hiddenAt: true },
        });
    }
  }
}
