/**
 * Reads the expiry date from a photo of a product pack.
 *
 * Turkish packs print it after "SKT" (son tüketim tarihi, use by) or "TETT"
 * (tavsiye edilen tüketim tarihi, best before); imported ones after "EXP" or
 * "BEST BEFORE". The production date ("ÜT", "ÜRT", "ÜRETİM", "PROD") is often
 * printed right beside it and must not be taken for it. Dates come as
 * 12.03.2027, 12/03/27, 12-03-2027 or just 03/2027 (end of that month).
 *
 * Works on the words OCR found, so it can be tested without the OCR models.
 */
import { findEan } from './barcode';
import { B, byX, groupRows, height, I, maxBy, Word, WORD_CHAR } from './words';

const EXPIRY = new RegExp(
  `S\\.?\\s?K\\.?\\s?T|T\\.?\\s?E\\.?\\s?T\\.?\\s?T|SON\\s*T[UÜ]K|TAV(S${I}YE)?\\.?\\s*ED` +
    `|T[ÜU]K(ET${I}M)?\\.?\\s*TAR|${B}EXP|BEST\\s*BEFORE|${B}B\\.?\\s?B${B}|USE\\s*BY`,
  'giu',
);
const PRODUCTION = new RegExp(
  `[ÜU]\\.?\\s?T${B}|[ÜU]RT|[ÜU]RET${I}M|PROD|MFG|${B}P\\.?\\s?D${B}|${I}MAL`,
  'giu',
);

// Between day, month and year: "." "/" "-" "," (OCR for "."), or just a space
// ("15 03 2027" is common in inkjet print).
const SEP = '(?:\\s?[./,\\-]\\s?|\\s)';
const FULL = new RegExp(`(?<!\\d)([0-3]?\\d)${SEP}([01]?\\d)${SEP}((?:20)?\\d{2})(?!\\d)`, 'g');
const MONTH = new RegExp(`(?<![\\d./,\\-])([01]?\\d)${SEP}(20\\d{2})(?!\\d)`, 'g');
const ISO = /(?<!\d)(20\d{2})-([01]\d)-([0-3]\d)(?!\d)/g;
// No separators at all: "150327", "15032027". Only trusted right after an
// expiry label, since lot numbers look the same.
const COMPACT = /(?<!\d)([0-3]\d)([01]\d)((?:20)?\d{2})(?!\d)/g;
// Month names, Turkish and English: "15 MAR 2027", "15.OCA.27", "MAR 2027".
const MONTHS: Record<string, number> = {
  OCA: 1, SUB: 2, ŞUB: 2, MAR: 3, NIS: 4, NİS: 4, MAY: 5, HAZ: 6, TEM: 7,
  AGU: 8, AĞU: 8, EYL: 9, EKI: 10, EKİ: 10, KAS: 11, ARA: 12,
  JAN: 1, FEB: 2, APR: 4, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const NAMES = Object.keys(MONTHS).map((name) => name.replace(/[Iİ]/g, I)).join('|');
const NAMED = new RegExp(
  `(?<!${WORD_CHAR})(?:([0-3]?\\d)\\s?[./\\-]?\\s?)?(${NAMES})[A-ZÇĞİÖŞÜa-zçğıöşü]*\\.?\\s?[./\\-]?\\s?((?:20)?\\d{2})(?!\\d)`,
  'giu',
);

type Kind = 'expiry' | 'production' | 'unknown';

interface FoundDate {
  /** "YYYY-MM-DD" */
  value: string;
  start: number;
  end: number;
  kind: Kind;
}

export interface LabelResult {
  expiresOn: string | null;
  barcode: string | null;
  dates: { date: string; kind: Kind }[];
  /** What was read, so the app can show it when no date is found. */
  text: string;
  error?: string;
}

const fullYear = (text: string) => (Number(text) < 100 ? Number(text) + 2000 : Number(text));
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** "YYYY-MM-DD", or undefined for a date that does not exist. */
function isoDate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const lastEnd = (text: string, pattern: RegExp) =>
  Math.max(-1, ...[...text.matchAll(pattern)].map((m) => m.index + m[0].length));

/**
 * What the label right before a date says it is: looking back at most ~25
 * characters, on the same line, and not past the date before it.
 */
function kindOf(text: string, start: number, previousEnd: number): Kind {
  const lineStart = text.slice(0, start).lastIndexOf('\n') + 1;
  const before = text.slice(Math.max(lineStart, previousEnd, start - 25), start);
  const expiry = lastEnd(before, EXPIRY);
  const production = lastEnd(before, PRODUCTION);
  if (expiry < 0 && production < 0) return 'unknown';
  return expiry >= production ? 'expiry' : 'production';
}

function findDates(text: string, today: Date): FoundDate[] {
  const found: FoundDate[] = [];
  const thisYear = today.getUTCFullYear();
  const add = (value: string | undefined, m: RegExpExecArray) => {
    if (!value) return;
    const year = Number(value.slice(0, 4));
    if (year < thisYear - 3 || year > thisYear + 10) return;
    if (found.some((f) => m.index >= f.start && m.index < f.end)) return;
    found.push({ value, start: m.index, end: m.index + m[0].length, kind: 'unknown' });
  };

  for (const m of text.matchAll(ISO)) add(isoDate(Number(m[1]), Number(m[2]), Number(m[3])), m);
  for (const m of text.matchAll(FULL)) add(isoDate(fullYear(m[3]), Number(m[2]), Number(m[1])), m);
  for (const m of text.matchAll(NAMED)) {
    const month = MONTHS[m[2].toUpperCase()];
    const year = fullYear(m[3]);
    add(isoDate(year, month, m[1] ? Number(m[1]) : daysIn(year, month)), m);
  }
  for (const m of text.matchAll(MONTH)) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (month >= 1 && month <= 12) add(isoDate(year, month, daysIn(year, month)), m);
  }
  for (const m of text.matchAll(COMPACT)) {
    if (kindOf(text, m.index, 0) === 'expiry') add(isoDate(fullYear(m[3]), Number(m[2]), Number(m[1])), m);
  }
  found.sort((a, b) => a.start - b.start);
  let previousEnd = 0;
  for (const f of found) {
    f.kind = kindOf(text, f.start, previousEnd);
    previousEnd = f.end;
  }
  return found;
}

/** The words in reading order: top to bottom, left to right on each line. */
function readingText(words: Word[]): string {
  if (words.length === 0) return '';
  const h = words.map(height).sort((a, b) => a - b)[words.length >> 1];
  return groupRows(words, h)
    .map((row) => row.sort(byX).map((w) => w.text).join(' '))
    .join('\n');
}

/**
 * The expiry date is the one labelled SKT/TETT/EXP; failing that, the latest
 * date that is not labelled as the production date.
 */
export function parseLabel(words: Word[], today = new Date()): LabelResult {
  const text = readingText(words);
  const dates = findDates(text, today);
  const labelled = dates.filter((d) => d.kind === 'expiry');
  const candidates = labelled.length > 0 ? labelled : dates.filter((d) => d.kind !== 'production');
  return {
    expiresOn: maxBy(candidates, (d) => Date.parse(d.value))?.value ?? null,
    barcode: findEan(text) ?? null,
    dates: dates.map((d) => ({ date: d.value, kind: d.kind })),
    text: text.split(/\s+/).filter(Boolean).join(' ').slice(0, 300),
  };
}
