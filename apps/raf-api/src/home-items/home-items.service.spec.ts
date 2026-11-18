import { Prisma } from '../generated/prisma/client';
import { amountBought } from './home-items.service';

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
