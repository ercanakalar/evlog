import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const [user, categories, markets] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: profileSelect }),
      this.prisma.receiptItem.groupBy({
        by: ['category'],
        where: { receipt: { userId, status: 'CONFIRMED' } },
      }),
      this.prisma.receipt.groupBy({
        by: ['merchantName'],
        where: { userId, status: 'CONFIRMED', merchantName: { not: null } },
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

  /** Deletes the account and everything in it (receipts, lists, home items). */
  async remove(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
