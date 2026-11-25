import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Tenancy } from '../generated/prisma/client';
import { RatingCategory, ReceiptKind } from '../generated/prisma/enums';
import { HomeAccessService } from '../homes/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitRatingDto } from './dto/rating.dto';
import { averageScores } from './home-score';

/** Which receipts prove the tenant can judge each category. */
const RECEIPT_EVIDENCE: Partial<Record<RatingCategory, ReceiptKind[]>> = {
  NEIGHBORHOOD: ['RENT'],
  INFRASTRUCTURE: ['UTILITY_ELECTRICITY', 'UTILITY_WATER', 'UTILITY_INTERNET'],
  HEATING_EFFICIENCY: ['UTILITY_GAS'],
  RENOVATIONS: ['RENOVATION'],
};

const REQUIREMENT: Record<RatingCategory, string> = {
  HOME_CONDITION: 'A confirmed condition record from your tenancy',
  NEIGHBORHOOD: 'Confirmed rent receipts',
  INFRASTRUCTURE: 'An electricity, water or internet bill',
  HEATING_EFFICIENCY: 'A gas bill',
  RENOVATIONS: 'A renovation receipt',
};

export interface CategoryEvidence {
  category: RatingCategory;
  requirement: string;
  eligible: boolean;
  receiptIds: string[];
  conditionSessionId: string | null;
}

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
  ) {}

  /** What the tenant can rate right now, and what is missing. */
  async eligibility(homeId: string, userId: string) {
    const { tenancy } = await this.access.get(homeId, userId, ['TENANT']);
    const existing = await this.prisma.rating.findUnique({
      where: { tenancyId: tenancy!.id },
      select: { id: true },
    });
    return {
      tenancyId: tenancy!.id,
      tenancyVerified: tenancy!.verifiedAt !== null,
      alreadyRated: existing !== null,
      categories: await this.evidence(tenancy!),
    };
  }

  async submit(homeId: string, userId: string, dto: SubmitRatingDto) {
    const { tenancy } = await this.access.get(homeId, userId, ['TENANT']);
    if (!tenancy!.verifiedAt) {
      throw new ForbiddenException(
        'Your tenancy is not verified yet. Scan and confirm your rent receipts first.',
      );
    }
    const evidence = new Map(
      (await this.evidence(tenancy!)).map((e) => [e.category, e]),
    );
    const missing = dto.scores.filter((s) => !evidence.get(s.category)?.eligible);
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Some categories have no verified evidence',
        categories: missing.map((s) => ({
          category: s.category,
          requirement: REQUIREMENT[s.category],
        })),
      });
    }

    const existing = await this.prisma.rating.findUnique({
      where: { tenancyId: tenancy!.id },
    });
    if (existing) throw new ConflictException('You already rated this tenancy');

    return this.prisma.rating.create({
      data: {
        homeId,
        tenancyId: tenancy!.id,
        authorId: userId,
        noteForNextTenant: dto.noteForNextTenant || null,
        scores: {
          create: dto.scores.map((s) => {
            const e = evidence.get(s.category)!;
            return {
              category: s.category,
              score: s.score,
              evidence: {
                create: [
                  ...e.receiptIds.map((receiptId) => ({ receiptId })),
                  ...(e.conditionSessionId
                    ? [{ conditionSessionId: e.conditionSessionId }]
                    : []),
                ],
              },
            };
          }),
        },
      },
      include: { scores: { include: { _count: { select: { evidence: true } } } } },
    });
  }

  async list(homeId: string, userId: string) {
    await this.access.get(homeId, userId);
    return this.published(homeId);
  }

  /** Ratings as shown to owners, tenants and brokers: no author identity. */
  published(homeId: string) {
    return this.prisma.rating.findMany({
      where: { homeId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        submittedAt: true,
        noteForNextTenant: true,
        tenancy: { select: { startDate: true, endDate: true } },
        scores: {
          select: {
            category: true,
            score: true,
            _count: { select: { evidence: true } },
          },
        },
      },
    });
  }

  async homeScore(homeId: string) {
    return averageScores(
      await this.prisma.rating.findMany({
        where: { homeId },
        select: { scores: { select: { category: true, score: true } } },
      }),
    );
  }

  private async evidence(tenancy: Tenancy): Promise<CategoryEvidence[]> {
    const [receipts, record] = await Promise.all([
      this.prisma.receipt.findMany({
        where: {
          homeId: tenancy.homeId,
          userId: tenancy.tenantId!,
          status: 'CONFIRMED',
          issuedAt: {
            gte: tenancy.startDate,
            ...(tenancy.endDate ? { lte: tenancy.endDate } : {}),
          },
        },
        select: { id: true, kind: true },
      }),
      this.prisma.conditionSession.findFirst({
        where: { homeId: tenancy.homeId, tenancyId: tenancy.id, status: 'CONFIRMED' },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      }),
    ]);

    return Object.values(RatingCategory).map((category) => {
      if (category === 'HOME_CONDITION') {
        return {
          category,
          requirement: REQUIREMENT[category],
          eligible: record !== null,
          receiptIds: [],
          conditionSessionId: record?.id ?? null,
        };
      }
      const kinds = RECEIPT_EVIDENCE[category] ?? [];
      const receiptIds = receipts.filter((r) => kinds.includes(r.kind)).map((r) => r.id);
      return {
        category,
        requirement: REQUIREMENT[category],
        eligible: receiptIds.length > 0,
        receiptIds,
        conditionSessionId: null,
      };
    });
  }
}
