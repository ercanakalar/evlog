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
});
