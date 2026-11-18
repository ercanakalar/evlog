import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { normalizeProductName } from '../common/utils/normalize';
import { namesMatch } from '../products/product-matcher';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeItemDto, UpdateHomeItemDto } from './dto/home-item.dto';

/** Packs bought on one line: weighed produce ("1.12 kg") counts as one. */
const packs = (quantity: Prisma.Decimal, unit: string | null) => {
  const n = quantity.toNumber();
  return unit && unit !== 'pcs' ? 1 : Math.max(1, Math.round(n));
};

/** Items at or below this count show as "running low". */
export const RUNNING_LOW_AT = 1;

/**
 * Products the user keeps at home, with a count. When a saved receipt has a
 * line whose name matches one, its count goes up by the packs bought.
 */
@Injectable()
export class HomeItemsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.homeItem.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /** Products that are nearly gone, for the market list suggestions. */
  runningLow(userId: string) {
    return this.prisma.homeItem.findMany({
      where: { userId, count: { lte: RUNNING_LOW_AT } },
      orderBy: { count: 'asc' },
    });
  }

  create(userId: string, dto: CreateHomeItemDto) {
    const normalizedName = normalizeProductName(dto.name);
    if (!normalizedName) throw new BadRequestException('Name is empty');
    // Duplicate names surface as 409 via PrismaExceptionFilter.
    return this.prisma.homeItem.create({
      data: { userId, name: dto.name, normalizedName, count: dto.count ?? 1 },
    });
  }

  async update(itemId: string, userId: string, dto: UpdateHomeItemDto) {
    await this.own(itemId, userId);
    return this.prisma.homeItem.update({
      where: { id: itemId },
      data: {
        count: dto.count,
        ...(dto.name ? { name: dto.name, normalizedName: normalizeProductName(dto.name) } : {}),
      },
    });
  }

  async remove(itemId: string, userId: string) {
    await this.own(itemId, userId);
    await this.prisma.homeItem.delete({ where: { id: itemId } });
  }

  /** Raises counts for every home item a saved receipt matches. */
  async countReceipt(tx: Prisma.TransactionClient, userId: string, receiptId: string) {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trackHomeItems: true, countFromReceipts: true },
    });
    if (!user.trackHomeItems || !user.countFromReceipts) return;

    const [homeItems, receipt] = await Promise.all([
      tx.homeItem.findMany({ where: { userId } }),
      tx.receipt.findUniqueOrThrow({
        where: { id: receiptId },
        select: {
          merchantName: true,
          issuedAt: true,
          items: { select: { name: true, rawName: true, quantity: true, unit: true } },
        },
      }),
    ]);
    for (const home of homeItems) {
      const added = receipt.items
        .filter((line) => namesMatch(home.name, line.name) || namesMatch(home.name, line.rawName))
        .reduce((sum, line) => sum + packs(line.quantity, line.unit), 0);
      if (added === 0) continue;
      await tx.homeItem.update({
        where: { id: home.id },
        data: {
          count: { increment: added },
          lastMatchAdded: added,
          lastMatchMarket: receipt.merchantName,
          lastMatchAt: receipt.issuedAt,
        },
      });
    }
  }

  private async own(itemId: string, userId: string) {
    const item = await this.prisma.homeItem.findUnique({ where: { id: itemId } });
    if (!item || item.userId !== userId) throw new NotFoundException('Item not found');
    return item;
  }
}
