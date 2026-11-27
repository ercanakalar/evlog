/** What tells one paper receipt apart from another purchase. */
export interface ReceiptKey {
  issuedAt: Date | null;
  totalAmount: { toString(): string } | number | null;
  receiptNo: string | null;
}

/** Receipts are dated in Türkiye's time (UTC+3): the day and minute as printed. */
const TR_OFFSET_MS = 3 * 3_600_000;
const day = (d: Date) => new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
/** A date read without its time is stored at midnight UTC. */
const hasTime = (d: Date) => d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds() > 0;
const minute = (d: Date) => Math.floor(d.getTime() / 60_000);

/**
 * Two photos of the same paper receipt: the same total on the same day, and
 * either the same minute or the same receipt number (FİŞ NO). The market's
 * name is left out: two photos often read it differently, and two purchases
 * at one market on one day are told apart by the time or number anyway.
 */
export function sameReceipt(a: ReceiptKey, b: ReceiptKey): boolean {
  if (!a.issuedAt || !b.issuedAt || a.totalAmount === null || b.totalAmount === null) return false;
  if (Number(a.totalAmount.toString()) !== Number(b.totalAmount.toString())) return false;
  if (day(a.issuedAt) !== day(b.issuedAt)) return false;
  if (a.receiptNo && b.receiptNo) return a.receiptNo === b.receiptNo;
  return hasTime(a.issuedAt) && hasTime(b.issuedAt) && minute(a.issuedAt) === minute(b.issuedAt);
}
