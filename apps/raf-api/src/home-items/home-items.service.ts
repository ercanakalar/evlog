import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { HomeUnit } from '../generated/prisma/enums';
import { normalizeProductName } from '../common/utils/normalize';
import { addRunOut } from '../lists/run-out';
import { homeName, namesMatch, weightKg } from '../products/product-matcher';
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

/** One brand and pack size of a product at home: "Sütaş, 1000 ml, 1 left". */
export interface HomeVariant {
  brand: string | null;
  /** Clean name of the newest line ("Ayran 1000 ml"). */
  name: string;
  packAmount: number | null;
  packUnit: string | null;
  /** In the home item's unit, as receipts added it, less what was used up. */
  count: number;
  lastBoughtAt: Date | null;
  lastMarket: string | null;
}

const changeSource = {
  homeItemId: true,
  amount: true,
  receiptItem: {
    select: {
      name: true,
      normalizedName: true,
      packAmount: true,
      packUnit: true,
      brand: { select: { name: true } },
      receipt: { select: { merchantName: true, issuedAt: true } },
    },
  },
} satisfies Prisma.HomeItemChangeSelect;

type ChangeRow = Prisma.HomeItemChangeGetPayload<{ select: typeof changeSource }>;

/**
 * Groups receipt changes by brand and pack size. Lines with neither are
 * grouped by their name. Only what is still at home (count above 0) is kept,
 * most first.
 */
