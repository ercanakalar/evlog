import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpendingQueryDto } from './dto/insights.dto';

const MINUTE = 60_000;
const money = (n: Prisma.Decimal | number) => (typeof n === 'number' ? n : n.toNumber());
const fixed = (n: number) => n.toFixed(2);

/** Calendar maths in the user's own UTC offset. */
class Clock {
  constructor(private readonly offsetMinutes: number) {}

  /** UTC instant of the start of a local month (month may overflow). */
  monthStart(year: number, month: number): Date {
    return new Date(Date.UTC(year, month, 1) - this.offsetMinutes * MINUTE);
  }

  /** Local year and month of an instant. */
  local(date: Date) {
    const shifted = new Date(date.getTime() + this.offsetMinutes * MINUTE);
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
  }
}

const key = (year: number, month: number) => {
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsService,
  ) {}

  /** Everything the home screen shows. */
  async home(householdId: string, utcOffset: number) {
    const clock = new Clock(utcOffset);
    const now = new Date();
    const { year, month } = clock.local(now);
    const start = clock.monthStart(year, month);
    const previousStart = clock.monthStart(year, month - 1);
    // Same point in last month, for a fair "more / less than" comparison.
    const previousSameDay = new Date(
      Math.min(previousStart.getTime() + (now.getTime() - start.getTime()), start.getTime()),
    );

    const [current, previous, soon, soonCount, lastTrip] = await Promise.all([
      this.prisma.receipt.findMany({
        where: { householdId, status: 'CONFIRMED', issuedAt: { gte: start } },
        select: { totalAmount: true, _count: { select: { items: true } } },
      }),
      this.prisma.receipt.aggregate({
        where: { householdId, status: 'CONFIRMED', issuedAt: { gte: previousStart, lt: previousSameDay } },
        _sum: { totalAmount: true },
      }),
      this.items.shelf(householdId, { expiring: true, take: 3 }),
      this.prisma.receiptItem.count({
        where: {
          usedUpAt: null,
          onShelf: true,
          expiresAt: { not: null },
          receipt: { householdId, status: 'CONFIRMED' },
        },
      }),
      this.prisma.receipt.findFirst({
        where: { householdId, status: 'CONFIRMED' },
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          merchantName: true,
          issuedAt: true,
          totalAmount: true,
          currency: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

    const spent = current.reduce((sum, r) => sum + money(r.totalAmount ?? 0), 0);
    const before = money(previous._sum.totalAmount ?? 0);
    return {
      month: key(year, month),
      spent: fixed(spent),
      previousSameDay: fixed(before),
      trips: current.length,
      items: current.reduce((sum, r) => sum + r._count.items, 0),
      useSoon: soon,
      useSoonCount: soonCount,
      lastTrip: lastTrip
        ? {
            id: lastTrip.id,
            merchantName: lastTrip.merchantName,
            issuedAt: lastTrip.issuedAt,
            totalAmount: lastTrip.totalAmount,
            currency: lastTrip.currency,
            itemCount: lastTrip._count.items,
          }
        : null,
    };
  }

  /** Monthly totals and one month broken down by category and by market. */
  async spending(householdId: string, query: SpendingQueryDto) {
    const clock = new Clock(query.utcOffset);
    const { year, month } = clock.local(new Date());
    const first = clock.monthStart(year, month - (query.months - 1));

    const receipts = await this.prisma.receipt.findMany({
      where: { householdId, status: 'CONFIRMED', issuedAt: { gte: first } },
      select: { id: true, issuedAt: true, totalAmount: true, merchantName: true },
    });

    const months = Array.from({ length: query.months }, (_, i) => {
      const m = month - (query.months - 1) + i;
      return { month: key(year, m), total: 0, trips: 0 };
    });
    const byKey = new Map(months.map((m) => [m.month, m]));
    for (const r of receipts) {
      const local = clock.local(r.issuedAt!);
      const bucket = byKey.get(key(local.year, local.month));
      if (!bucket) continue;
      bucket.total += money(r.totalAmount ?? 0);
      bucket.trips += 1;
    }

    const selected = query.month ?? key(year, month);
    const inMonth = receipts.filter((r) => {
      const local = clock.local(r.issuedAt!);
      return key(local.year, local.month) === selected;
    });

    const markets = new Map<string, number>();
    for (const r of inMonth) {
      const name = r.merchantName ?? '';
      markets.set(name, (markets.get(name) ?? 0) + money(r.totalAmount ?? 0));
    }

    const categories = await this.prisma.receiptItem.groupBy({
      by: ['category'],
      where: { receiptId: { in: inMonth.map((r) => r.id) } },
      _sum: { totalPrice: true },
    });

    const sorted = <T extends { total: number }>(rows: T[]) =>
      rows.sort((a, b) => b.total - a.total).map((r) => ({ ...r, total: fixed(r.total) }));

    return {
      months: months.map((m) => ({ ...m, total: fixed(m.total) })),
      month: selected,
      total: fixed(inMonth.reduce((sum, r) => sum + money(r.totalAmount ?? 0), 0)),
      byCategory: sorted(
        categories.map((c) => ({ category: c.category, total: money(c._sum.totalPrice ?? 0) })),
      ),
      byMarket: sorted([...markets].map(([market, total]) => ({ market: market || null, total }))),
    };
  }
}
