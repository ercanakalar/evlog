import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { HomeUnit } from '../generated/prisma/enums';
import { normalizeProductName } from '../common/utils/normalize';
import { namesMatch, weightKg } from '../products/product-matcher';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeItemDto, UpdateHomeItemDto } from './dto/home-item.dto';

type Line = { name: string; rawName: string; quantity: Prisma.Decimal; unit: string | null };
type HomeItemRow = Prisma.HomeItemGetPayload<object>;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** How much one receipt line adds to a home item, in that item's unit (0 = unknown). */
export const amountBought = (line: Line, unit: HomeUnit): number => {
  const quantity = line.quantity.toNumber();
  const weighed = line.unit?.toLowerCase() === 'kg';
  if (unit === 'KG') {
    if (weighed) return round3(quantity);
    // A pack with its weight in the name: "MAKARNA 500G" x 2 -> 1 kg.
    const perPack = weightKg(line.rawName) ?? weightKg(line.name);
    return perPack ? round3(perPack * Math.max(1, Math.round(quantity))) : 0;
  }
  // Pieces: weighed produce ("1.12 kg of bananas") counts as one bag.
  return weighed || (line.unit && line.unit !== 'pcs') ? 1 : Math.max(1, Math.round(quantity));
};

/** At or below this, an item shows as "running low": 1 piece, or half a kilo. */
export const RUNNING_LOW_AT: Record<HomeUnit, number> = { PIECE: 1, KG: 0.5 };

/** Counts go out as plain numbers ("1.25"), not Decimal strings. */
export const toHomeItem = (item: HomeItemRow) => ({
  ...item,
  count: item.count.toNumber(),
  lastMatchAdded: item.lastMatchAdded?.toNumber() ?? null,
});

/**
 * Products the user keeps at home, counted in pieces or kilograms. When a
 * saved receipt has a line whose name matches one, its count goes up by what
 * was bought.
 */
@Injectable()
export class HomeItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const items = await this.prisma.homeItem.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }] });
    return items.map(toHomeItem);
  }

  /** Products that are nearly gone, for the market list suggestions. */
  async runningLow(userId: string) {
    const items = await this.prisma.homeItem.findMany({
      where: {
        userId,
        OR: [
          { unit: 'PIECE', count: { lte: RUNNING_LOW_AT.PIECE } },
          { unit: 'KG', count: { lte: RUNNING_LOW_AT.KG } },
        ],
      },
      orderBy: { count: 'asc' },
    });
    return items.map(toHomeItem);
  }

  async create(userId: string, dto: CreateHomeItemDto) {
    const normalizedName = normalizeProductName(dto.name);
    if (!normalizedName) throw new BadRequestException('Name is empty');
    const unit = dto.unit ?? 'PIECE';
    const count = dto.count ?? (unit === 'KG' ? 0 : 1);
    this.checkCount(unit, count);
    // Duplicate names surface as 409 via PrismaExceptionFilter.
    return toHomeItem(
      await this.prisma.homeItem.create({ data: { userId, name: dto.name, normalizedName, unit, count } }),
    );
  }

  async update(itemId: string, userId: string, dto: UpdateHomeItemDto) {
    const item = await this.own(itemId, userId);
    const unit = dto.unit ?? item.unit;
    let count = dto.count ?? item.count.toNumber();
    // Pieces are whole: switching from kg rounds the amount.
    if (dto.count === undefined && unit === 'PIECE') count = Math.round(count);
    this.checkCount(unit, count);
    return toHomeItem(
      await this.prisma.homeItem.update({
        where: { id: itemId },
        data: {
          unit,
          count,
          ...(dto.unit && dto.unit !== item.unit ? { lastMatchAdded: null, lastMatchMarket: null, lastMatchAt: null } : {}),
          ...(dto.name ? { name: dto.name, normalizedName: normalizeProductName(dto.name) } : {}),
        },
      }),
    );
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
      const added = round3(
        receipt.items
          .filter((line) => namesMatch(home.name, line.name) || namesMatch(home.name, line.rawName))
          .reduce((sum, line) => sum + amountBought(line, home.unit), 0),
      );
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

  private checkCount(unit: HomeUnit, count: number) {
    if (unit === 'PIECE' && !Number.isInteger(count)) {
      throw new BadRequestException('Pieces are counted in whole numbers');
    }
  }

  private async own(itemId: string, userId: string) {
    const item = await this.prisma.homeItem.findUnique({ where: { id: itemId } });
    if (!item || item.userId !== userId) throw new NotFoundException('Item not found');
    return item;
  }
}