export const variantsOf = (changes: ChangeRow[]): HomeVariant[] => {
  const groups = new Map<string, HomeVariant>();
  for (const { amount, receiptItem: line } of changes) {
    const packAmount = line.packAmount?.toNumber() ?? null;
    const brand = line.brand?.name ?? null;
    const key = brand || packAmount ? `${brand}|${packAmount}|${line.packUnit}` : `|${line.normalizedName}`;
    const group = groups.get(key) ?? {
      brand,
      name: line.name,
      packAmount,
      packUnit: line.packUnit,
      count: 0,
      lastBoughtAt: null,
      lastMarket: null,
    };
    group.count = round3(group.count + amount.toNumber());
    const boughtAt = line.receipt.issuedAt;
    if (amount.isPositive() && boughtAt && (!group.lastBoughtAt || boughtAt > group.lastBoughtAt)) {
      group.lastBoughtAt = boughtAt;
      group.lastMarket = line.receipt.merchantName;
      group.name = line.name;
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((v) => v.count > 0)
    .sort((a, b) => b.count - a.count || (b.lastBoughtAt?.getTime() ?? 0) - (a.lastBoughtAt?.getTime() ?? 0));
};

/** Counts go out as plain numbers ("1.25"), not Decimal strings. */
export const toHomeItem = (item: HomeItemRow, variants: HomeVariant[] = []) => ({
  ...item,
  count: item.count.toNumber(),
  lastMatchAdded: item.lastMatchAdded?.toNumber() ?? null,
  variants,
});

/**
 * Products the user keeps at home, counted in pieces or kilograms. When a
 * saved receipt has a line whose name matches one, its count goes up by what
 * was bought. Using a product up puts what runs out on the market list; a
 * count lowered to 0 by hand goes there when the user says so.
 */
@Injectable()
export class HomeItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every product at home, each with its brands and pack sizes. */
  async list(userId: string) {
    const items = await this.prisma.homeItem.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }] });
    const changes = await this.prisma.homeItemChange.findMany({
      where: { homeItemId: { in: items.map((i) => i.id) } },
      select: changeSource,
    });
    return items.map((item) => toHomeItem(item, variantsOf(changes.filter((c) => c.homeItemId === item.id))));
  }

  /** One product at home with what it is made of: "Sütaş 1000 ml × 1, Sütaş 250 ml × 1". */
  async get(itemId: string, userId: string) {
    const item = await this.own(itemId, userId);
    const changes = await this.prisma.homeItemChange.findMany({ where: { homeItemId: itemId }, select: changeSource });
    return toHomeItem(item, variantsOf(changes));
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
    return items.map((item) => toHomeItem(item));
  }

  async create(userId: string, dto: CreateHomeItemDto) {
    const normalizedName = normalizeProductName(dto.name);
    if (!normalizedName) throw new BadRequestException('Name is empty');
    const unit = dto.unit ?? 'PIECE';
    // A product is usually added because there is one at home, so it starts
    // at 1. Adding one that is also on a receipt saved afterwards counts it twice.
    const count = dto.count ?? 1;
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
    await this.prisma.homeItem.update({
      where: { id: itemId },
      data: {
        unit,
        count,
        ...(dto.unit && dto.unit !== item.unit ? { lastMatchAdded: null, lastMatchMarket: null, lastMatchAt: null } : {}),
        ...(dto.name ? { name: dto.name, normalizedName: normalizeProductName(dto.name) } : {}),
      },
    });
    return this.get(itemId, userId);
  }

  /**
   * Puts the product on the market list, e.g. after the user lowered it to 0
   * and said yes. `addedToList` is null when it is already on a list.
   */
  async addToList(itemId: string, userId: string, newListName?: string) {
    const item = await this.own(itemId, userId);
    const addedToList = await this.prisma.$transaction((tx) => addRunOut(tx, userId, [item.name], newListName));
    return { addedToList };
  }

  async remove(itemId: string, userId: string) {
    await this.own(itemId, userId);
    await this.prisma.homeItem.delete({ where: { id: itemId } });
  }

  /**
   * Raises counts for every home item a saved receipt matches, and records
   * each line's share so deleting the receipt can take exactly that back.
   * The user chose per line: unchecked lines are skipped, and a checked line
   * that no home item matches gets one ("Ayran 1000 ml" adds "Ayran",
   * starting at 0, so the receipt alone makes the count) - unless the reader
   * could not tell what the product is and the user did not confirm it,
   * so raw receipt text never becomes an at-home product.
   */
  async countReceipt(tx: Prisma.TransactionClient, userId: string, receiptId: string) {
    await tx.receipt.update({ where: { id: receiptId }, data: { homeCountsRecorded: true } });
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trackHomeItems: true, countFromReceipts: true },
    });
    if (!user.trackHomeItems || !user.countFromReceipts) return;

    const receipt = await this.receiptLines(tx, receiptId);
    const lines = receipt.items.filter((line) => line.countAtHome !== false);
    const homeItems = await tx.homeItem.findMany({ where: { userId } });
    for (const line of lines.filter((l) => l.countAtHome === true && !l.needsReview)) {
      if (homeItems.some((h) => namesMatch(h.name, line.name) || namesMatch(h.name, line.rawName))) continue;
      const name = homeName(line.name);
      const normalizedName = normalizeProductName(name);
      if (!normalizedName || homeItems.some((h) => h.normalizedName === normalizedName)) continue;
      const unit: HomeUnit = line.unit?.toLowerCase() === 'kg' ? 'KG' : 'PIECE';
      homeItems.push(await tx.homeItem.create({ data: { userId, name, normalizedName, unit, count: 0 } }));
    }
    const matches = matchLines(homeItems, lines);
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
   * A product from a saved receipt was used up: every home item its line
   * matches goes down by what the line bought, never below 0. What was taken
   * is recorded against the receipt (as a negative change), so deleting the
   * receipt later takes back only what is still counted. Home items now at
   * 0 go on the market list; returns that list, or null.
   */
  async useUp(
    tx: Prisma.TransactionClient,
    userId: string,
    line: ReceiptLine & { receiptId: string },
    newListName?: string,
  ) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { trackHomeItems: true } });
    if (!user.trackHomeItems) return null;

    const empty: HomeItemRow[] = [];
    for (const { home, amount } of matchLines(await tx.homeItem.findMany({ where: { userId } }), [line])) {
      const before = home.count.toNumber();
      const after = Math.max(0, round3(before - amount));
      if (after !== before) {
        await tx.homeItemChange.create({
          data: { homeItemId: home.id, receiptId: line.receiptId, receiptItemId: line.id, amount: round3(after - before) },
        });
        await tx.homeItem.update({ where: { id: home.id }, data: { count: after } });
      }
      if (after === 0) empty.push(home);
    }
    return addRunOut(tx, userId, empty.map((home) => home.name), newListName);
  }

  /** Undoes `useUp` for a product marked used up by mistake. */
  async restoreUsedUp(tx: Prisma.TransactionClient, receiptItemId: string) {
    const taken = await tx.homeItemChange.findMany({ where: { receiptItemId, amount: { lt: 0 } } });
    for (const change of taken) {
      await tx.homeItem.update({
        where: { id: change.homeItemId },
        data: { count: { increment: change.amount.negated() } },
      });
    }
    await tx.homeItemChange.deleteMany({ where: { id: { in: taken.map((c) => c.id) } } });
  }

  /**
   * Takes back what a saved receipt added at home (when it is deleted), less
   * what its products already took away when they were used up. Counts never
   * go below 0, in case the user already lowered them by hand.
   */
  async uncountReceipt(tx: Prisma.TransactionClient, userId: string, receiptId: string) {
    const receipt = await tx.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      select: { status: true, homeCountsRecorded: true, merchantName: true, issuedAt: true },
    });
    if (receipt.status !== 'CONFIRMED') return [];

    // Saved before additions were recorded: match the lines again, as when it was saved.
    const taken = receipt.homeCountsRecorded
      ? new Map<string, number>()
      : totals(matchLines(await tx.homeItem.findMany({ where: { userId } }), (await this.receiptLines(tx, receiptId)).items));
    // Recorded changes: what it added, and (negative) what using its products up took away.
    const changes = await tx.homeItemChange.findMany({ where: { receiptId } });
    for (const c of changes) taken.set(c.homeItemId, round3((taken.get(c.homeItemId) ?? 0) + c.amount.toNumber()));

    const result: { homeItemId: string; amount: number }[] = [];
    for (const [homeId, amount] of taken) {
      if (amount <= 0) continue;
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
        items: {
          select: { id: true, name: true, rawName: true, quantity: true, unit: true, countAtHome: true, needsReview: true },
        },
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
