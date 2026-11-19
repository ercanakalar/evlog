import { mergeReceiptParts } from './receipt-merge';

describe('mergeReceiptParts', () => {
  it('keeps the header of the first part, the total of the last and drops overlapping lines', () => {
    const merged = mergeReceiptParts([
      {
        merchantName: 'BIM',
        issuedAt: '2026-11-18T18:24:00+03:00',
        items: [
          { name: 'SUT', totalPrice: 56 },
          { name: 'MAKARNA', totalPrice: 34.5 },
        ],
      },
      {
        total: 130.8,
        items: [
          { name: 'MAKARNA', totalPrice: 34.5 },
          { name: 'MUZ', totalPrice: 40.3 },
        ],
      },
    ]);
    expect(merged.merchantName).toBe('BIM');
    expect(merged.total).toBe(130.8);
    expect(merged.items.map((i) => i.name)).toEqual(['SUT', 'MAKARNA', 'MUZ']);
  });

  it('keeps a product bought twice in one part', () => {
    const merged = mergeReceiptParts([
      { items: [{ name: 'SUT', totalPrice: 56 }, { name: 'SUT', totalPrice: 56 }] },
    ]);
    expect(merged.items).toHaveLength(2);
  });

  it('joins parts whose overlapping lines were read slightly differently (City Gross, kefir counted twice)', () => {
    const merged = mergeReceiptParts([
      {
        merchantName: 'CITY GROSS',
        items: [
          { name: 'NUTELLA750GR', totalPrice: 279.9 },
          { name: 'DANOHE HEYVELIYOGURT CILEKLI 400GR', quantity: 2, totalPrice: 159.8 },
          { name: 'ICIM KEFIR 1000 ML ORMAN MEYVEL', quantity: 1, totalPrice: 98.9 },
        ],
      },
      {
        total: 605.5,
        items: [
          { name: 'DANOHEHEYVELIYOGURT CILEKLI 400GR', quantity: 2, totalPrice: 159.8 },
          { name: 'ICIM KEFIR 1000 ML ORMAN MEYVEL', quantity: 1, totalPrice: 98.9 },
          { name: 'FR.SUP.CEREZIA 121GR STICK PEY.SOG', quantity: 1, totalPrice: 66.9 },
        ],
      },
    ]);
    expect(merged.items.map((i) => i.name)).toEqual([
      'NUTELLA750GR',
      'DANOHE HEYVELIYOGURT CILEKLI 400GR',
      'ICIM KEFIR 1000 ML ORMAN MEYVEL',
      'FR.SUP.CEREZIA 121GR STICK PEY.SOG',
    ]);
  });

  it('falls back to the printed total when a repeated line was not next to the seam', () => {
    const merged = mergeReceiptParts([
      { items: [{ name: 'SUT', totalPrice: 56 }, { name: 'KEFIR', totalPrice: 98.9 }] },
      {
        total: 186.4,
        // The second photo starts with a line the first one missed reading the price of.
        items: [{ name: 'XX', totalPrice: 31.5 }, { name: 'KEFIR', totalPrice: 98.9 }, { name: 'EKMEK', totalPrice: 0 }],
      },
    ]);
    expect(merged.items.map((i) => i.name)).toEqual(['SUT', 'KEFIR', 'XX', 'EKMEK']);
  });

  it('keeps two different products that cost the same', () => {
    const merged = mergeReceiptParts([
      { items: [{ name: 'MASTER POTATO SEBZE SOSLU CIPS', totalPrice: 84.5 }] },
      { items: [{ name: 'MASTER POTATO ACILI BAHARATLI CIPS', totalPrice: 84.5 }] },
    ]);
    expect(merged.items).toHaveLength(2);
  });
});

