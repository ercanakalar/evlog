import type { OcrItemDto, OcrResultDto } from './dto/ocr-result.dto';

/** Lowercase letters and digits only: OCR drops and adds spaces between photos. */
const squash = (name: string) =>
  name
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}]/gu, '');

/** Levenshtein distance, for names one or two characters apart. */
const distance = (a: string, b: string) => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

/** Names that differ by at most this share of their characters count as the same line. */
const MAX_NAME_DIFFERENCE = 0.2;

/**
 * The same printed line read in two photos: identical line total, and names
 * that match once spaces are ignored and a few misread characters allowed
 * ("DANOHE HEYVELIYOGURT" / "DANOHEHEYVELIYOGURT").
 */
export const sameLine = (a: OcrItemDto, b: OcrItemDto) => {
  if (a.totalPrice !== b.totalPrice) return false;
  const x = squash(a.name);
  const y = squash(b.name);
  if (x === y) return true;
  const longest = Math.max(x.length, y.length);
  return longest > 0 && distance(x, y) / longest <= MAX_NAME_DIFFERENCE;
};

/** Lines photographed twice where two parts overlap: longest suffix == prefix. */
const overlap = (previous: OcrItemDto[], next: OcrItemDto[]): number => {
  const max = Math.min(previous.length, next.length, 8);
  for (let size = max; size > 0; size--) {
    const tail = previous.slice(previous.length - size);
    if (tail.every((item, i) => sameLine(item, next[i]))) return size;
  }
  return 0;
};

const sum = (items: OcrItemDto[]) => Math.round(items.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;

/**
 * Last resort when the overlap was not found: if the lines add up to more
 * than the printed total, drop lines at the start of a part that repeat a
 * line near the end of the part before, when that makes the sum match.
 */
const dropRepeatsAtSeams = (parts: OcrItemDto[][], total: number): OcrItemDto[] | null => {
  const seams: number[] = []; // indexes in the joined list that repeat the previous part's tail
  let joined: OcrItemDto[] = [];
  for (const part of parts) {
    const tail = joined.slice(-8);
    part.forEach((item, i) => {
      if (i < 8 && tail.some((t) => sameLine(t, item))) seams.push(joined.length + i);
    });
    joined = joined.concat(part);
  }
  const excess = Math.round((sum(joined) - total) * 100) / 100;
  if (excess <= 0 || seams.length === 0) return null;
  // Try the repeated lines as one block from the seam (the usual case), then alone.
  for (let size = seams.length; size > 0; size--) {
    for (let start = 0; start + size <= seams.length; start++) {
      const drop = new Set(seams.slice(start, start + size));
      const removed = joined.filter((_, i) => drop.has(i));
      if (Math.abs(sum(removed) - excess) <= 0.01) return joined.filter((_, i) => !drop.has(i));
    }
  }
  return null;
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
  if (merged.total !== undefined && parts.length > 1 && sum(merged.items) > merged.total + 0.01) {
    const fixed = dropRepeatsAtSeams(
      parts.map((p) => p.items),
      merged.total,
    );
    if (fixed) merged.items = fixed;
  }
  return merged;
}
