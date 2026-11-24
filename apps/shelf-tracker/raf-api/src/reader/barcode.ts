import { digitCount } from './words';

const DIGIT_LIKE: Record<string, string> = {
  O: '0', o: '0', D: '0', Q: '0', B: '8', S: '5', Z: '2', I: '1', l: '1',
};

/** EAN-13 / EAN-8 check digit. */
export function eanValid(code: string): boolean {
  if (!/^(\d{8}|\d{13})$/.test(code)) return false;
  const odd = code.length === 13 ? 1 : 3;
  const sum = Array.from(code.slice(0, -1)).reduce((s, c, i) => s + Number(c) * (i % 2 ? 4 - odd : odd), 0);
  return (sum + Number(code.at(-1))) % 10 === 0;
}

/** Digits OCR confuses on receipt print. */
const LOOKALIKE_DIGITS: Record<string, string> = {
  0: '68', 6: '085', 8: '063', 1: '7', 7: '1', 3: '8', 5: '6', 9: '4', 4: '9',
};

/**
 * One misread digit, fixed with the check digit: every single look-alike swap
 * that makes a valid code. Kept only when the answer is unique (Turkish
 * barcodes, 868/869, win a tie).
 */
function repaired(code: string): string | undefined {
  let fixes = Array.from(code).flatMap((c, i) =>
    Array.from(LOOKALIKE_DIGITS[c] ?? '')
      .map((d) => code.slice(0, i) + d + code.slice(i + 1))
      .filter(eanValid),
  );
  fixes = [...new Set(fixes)];
  if (fixes.length > 1) fixes = fixes.filter((f) => /^86[89]/.test(f));
  return fixes.length === 1 ? fixes[0] : undefined;
}

/**
 * The first EAN-13 / EAN-8 barcode in OCR text whose check digit is right.
 * Look-alike letters are read as digits ("869O565OO7679"); a barcode glued to
 * the item number ("178690565007679") is found at the end of the run; one
 * misread digit is repaired with the check digit.
 */
export function findEan(text: string): string | undefined {
  for (const run of text.match(/[0-9ODQBSZIl]{8,16}/g) ?? []) {
    if (digitCount(run) * 4 < run.length * 3) continue;
    const digits = run.replace(/[^0-9]/g, (c) => DIGIT_LIKE[c]);
    // EAN-8 only when the number is 8 digits: inside a longer number it is chance.
    const size = digits.length >= 12 ? 13 : digits.length <= 9 ? 8 : 0;
    if (!size) continue;
    const ends = [digits.slice(Math.max(0, digits.length - size))];
    for (let i = 0; i < digits.length - size; i++) ends.push(digits.slice(i, i + size));
    const found = ends.find(eanValid) ?? repaired(ends[0]);
    if (found) return found;
  }
  return undefined;
}
