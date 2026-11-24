/** A piece of text OCR found, with its upright bounding box in pixels. */
export interface Word {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  text: string;
  score: number;
}

export const midY = (w: Word) => (w.y0 + w.y1) / 2;
export const height = (w: Word) => w.y1 - w.y0;

export const word = (x0: number, x1: number, y0: number, y1: number, text: string, score = 1): Word => ({
  x0, x1, y0, y1, text, score,
});

export const byY = (a: Word, b: Word) => midY(a) - midY(b);
export const byX = (a: Word, b: Word) => a.x0 - b.x0;
export const byYThenX = (a: Word, b: Word) => midY(a) - midY(b) || a.x0 - b.x0;

/** Words on the same printed line, top to bottom. */
export function groupRows(words: Word[], h: number): Word[][] {
  const rows: Word[][] = [];
  for (const w of [...words].sort(byY)) {
    const last = rows.at(-1);
    if (last && Math.abs(midY(last.at(-1)!) - midY(w)) < 0.5 * h) last.push(w);
    else rows.push([w]);
  }
  return rows;
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Rounds the exact value of the number, half to even. `Math.round(x * 100)`
 * is off by one for prices such as 1.005 and 1.115.
 */
export function round(x: number, digits = 0): number {
  const scaled = x * 10 ** digits;
  // Only multiples of 1/16 can lie exactly halfway (up to 3 digits).
  if (Number.isInteger(x * 16) && Math.abs(scaled % 1) === 0.5) {
    const down = Math.floor(scaled);
    return (down % 2 === 0 ? down : down + 1) / 10 ** digits;
  }
  return Number(x.toFixed(digits));
}

export const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;
export const digitCount = (text: string) => count(text, /\d/g);
export const hasLetters = (text: string, n = 2) => count(text, /\p{L}/gu) >= n;

/**
 * Word boundary and word characters that know Turkish letters; JavaScript's
 * \b and \w only know ASCII.
 */
export const WORD_CHAR = '[\\p{L}\\p{N}_]';
export const B = `(?:(?<=${WORD_CHAR})(?!${WORD_CHAR})|(?<!${WORD_CHAR})(?=${WORD_CHAR}))`;

/** "i" in any case: /i does not pair the Turkish dotted İ and dotless ı. */
export const I = '[Iiİı]';

/** First element with the smallest / largest key. */
export const minBy = <T>(items: T[], key: (item: T) => number): T | undefined =>
  items.reduce<T | undefined>((best, x) => (best === undefined || key(x) < key(best) ? x : best), undefined);
export const maxBy = <T>(items: T[], key: (item: T) => number): T | undefined =>
  items.reduce<T | undefined>((best, x) => (best === undefined || key(x) > key(best) ? x : best), undefined);
