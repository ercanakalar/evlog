import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { HomeAccessService } from '../homes/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, daysBetween, normalizeProductName } from '../common/utils/normalize';
import { MarketPriceQueryDto, UpdatePantryItemDto } from './dto/kitchen.dto';

/** Used until an item has been bought twice and we can learn its real cadence. */
const DEFAULT_DURATION_DAYS = 21;
/** Market averages are only shown when at least this many prices exist. */
const MIN_MARKET_SAMPLES = 3;

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
  ) {}

  /** Turns a confirmed grocery receipt into pantry updates and price points. */
  async ingestReceipt(receiptId: string) {
    const receipt = await this.prisma.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: { items: true, home: { select: { id: true, city: true } } },
    });
    if (!receipt.home || !receipt.issuedAt) return;
    const homeId = receipt.home.id;
    const boughtAt = receipt.issuedAt;

    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        const existing = await tx.pantryItem.findUnique({
          where: { homeId_normalizedName: { homeId, normalizedName: item.normalizedName } },
        });
        if (!existing) {
          await tx.pantryItem.create({
            data: {
              homeId,
              name: item.name,
              normalizedName: item.normalizedName,
              unit: item.unit,
              packSize: item.quantity,
              lastPurchasedAt: boughtAt,
              purchaseCount: 1,
            },
          });
        } else if (!existing.lastPurchasedAt || boughtAt > existing.lastPurchasedAt) {
          const gap = existing.lastPurchasedAt
            ? daysBetween(existing.lastPurchasedAt, boughtAt)
            : null;
          // Exponential moving average of the gap between purchases.
          const usual =
            gap === null || gap < 1
              ? existing.usualDurationDays
              : existing.usualDurationDays === null
                ? gap
                : Math.round(existing.usualDurationDays * 0.6 + gap * 0.4);
          await tx.pantryItem.update({
            where: { id: existing.id },
            data: {
              lastPurchasedAt: boughtAt,
              purchaseCount: { increment: 1 },
              usualDurationDays: usual,
              packSize: item.quantity,
              unit: item.unit ?? existing.unit,
            },
          });
        }
        await tx.pricePoint.create({
          data: {
            receiptItemId: item.id,
            homeId,
            normalizedName: item.normalizedName,
            merchantName: receipt.merchantName,
            unit: item.unit,
            unitPrice: item.unitPrice ?? item.totalPrice,
            currency: receipt.currency,
            city: receipt.home!.city,
            observedAt: boughtAt,
          },
        });
      }
    });
  }

  async summary(homeId: string, userId: string) {
    await this.access.get(homeId, userId);
    const [lastScan, runningLow, priceWatch] = await Promise.all([
      this.prisma.receipt.findFirst({
        where: { homeId, kind: 'GROCERY', status: { in: ['PARSED', 'CONFIRMED'] } },
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          issuedAt: true,
          totalAmount: true,
          currency: true,
          _count: { select: { items: true } },
        },
      }),
      this.runningLow(homeId),
      this.priceWatch(homeId),
    ]);
    return {
      lastScan: lastScan && {
        receiptId: lastScan.id,
        issuedAt: lastScan.issuedAt,
        itemCount: lastScan._count.items,
        total: lastScan.totalAmount,
        currency: lastScan.currency,
      },
      runningLow,
      priceWatch,
    };
  }

  /** Items whose usual duration has (almost) passed since the last purchase. */
  async runningLow(homeId: string, now = new Date()) {
    const items = await this.prisma.pantryItem.findMany({
      where: { homeId, trackLow: true, lastPurchasedAt: { not: null } },
    });
    return items
      .map((item) => {
        const usual = item.usualDurationDays ?? DEFAULT_DURATION_DAYS;
        const daysSince = daysBetween(item.lastPurchasedAt!, now);
        return {
          id: item.id,
          name: item.name,
          lastPurchasedAt: item.lastPurchasedAt,
          daysSincePurchase: daysSince,
          usualDurationDays: item.usualDurationDays,
          expectedEmptyAt: addDays(item.lastPurchasedAt!, usual),
          urgency: daysSince / usual,
        };
      })
      .filter((item) => item.urgency >= 0.85)
      .sort((a, b) => b.urgency - a.urgency);
  }

  /** Latest price of each recently bought product vs. the previous purchase. */
  async priceWatch(homeId: string, limit = 8) {
    const rows = await this.prisma.$queryRaw<
      { normalizedName: string; name: string; unit: string | null; latest: Prisma.Decimal; previous: Prisma.Decimal | null; observedAt: Date }[]
    >`
      WITH ranked AS (
        SELECT pp."normalizedName", ri."name", pp."unit", pp."unitPrice", pp."observedAt",
               ROW_NUMBER() OVER (PARTITION BY pp."normalizedName" ORDER BY pp."observedAt" DESC, pp."id" DESC) AS rn
        FROM "PricePoint" pp
        JOIN "ReceiptItem" ri ON ri."id" = pp."receiptItemId"
        WHERE pp."homeId" = ${homeId}::uuid
      )
      SELECT cur."normalizedName", cur."name", cur."unit", cur."unitPrice" AS latest,
             prev."unitPrice" AS previous, cur."observedAt"
      FROM ranked cur
      LEFT JOIN ranked prev ON prev."normalizedName" = cur."normalizedName" AND prev.rn = 2
      WHERE cur.rn = 1
      ORDER BY cur."observedAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => {
      const latest = Number(row.latest);
      const previous = row.previous === null ? null : Number(row.previous);
      return {
        name: row.name,
        normalizedName: row.normalizedName,
        unit: row.unit,
        price: latest.toFixed(2),
        previousPrice: previous?.toFixed(2) ?? null,
        changePercent:
          previous && previous > 0 ? Math.round(((latest - previous) / previous) * 100) : null,
        observedAt: row.observedAt,
      };
    });
  }

  async pantry(homeId: string, userId: string) {
    await this.access.get(homeId, userId);
    return this.prisma.pantryItem.findMany({
      where: { homeId },
      orderBy: { lastPurchasedAt: 'desc' },
    });
  }

  async updatePantryItem(itemId: string, userId: string, dto: UpdatePantryItemDto) {
    const item = await this.prisma.pantryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    await this.access.get(item.homeId, userId);
    return this.prisma.pantryItem.update({ where: { id: itemId }, data: dto });
  }

  async shoppingList(homeId: string, userId: string) {
    await this.access.get(homeId, userId);
    return this.prisma.shoppingListItem.findMany({
      where: { homeId },
      orderBy: [{ doneAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
    });
  }

  async addShoppingItem(homeId: string, userId: string, name: string) {
    await this.access.get(homeId, userId);
    return this.prisma.shoppingListItem.create({ data: { homeId, name } });
  }

  async setShoppingItemDone(itemId: string, userId: string, done: boolean) {
    const item = await this.shoppingItem(itemId, userId);
    return this.prisma.shoppingListItem.update({
      where: { id: item.id },
      data: { doneAt: done ? new Date() : null },
    });
  }

  async removeShoppingItem(itemId: string, userId: string) {
    const item = await this.shoppingItem(itemId, userId);
    await this.prisma.shoppingListItem.delete({ where: { id: item.id } });
  }

  /**
   * Anonymous market data across every household. Results with too few
   * samples are hidden so a single household's shopping cannot be inferred.
   */
  async marketPrices(query: MarketPriceQueryDto) {
    const since = addDays(new Date(), -query.days);
    const term = `%${normalizeProductName(query.q).replace(/[%_]/g, '')}%`;
    const rows = await this.prisma.$queryRaw<
      { normalizedName: string; unit: string | null; avg: number; min: Prisma.Decimal; max: Prisma.Decimal; samples: bigint; households: bigint }[]
    >`
      SELECT "normalizedName", "unit",
             AVG("unitPrice")::float8 AS avg, MIN("unitPrice") AS min, MAX("unitPrice") AS max,
             COUNT(*) AS samples, COUNT(DISTINCT "homeId") AS households
      FROM "PricePoint"
      WHERE "normalizedName" ILIKE ${term}
        AND "observedAt" >= ${since}
        ${query.city ? Prisma.sql`AND "city" = ${query.city}` : Prisma.empty}
      GROUP BY "normalizedName", "unit"
      HAVING COUNT(DISTINCT "homeId") >= ${MIN_MARKET_SAMPLES}
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `;
    return rows.map((row) => ({
      product: row.normalizedName,
      unit: row.unit,
      average: row.avg.toFixed(2),
      min: Number(row.min).toFixed(2),
      max: Number(row.max).toFixed(2),
      samples: Number(row.samples),
    }));
  }

  private async shoppingItem(itemId: string, userId: string) {
    const item = await this.prisma.shoppingListItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    await this.access.get(item.homeId, userId);
    return item;
  }
}
