import { Prisma } from '../generated/prisma/client';
import { amountBought, variantsOf } from './home-items.service';

const line = (rawName: string, quantity = 1, unit: string | null = null) => ({
  name: rawName,
  rawName,
  quantity: new Prisma.Decimal(quantity),
  unit,
});

describe('amountBought', () => {
  it('counts packs for items kept in pieces', () => {
    expect(amountBought(line('TAM YAGLI SUT 1L', 2), 'PIECE')).toBe(2);
    expect(amountBought(line('MUZ KG', 1.12, 'kg'), 'PIECE')).toBe(1);
  });

  it('adds weight for items kept in kilograms', () => {
    expect(amountBought(line('MUZ KG', 1.12, 'kg'), 'KG')).toBe(1.12);
    expect(amountBought(line('MAKARNA 500G', 2), 'KG')).toBe(1);
    expect(amountBought(line('PIRINC 1KG'), 'KG')).toBe(1);
  });

  it('adds nothing by weight when the weight is unknown', () => {
    expect(amountBought(line('EKMEK'), 'KG')).toBe(0);
  });
});

describe('variantsOf', () => {
  const change = (amount: number, name: string, brand: string | null, pack: [number, string] | null, day = 1) => ({
    homeItemId: 'h',
    amount: new Prisma.Decimal(amount),
    receiptItem: {
      name,
      normalizedName: name.toLowerCase(),
      packAmount: pack ? new Prisma.Decimal(pack[0]) : null,
      packUnit: pack?.[1] ?? null,
      brand: brand ? { name: brand } : null,
      receipt: { merchantName: 'BİM', issuedAt: new Date(Date.UTC(2026, 10, day)) },
    },
  });

  it('splits a product by brand and pack size', () => {
    const variants = variantsOf([
      change(1, 'Ayran 1000 ml', 'Sütaş', [1000, 'ml']),
      change(2, 'Ayran 250 ml', 'Sütaş', [250, 'ml']),
      change(1, 'Ayran 250 ml', 'Sütaş', [250, 'ml'], 3),
    ]);
    expect(variants).toEqual([
      expect.objectContaining({ brand: 'Sütaş', packAmount: 250, packUnit: 'ml', count: 3, lastBoughtAt: new Date(Date.UTC(2026, 10, 3)) }),
      expect.objectContaining({ brand: 'Sütaş', packAmount: 1000, packUnit: 'ml', count: 1 }),
    ]);
  });

  it('drops what was used up and groups unbranded lines by name', () => {
    const variants = variantsOf([
      change(2, 'Whole milk 1 L', 'Pınar', [1, 'L']),
      change(-2, 'Whole milk 1 L', 'Pınar', [1, 'L']),
      change(1, 'Bread', null, null),
    ]);
    expect(variants).toEqual([expect.objectContaining({ brand: null, name: 'Bread', count: 1 })]);
  });
});
