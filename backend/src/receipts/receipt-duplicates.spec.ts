import { sameReceipt, type ReceiptKey } from './receipt-duplicates';

const key = (issuedAt: string | null, totalAmount: number | null, receiptNo: string | null = null): ReceiptKey => ({
  issuedAt: issuedAt ? new Date(issuedAt) : null,
  totalAmount,
  receiptNo,
});

describe('the same receipt scanned twice', () => {
  it('is the same total on the same day at the same minute', () => {
    expect(sameReceipt(key('2026-11-08T17:31:00+03:00', 349.2), key('2026-11-08T17:31:40+03:00', 349.2))).toBe(true);
  });

  it('is the same total, day and receipt number, even when one photo lost the time', () => {
    expect(sameReceipt(key('2026-11-08T17:31:00+03:00', 349.2, '45'), key('2026-11-08', 349.2, '45'))).toBe(true);
  });

  it('is not another purchase with the same total that day', () => {
    // Bread twice a day at the same bakery.
    expect(sameReceipt(key('2026-11-08T08:10:00+03:00', 15), key('2026-11-08T18:40:00+03:00', 15))).toBe(false);
    expect(sameReceipt(key('2026-11-08T08:10:00+03:00', 15, '12'), key('2026-11-08T08:10:00+03:00', 15, '13'))).toBe(false);
  });

  it('needs the total, the date, and a time or number to tell', () => {
    expect(sameReceipt(key('2026-11-08', 15), key('2026-11-08', 15))).toBe(false);
    expect(sameReceipt(key(null, 15, '1'), key(null, 15, '1'))).toBe(false);
    expect(sameReceipt(key('2026-11-08T08:10:00+03:00', null), key('2026-11-08T08:10:00+03:00', null))).toBe(false);
    expect(sameReceipt(key('2026-11-08T08:10:00+03:00', 15), key('2026-11-08T08:10:00+03:00', 15.5))).toBe(false);
  });

  it("counts the day in Türkiye's time, where the receipt was printed", () => {
    expect(
      sameReceipt(key('2026-11-08T01:30:00+03:00', 20, '7'), key('2026-11-07T23:59:00+03:00', 20, '7')),
    ).toBe(false);
  });
});
