import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import type { Env } from '../config/env.validation';
import { HomeAccessService } from '../homes/home-access.service';
import { PrismaService } from '../prisma/prisma.service';

// No 0/O/1/I so codes survive being read aloud or typed.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newInviteCode = () =>
  Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

@Injectable()
export class TenanciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Owner creates an invite; the tenant joins with the returned code. */
  async invite(homeId: string, ownerId: string, startDate: string) {
    const { activeTenancy } = await this.access.get(homeId, ownerId, ['OWNER']);
    if (activeTenancy) {
      throw new ConflictException('This home already has an active tenancy');
    }
    await this.prisma.tenancy.deleteMany({ where: { homeId, status: 'INVITED' } });
    return this.prisma.tenancy.create({
      data: { homeId, startDate: new Date(startDate), inviteCode: newInviteCode() },
    });
  }

  async accept(code: string, tenantId: string) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { inviteCode: code.toUpperCase() },
      include: { home: true },
    });
    if (!tenancy || tenancy.status !== 'INVITED') {
      throw new NotFoundException('Invite not found or already used');
    }
    if (tenancy.home.ownerId === tenantId) {
      throw new BadRequestException('The owner cannot be the tenant');
    }
    return this.prisma.tenancy.update({
      where: { id: tenancy.id },
      data: { status: 'ACTIVE', tenantId, inviteCode: null },
    });
  }

  async end(homeId: string, userId: string, endDate?: string) {
    const { activeTenancy } = await this.access.get(homeId, userId);
    if (!activeTenancy) throw new NotFoundException('No active tenancy');
    return this.prisma.tenancy.update({
      where: { id: activeTenancy.id },
      data: { status: 'ENDED', endDate: endDate ? new Date(endDate) : new Date() },
    });
  }

  list(homeId: string, userId: string) {
    return this.access.get(homeId, userId).then(({ role }) =>
      this.prisma.tenancy.findMany({
        where: {
          homeId,
          // Tenants only see their own tenancy; owners see the history.
          ...(role === 'TENANT' ? { tenantId: userId } : {}),
        },
        orderBy: { startDate: 'desc' },
        include: { tenant: { select: { id: true, fullName: true } } },
      }),
    );
  }

  /**
   * A tenancy is verified once the tenant has enough confirmed rent receipts
   * for this address, dated inside the tenancy. Called whenever a rent
   * receipt is confirmed.
   */
  async refreshVerification(tenancyId: string) {
    const tenancy = await this.prisma.tenancy.findUniqueOrThrow({
      where: { id: tenancyId },
    });
    if (!tenancy.tenantId || tenancy.verifiedAt) return tenancy;
    const months = await this.rentMonths(tenancy.homeId, tenancy.tenantId, tenancy.startDate, tenancy.endDate);
    if (months.length < this.config.get('RENT_RECEIPTS_TO_VERIFY', { infer: true })) {
      return tenancy;
    }
    return this.prisma.tenancy.update({
      where: { id: tenancyId },
      data: { verifiedAt: new Date() },
    });
  }

  /** Distinct YYYY-MM months covered by confirmed rent receipts. */
  async rentMonths(homeId: string, tenantId: string, from: Date, to: Date | null) {
    const receipts = await this.prisma.receipt.findMany({
      where: {
        homeId,
        userId: tenantId,
        kind: 'RENT',
        status: 'CONFIRMED',
        issuedAt: { gte: from, ...(to ? { lte: to } : {}) },
      },
      select: { issuedAt: true },
    });
    const months = new Set(
      receipts
        .filter((r) => r.issuedAt)
        .map((r) => r.issuedAt!.toISOString().slice(0, 7)),
    );
    return [...months].sort();
  }
}
