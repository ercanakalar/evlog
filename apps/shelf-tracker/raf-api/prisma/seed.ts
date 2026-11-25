/**
 * Loads the shelf-life reference table (always) and, unless SEED_DEMO=false,
 * a demo account with a month of trips that matches the design mockups.
 * Safe to run more than once.
 *
 *   demo: demo@raf.app / Demo1234      (DEMO_LANGUAGE=tr: product names in Turkish)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';
import { normalizeProductName } from '../src/common/utils/normalize';
import { matchProduct, type ProductLanguage, type ShelfLifeEntry } from '../src/products/product-matcher';
import { SHELF_LIFE, SHELF_LIFE_SOURCE } from '../src/products/shelf-life.data';
import { TURKISH_NAMES } from '../src/products/turkish-names.data';

const LANGUAGE: ProductLanguage = process.env.DEMO_LANGUAGE === 'tr' ? 'tr' : 'en';
/** A product or list name of the demo account in its language. */
const local = (name: string) =>
  LANGUAGE === 'tr' ? ({ 'Weekend shop': 'Hafta sonu', 'Monthly stock': 'Aylık stok' }[name] ?? TURKISH_NAMES[name] ?? name) : name;

const DAY = 86_400_000;
const ago = (days: number, hour = 18) => {
  const d = new Date(Date.now() - days * DAY);
  d.setUTCHours(hour - 3, 20, 0, 0); // Istanbul time
  return d;
};

type Line = [raw: string, total: number, quantity?: number, unit?: string];
const TRIPS: { market: string; daysAgo: number; hour: number; lines: Line[] }[] = [
  {
    market: 'Migros', daysAgo: 2, hour: 18,
    lines: [
      ['TAM YAGLI SUT 1L', 117, 2], ['SUZME YOGURT 1KG', 124.5], ['YUMURTA 15LI', 139.5],
      ['BEYAZ PEYNIR 600G', 229], ['TAVUK GOGUS 1KG', 289], ['ISPANAK 500G', 42],
      ['DOMATES KG', 64, 1, 'kg'], ['EKSI MAYA EKMEK', 59.5],
    ],
  },
  {
    market: 'BİM', daysAgo: 4, hour: 11,
    lines: [['MUZ KG', 96.3, 1.12, 'kg'], ['PIRINC 1KG', 85], ['MAKARNA 500G', 34.5], ['TUVALET KAGIDI 16LI', 196.2]],
  },
  {
    market: 'A101', daysAgo: 8, hour: 19,
    lines: [['DANA KIYMA DONDURULMUS 500G', 210], ['SALCA 830G', 76.75]],
  },
];

async function main() {
  // node-postgres ignores ?schema=, so apply it like PrismaService does (e2e runs use their own schema).
  const url = new URL(process.env.DATABASE_URL!);
  const schema = url.searchParams.get('schema') ?? 'public';
  url.searchParams.delete('schema');
  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      {
        connectionString: url.toString(),
        ...(schema === 'public' ? {} : { options: `-c search_path="${schema}"` }),
      },
      { schema },
    ),
  });

  for (const [keyword, displayName, category, storage, shelfLifeDays, openedShelfLifeDays] of SHELF_LIFE) {
    const data = { displayName, category, storage, shelfLifeDays, openedShelfLifeDays, source: SHELF_LIFE_SOURCE };
    await prisma.shelfLife.upsert({ where: { keyword }, update: data, create: { keyword, ...data } });
  }
  console.log(`Shelf-life table: ${SHELF_LIFE.length} entries.`);

  if (process.env.SEED_DEMO === 'false') return prisma.$disconnect();
  const existing = await prisma.user.findUnique({ where: { email: 'demo@raf.app' } });
  if (existing) {
    console.log('Demo account already present.');
    return prisma.$disconnect();
  }

  const catalog: ShelfLifeEntry[] = await prisma.shelfLife.findMany();
  const user = await prisma.user.create({
    data: {
      email: 'demo@raf.app',
      fullName: 'Deniz Yılmaz',
      passwordHash: await argon2.hash('Demo1234', { type: argon2.argon2id }),
    },
  });

  for (const [index, trip] of TRIPS.entries()) {
    const issuedAt = ago(trip.daysAgo, trip.hour);
    const items = trip.lines.map(([raw, total, quantity = 1, unit], position) => {
      const match = matchProduct(raw, catalog, quantity, unit, LANGUAGE);
      return {
        position,
        name: match.name,
        rawName: raw,
        normalizedName: normalizeProductName(match.name),
        quantity,
        unit,
        unitPrice: Math.round((total / quantity) * 100) / 100,
        totalPrice: total,
        category: match.category,
        shelfLifeDays: match.shelfLifeDays,
        openedShelfLifeDays: match.openedShelfLifeDays,
        expiresAt: match.shelfLifeDays === null ? null : new Date(issuedAt.getTime() + match.shelfLifeDays * DAY),
      };
    });
    await prisma.receipt.create({
      data: {
        userId: user.id,
        status: 'CONFIRMED',
        // Demo trips did not raise any at-home counts, so deleting one takes nothing back.
        homeCountsRecorded: true,
        imageKeys: [],
        mimeType: 'image/jpeg',
        language: LANGUAGE,
        sha256: `demo-${index}`,
        merchantName: trip.market,
        issuedAt,
        confirmedAt: issuedAt,
        totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0),
        items: { create: items },
      },
    });
  }

  const home: [string, number, ('PIECE' | 'KG')?][] = [
    ['Whole milk', 3], ['Eggs', 1], ['Rice', 2, 'KG'], ['Pasta', 6],
    ['Tomatoes', 1.5, 'KG'], ['Bananas', 0.4, 'KG'],
    ['Tomato paste', 3], ['Toilet paper', 2], ['Olive oil', 1], ['Dish soap', 1],
  ];
  await prisma.homeItem.createMany({
    data: home.map(([name, count, unit = 'PIECE']) => ({
      userId: user.id,
      name: local(name),
      normalizedName: normalizeProductName(local(name)),
      unit,
      count,
    })),
  });

  await prisma.shoppingList.create({
    data: {
      userId: user.id,
      name: local('Weekend shop'),
      items: {
        create: ['Whole milk', 'Eggs', 'Tomatoes', 'Sourdough bread', 'Pasta'].map(local).map((name) => ({
          name,
          normalizedName: normalizeProductName(name),
        })),
      },
    },
  });
  await prisma.shoppingList.create({
    data: {
      userId: user.id,
      name: local('Monthly stock'),
      items: { create: ['Rice', 'Toilet paper'].map(local).map((name) => ({ name, normalizedName: normalizeProductName(name) })) },
    },
  });

  console.log('Demo account: demo@raf.app / Demo1234');
  await prisma.$disconnect();
}

void main();
