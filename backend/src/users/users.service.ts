import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateSettingsDto } from './dto/settings.dto';

const profileSelect = {
  id: true,
  email: true,
  fullName: true,
  googleSub: true,
  passwordHash: true,
  createdAt: true,
  currency: true,
  expiryReminders: true,
  reminderLeadDays: true,
  trackHomeItems: true,
  countFromReceipts: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async me(userId: string) {
    const { householdId } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { householdId: true },
    });
    const [user, categories, markets] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: profileSelect }),
      this.prisma.receiptItem.groupBy({
        by: ['category'],
        where: { receipt: { householdId, status: 'CONFIRMED' } },
      }),
      this.prisma.receipt.groupBy({
        by: ['merchantName'],
        where: { householdId, status: 'CONFIRMED', merchantName: { not: null } },
      }),
    ]);
    const { googleSub, passwordHash, ...profile } = user;
    return {
      ...profile,
      signInMethods: [
        ...(googleSub ? ['google' as const] : []),
        ...(passwordHash ? ['password' as const] : []),
      ],
      categoryCount: categories.length,
      marketCount: markets.length,
    };
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.me(userId);
  }

  /**
   * Deletes the account. The household's receipts (and their photos), lists
   * and home items go with it when nobody else lives there; otherwise they
   * stay for the others, and receipts this person scanned no longer say who.
   */
  async remove(userId: string) {
    const imageKeys = await this.prisma.$transaction(async (tx) => {
      // Holds back uploads in flight, so no photo is added after the keys are read.
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const { householdId } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { householdId: true } });
      // Holds back someone joining meanwhile.
      await tx.$queryRaw`SELECT 1 FROM "Household" WHERE "id" = ${householdId}::uuid FOR UPDATE`;
      await tx.user.delete({ where: { id: userId } });
      if ((await tx.user.count({ where: { householdId } })) > 0) return [];
      const receipts = await tx.receipt.findMany({ where: { householdId }, select: { imageKeys: true } });
      await tx.household.delete({ where: { id: householdId } });
      return receipts.flatMap((r) => r.imageKeys);
    });
    await this.storage.remove(imageKeys);
  }
}
