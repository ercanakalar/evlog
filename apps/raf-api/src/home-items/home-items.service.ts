import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { HomeUnit } from '../generated/prisma/enums';
import { normalizeProductName } from '../common/utils/normalize';
import { namesMatch, weightKg } from '../products/product-matcher';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeItemDto, UpdateHomeItemDto } from './dto/home-item.dto';

type Line = { name: string; rawName: string; quantity: Prisma.Decimal; unit: string | null };
type ReceiptLine = Line & { id: string };
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

/**
 * Which receipt lines raise which home items, and by how much. Each line
 * counts once per home item, even when both its clean and printed names match.
 */
export const matchLines = (homeItems: HomeItemRow[], lines: ReceiptLine[]) =>
  homeItems.flatMap((home) =>
    lines
      .filter((line) => namesMatch(home.name, line.name) || namesMatch(home.name, line.rawName))
      .map((line) => ({ home, line, amount: amountBought(line, home.unit) }))
      .filter((m) => m.amount > 0),
  );

/** Sum of the matched amounts per home item. */
const totals = (matches: { home: { id: string }; amount: number }[]) => {
  const map = new Map<string, number>();
  for (const m of matches) map.set(m.home.id, round3((map.get(m.home.id) ?? 0) + m.amount));
  return map;
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
    // A new product starts at 0: adding it only says "track this". Starting
    // at 1 made the first receipt count it twice (1 kefir bought -> 2).
    const count = dto.count ?? 0;
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

  /**
   * Raises counts for every home item a saved receipt matches, and records
   * each line's share so deleting the receipt can take exactly that back.
   */
  async countReceipt(tx: Prisma.TransactionClient, userId: string, receiptId: string) {
    await tx.receipt.update({ where: { id: receiptId }, data: { homeCountsRecorded: true } });
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trackHomeItems: true, countFromReceipts: true },
    });
    if (!user.trackHomeItems || !user.countFromReceipts) return;

    const receipt = await this.receiptLines(tx, receiptId);
    const matches = matchLines(await tx.homeItem.findMany({ where: { userId } }), receipt.items);
    for (const { home, line, amount } of matches) {
      await tx.homeItemChange.create({
        data: { homeItemId: home.id, receiptId, receiptItemId: line.id, amount },
      });
    }
    for (const [homeId, added] of totals(matches)) {
      await tx.homeItem.update({
        where: { id: homeId },
        data: {
          count: { increment: added },
          lastMatchAdded: added,
          lastMatchMarket: receipt.merchantName,
          lastMatchAt: receipt.issuedAt,
          lastMatchReceiptId: receiptId,
        },
      });
    }
  }

  /**
   * Takes back what a saved receipt added at home (when it is deleted).
   * Counts never go below 0, in case the user already lowered them by hand.
   */
  async uncountReceipt(tx: Prisma.TransactionClient, userId: string, receiptId: string) {
    const receipt = await tx.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      select: { status: true, homeCountsRecorded: true, merchantName: true, issuedAt: true },
    });
    if (receipt.status !== 'CONFIRMED') return [];

    let taken: Map<string, number>;
    if (receipt.homeCountsRecorded) {
      const changes = await tx.homeItemChange.findMany({ where: { receiptId } });
      taken = new Map();
      for (const c of changes) taken.set(c.homeItemId, round3((taken.get(c.homeItemId) ?? 0) + c.amount.toNumber()));
    } else {
      // Saved before changes were recorded: match the lines again, as when it was saved.
      const lines = await this.receiptLines(tx, receiptId);
      taken = totals(matchLines(await tx.homeItem.findMany({ where: { userId } }), lines.items));
    }

    const result: { homeItemId: string; amount: number }[] = [];
    for (const [homeId, amount] of taken) {
      const home = await tx.homeItem.findUnique({ where: { id: homeId } });
      if (!home) continue;
      const fromThisReceipt = receipt.homeCountsRecorded
        ? home.lastMatchReceiptId === receiptId
        : home.lastMatchMarket === receipt.merchantName &&
          home.lastMatchAt?.getTime() === receipt.issuedAt?.getTime();
      await tx.homeItem.update({
        where: { id: homeId },
        data: {
          count: Math.max(0, round3(home.count.toNumber() - amount)),
          ...(fromThisReceipt
            ? { lastMatchAdded: null, lastMatchMarket: null, lastMatchAt: null, lastMatchReceiptId: null }
            : {}),
        },
      });
      result.push({ homeItemId: homeId, amount });
    }
    return result;
  }

  private receiptLines(tx: Prisma.TransactionClient, receiptId: string) {
    return tx.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      select: {
        merchantName: true,
        issuedAt: true,
        items: { select: { id: true, name: true, rawName: true, quantity: true, unit: true } },
      },
    });
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
