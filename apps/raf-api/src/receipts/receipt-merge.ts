import type { OcrItemDto, OcrResultDto } from './dto/ocr-result.dto';

const same = (a: OcrItemDto, b: OcrItemDto) =>
  a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.totalPrice === b.totalPrice;

/** Lines photographed twice where two parts overlap: longest suffix == prefix. */
const overlap = (previous: OcrItemDto[], next: OcrItemDto[]): number => {
  const max = Math.min(previous.length, next.length, 6);
  for (let size = max; size > 0; size--) {
    const tail = previous.slice(previous.length - size);
    if (tail.every((item, i) => same(item, next[i]))) return size;
  }
  return 0;
};

/**
 * Joins the parts of a long receipt, photographed top to bottom. The header
 * (market, date) comes from the first part that has one, the total from the
 * last, and lines seen in two overlapping photos are kept once.
 */
export function mergeReceiptParts(parts: OcrResultDto[]): OcrResultDto {
  const merged: OcrResultDto = { items: [] };
  for (const part of parts) {
    merged.merchantName ??= part.merchantName;
    merged.issuedAt ??= part.issuedAt;
    merged.currency ??= part.currency;
    if (part.total !== undefined) merged.total = part.total;
    merged.items.push(...part.items.slice(overlap(merged.items, part.items)));
    if (part.confidence !== undefined) {
      merged.confidence = Math.min(merged.confidence ?? 1, part.confidence);
    }
  }
  return merged;
}
