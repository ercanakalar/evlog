/**
 * Turns OCR words (text + position) from a Turkish receipt into structured data.
 *
 * No OCR dependency, so it can be tested on saved OCR output.
 *
 * Layout handled (e-Arşiv / market receipts):
 *
 *     1 2901221           PORTAKAL FILE (KG)
 *       4,072 KG  ₺49,90   1   ₺0,00   ₺203,19
 *       qty unit  unit pr. VAT discount line total
 *
 * Each item ends with a quantity line (`... KG` / `... ADET`); its name is on
 * the lines above it. Photos of curled paper are tilted, so words are matched by
 * position rather than by OCR line order. The lira sign is often misread as a
 * digit (`₺203,19` -> `1203,19`), so prices get candidates that are checked with
 * quantity x unit price = line total, and finally against the grand total.
 *
 * Receipts without quantity lines (`SÜT 1LT  %08  *42,75`) fall back to one
 * item per line that ends in a price.
 */
import { findEan } from './barcode';
import { correctName } from './lexicon';
import {
  B, byX, byY, byYThenX, digitCount, groupRows, hasLetters, height, I, maxBy, median, midY, minBy, round,
  word, Word,
} from './words';

// ───────── Numbers ─────────

/** Characters OCR produces for the lira sign, plus the `*` price marker. */
const CURRENCY_MARKS = '₺tTLl€£$*';
const PRICE_END = /(\d[\d.,' ]*)[.,](\d{2})$/;
const MAX_PRICE = 10_000_000;

interface Price {
  word: Word;
  /** Most likely first. */
  candidates: number[];
}

const unique = (values: number[]) => [...new Set(values)];

/** 't49,90' -> [49.9]; '1203,19' -> [203.19, 1203.19] (₺ read as 1). */
export function priceCandidates(text: string): number[] {
  let s = text.replace(/[Oo]/g, '0').replace(/^[ :]+|[ :]+$/g, '');
  const explicit = s !== '' && CURRENCY_MARKS.includes(s[0]);
  while (s !== '' && CURRENCY_MARKS.includes(s[0])) s = s.slice(1);
  const match = PRICE_END.exec(s);
  if (!match || match.index > 1) return [];
  const digits = match[1].replace(/\D/g, '');
  const cents = Number(match[2]) / 100;
  const full = Number(digits) + cents;
  let values = [full];
  if (!explicit && digits.length >= 2) {
    // A leading 1 / 6 / 4 / 0 is often the misread ₺ sign.
    const stripped = Number(digits.slice(1)) + cents;
    values = '1640'.includes(digits[0]) ? [stripped, full] : [full, stripped];
  }
  return unique(values).filter((v) => v <= MAX_PRICE).map((v) => round(v, 2));
}

export function parsePrice(w: Word): Price | undefined {
  const candidates = priceCandidates(w.text);
  return candidates.length > 0 ? { word: w, candidates } : undefined;
}

const pricesIn = (words: Word[]) => words.map(parsePrice).filter((p) => p !== undefined);

const QTY_UNIT = /^([\dGOoBl.,/']*)\s*(KG|KGM|ADET|AD|LT|GR|PK|PKT)\.?$/i;
const UNIT_NAMES: Record<string, string> = {
  KG: 'kg', KGM: 'kg', ADET: 'pcs', AD: 'pcs', LT: 'L', GR: 'g', PK: 'pcs', PKT: 'pcs',
};

/** '4,072' -> [4.072]; 'G.822' -> [0.822, 1.822, ...] (first digit unreadable). */
export function quantityCandidates(text: string, unit: string): number[] {
  // OCR sometimes adds a slash or apostrophe inside a number: "1.0/32" is 1,032.
  let s = text.replace(/[Oo]/g, '0').replace(/[/']/g, '').replace(/\.+$/, '');
  if (!s) return [];
  if (unit === 'pcs') return /^\d+$/.test(s) && Number(s) > 0 && Number(s) < 1000 ? [Number(s)] : [];
  s = s.replaceAll(',', '.');
  if (/^\d+(\.\d+)?$/.test(s)) return [Number(s)];
  if (/^[^\d.]\.\d+$/.test(s)) {
    // Unreadable whole-number digit.
    return Array.from({ length: 10 }, (_, d) => Number(`${d}${s.slice(1)}`));
  }
  return [];
}

// ───────── Items ─────────

interface Item {
  name: string;
  total: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  /** quantity x unit price matched the line total */
  verified: boolean;
  /** other readings of total */
  alternatives: number[];
  /** printed beside the name, check digit verified */
  barcode?: string;
}

export interface QuantityLine {
  /** the token with the unit (or the qty+unit token) */
  word: Word;
  unit: string;
  quantities: number[];
}

export function findQuantityLines(words: Word[], h: number): QuantityLine[] {
  const lines: QuantityLine[] = [];
  for (const w of words) {
    const match = QTY_UNIT.exec(w.text.length < 14 ? w.text.replaceAll(' ', '') : '');
    if (!match) continue;
    const unit = UNIT_NAMES[match[2].toUpperCase()];
    let qtyText = match[1];
    if (!qtyText) {
      // Quantity is a separate word just left of the unit.
      const left = words.filter(
        (o) => o.x1 <= w.x0 + 2 && Math.abs(midY(o) - midY(w)) < 0.7 * h && w.x0 - o.x1 < 3 * h &&
          /^[\dGO.,/']+\.?$/.test(o.text),
      );
      qtyText = maxBy(left, (o) => o.x1)?.text ?? '';
    }
    // A bare 'GR' / 'LT' is part of a product name ('250 GR').
    if (!qtyText && unit !== 'pcs' && unit !== 'kg') continue;
    // A barcode next to a name's 'GR' row is not a quantity.
    if (digitCount(qtyText) > 6) continue;
    lines.push({ word: w, unit, quantities: quantityCandidates(qtyText, unit) });
  }
  return lines.sort((a, b) => byY(a.word, b.word));
}

const looksLikePrice = (text: string) => /[\dOo][.,]\d{2}$/.test(text.trim());

const CODE = /[\dBO]{7,14}/;

/**
 * Receipt header text that sits right above the first item: the e-invoice
 * number (ETTN), the loyalty card line and the column headings
 * ("S.N Miktar Birim Fiyat KDV İnd. Kdvli Tutar"), often garbled by OCR.
 */
const HEADER = new RegExp(
  `${B}E\\s?[T1Iiİı]{1,2}\\s?N${B}|${B}[IiİıK]?KART\\s*N[O0]|${B}M${I}ktar|${B}B${I}r${I}m` +
    `|${B}B${I}r[hn]n${B}|${B}F${I}yat|${B}Tutar|${B}Kdvl?[Iiİı1T]?${B}`,
  'iu',
);

/**
 * Keeps only the words below the last receipt-header word. The first item's
 * name can share a printed row with the column headings, so words are
 * compared one by one, not whole rows.
 */
function dropHeaderRows(rows: Word[][]): Word[][] {
  const header = rows.flat().filter((w) => HEADER.test(w.text));
  if (header.length === 0) return rows;
  const cut = Math.max(...header.map(midY));
  return rows
    .map((row) => row.filter((w) => midY(w) > cut && !HEADER.test(w.text)))
    .filter((row) => row.length > 0);
}

/**
 * Drops what is left of the item number and barcode at the start of a name
 * when OCR misread some digits ("DOV170Z008SB7 SOLEU…", "5089 SUTAS…").
 */
export function stripLeadingCodes(name: string): string {
  const tokens = name.split(' ');
  while (tokens.length > 1) {
    const t = tokens[0];
    const digits = digitCount(t);
    const digitLike = t.match(/[\dOQDBSZGIL]/g)?.length ?? 0;
    const isCode =
      t.length === 1 ||
      (t.length >= 4 && digits * 2 >= t.length) ||
      /^\d{1,3}$/.test(t) ||
      (t.length >= 8 && digits >= 3 && digitLike * 4 >= t.length * 3);
    if (!isCode) break;
    tokens.shift();
  }
  return tokens.join(' ');
}

/** Index and a stray character before a name. */
const LEADING_INDEX = new RegExp(`^[^\\p{L}\\p{N}_]*(\\d{1,3}\\s+)?([A-Z0-9]\\s+)?`, 'u');

const rowY = (row: Word[]) => median(row.map(midY));

/** Joins name rows; drops the item index and barcode and anything above it. */
export function cleanName(nameRows: Word[][]): string {
  let rows = dropHeaderRows(nameRows);
  const codeRow = rows.find((row) => row.some((w) => CODE.test(w.text)));
  if (codeRow) {
    const codeY = rowY(codeRow);
    const h = median(codeRow.map(height));
    const codeWord = codeRow.find((w) => CODE.test(w.text))!;
    const match = CODE.exec(codeWord.text)!;
    // Where the name starts in the barcode row (the barcode can share a word with it).
    const nameX = codeWord.x0 +
      ((codeWord.x1 - codeWord.x0) * (match.index + match[0].length)) / codeWord.text.length;
    rows = rows
      .filter((row) => rowY(row) >= codeY - 0.8 * h)
      .map((row) => (rowY(row) >= codeY - 0.3 * h ? row : row.filter((w) => w.x0 >= nameX - h)))
      .filter((row) => row.length > 0);
  }
  const parts = rows.map((row) => {
    const text = [...row].sort(byX).map((w) => w.text).join(' ');
    const match = CODE.exec(text);
    return match ? text.slice(match.index + match[0].length) : text;
  });
  const name = parts.join(' ').trim().replace(LEADING_INDEX, '');
  return correctName(stripLeadingCodes(name.replace(/\s+/g, ' ').replace(/^[ .\-:]+|[ .\-:]+$/g, '')));
}

/** The quantity that makes quantity x unit price = total to the kuruş, if there is one. */
function exactQuantity(total: number, unitPrice: number, unit: string): number | undefined {
  if (unitPrice <= 0) return undefined;
  const q = unit === 'pcs' ? round(total / unitPrice) : round(total / unitPrice, 3);
  const sensible = unit === 'pcs' ? q >= 1 && q <= 999 : q > 0 && q < 1000;
  return sensible && Math.abs(round(q * unitPrice, 2) - total) <= 0.01 ? q : undefined;
}

/** How many digits two numbers share in place ("0.968" vs "0.068" -> 4). */
function similarity(a: number, b: number): number {
  const x = a.toFixed(3).padStart(9);
  const y = b.toFixed(3).padStart(9);
  let same = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) same++;
  return same;
}

export interface Resolved {
  quantity?: number;
  unitPrice?: number;
  total?: number;
  verified: boolean;
  /** Other plausible line totals for the grand-total check to fall back on. */
  alternatives: number[];
}

/**
 * Picks the quantity, unit price and line total readings that agree
 * (quantity x unit price = total). Returns them and whether they agreed.
 */
export function resolve(line: QuantityLine, unitPrice?: Price, total?: Price): Resolved {
  const knownQty = line.quantities.length === 1 ? line.quantities[0] : undefined;
  const quantities =
    line.quantities.length > 0
      ? line.quantities
      : line.unit === 'pcs'
        ? Array.from({ length: 20 }, (_, i) => i + 1)
        : [];
  const units = unitPrice?.candidates.filter((c) => c > 0) ?? [];
  const totals = total?.candidates.filter((c) => c > 0) ?? [];
  for (const t of totals) {
    // Most likely reading first.
    for (const q of quantities) {
      for (const u of units) {
        if (Math.abs(round(q * u, 2) - t) <= 0.02 + 0.002 * t) {
          return { quantity: q, unitPrice: u, total: t, verified: true, alternatives: [] };
        }
      }
    }
  }
  // Quantity misread too (0,968 -> "0.068"): a unit price reading that
  // divides the total exactly gives the quantity; closest to what was read wins.
  if (totals.length > 0 && line.quantities.length > 0) {
    const exact = units.flatMap((u) => {
      const q = exactQuantity(totals[0], u, line.unit);
      return q === undefined ? [] : [{ like: similarity(q, line.quantities[0]), q, u }];
    });
    if (exact.length > 0) {
      const [best] = exact.sort((a, b) => b.like - a.like || b.q - a.q || b.u - a.u);
      return { quantity: best.q, unitPrice: best.u, total: totals[0], verified: true, alternatives: [] };
    }
  }
  let u: number | undefined = units[0];
  const computed = knownQty !== undefined && u ? round(knownQty * u, 2) : undefined;
  if (total && totals.length > 0 && computed && unitPrice!.word.score > total.word.score + 0.05) {
    // They disagree and OCR was surer of the unit price than of the total.
    return { quantity: knownQty, unitPrice: u, total: computed, verified: false, alternatives: totals };
  }
  if (totals.length > 0) {
    const t = totals[0];
    let q = knownQty;
    // The three disagree, so one of quantity / unit price was misread.
    // Shelf prices end in a round 10 kuruş (39,90); weighed amounts don't.
    const fixedU = q ? round(t / q, 2) : undefined;
    if (fixedU && q && round(fixedU * 100) % 10 === 0 && Math.abs(round(fixedU * q, 2) - t) <= 0.02) {
      u = fixedU;
    } else if (u) {
      // quantity = total / unit price, when that is a sensible number
      const derived = t / u;
      if (line.unit !== 'pcs') q = round(derived, 3);
      else if (Math.abs(derived - round(derived)) < 0.01 && round(derived) >= 1) q = round(derived);
    } else if (q) {
      u = round(t / q, 2);
    }
    // Count and unit price unreadable: one piece is by far the most common.
    if (q === undefined && line.unit === 'pcs' && u === undefined) q = 1;
    return {
      quantity: q,
      unitPrice: u,
      total: t,
      verified: false,
      alternatives: [...(computed ? [computed] : []), ...totals.slice(1)],
    };
  }
  // Line total unreadable.
  return { quantity: knownQty, unitPrice: u, total: computed, verified: false, alternatives: [] };
}

function itemsFromQuantityLines(words: Word[], allLines: QuantityLine[], h: number, endY: number): Item[] {
  const items: Item[] = [];
  const prices = pricesIn(words);
  const lines = allLines.filter((line) => midY(line.word) < endY);

  // Prices on the same physical line, allowing for tilt (right side up to ~1.5 lines higher).
  const onLine = lines.map((line) => {
    const y = midY(line.word);
    return prices
      .filter((p) => p.word.x0 > line.word.x1 - 2 && midY(p.word) >= y - 1.5 * h && midY(p.word) <= y + 0.6 * h)
      .sort((a, b) => byX(a.word, b.word));
  });

  // The line total is the right-aligned last column. Its x drifts on curled
  // paper, so each line compares against its neighbours' right edges.
  const rightEdges = onLine.map((found) => (found.length > 0 ? Math.max(...found.map((p) => p.word.x1)) : undefined));

  let previousY: number | undefined;
  lines.forEach((line, i) => {
    const y = midY(line.word);
    const found = onLine[i];
    const nearby = rightEdges.slice(Math.max(0, i - 2), i + 3).filter((x) => x !== undefined);
    const column = nearby.length > 0 ? median(nearby) : undefined;
    const inColumn = found.filter((p) => column !== undefined && p.word.x1 >= column - 1.2 * h);
    const total = maxBy(inColumn, (p) => p.word.x1);
    // First price after the quantity; a ₺0,00 discount (read as 10,00) is never a unit price.
    const unitPrice = found.find(
      (p) => !inColumn.includes(p) && !p.candidates.includes(0) && p.candidates.some((c) => c > 0),
    );

    const top = Math.max(previousY === undefined ? -1e9 : previousY + 0.2 * h, y - 4.5 * h);
    const rightEdge = total ? total.word.x0 : Infinity;
    const above = words.filter((w) => midY(w) >= top && midY(w) < y - 0.5 * h && w.x0 < rightEdge - h);
    const nameWords = above.filter(
      (w) => hasLetters(w.text) && !looksLikePrice(w.text) && !QTY_UNIT.test(w.text),
    );
    const name = cleanName(groupRows(nameWords, h));
    const barcode = findEan([...above].sort(byYThenX).map((w) => w.text).join(' '));
    previousY = y;

    const r = resolve(line, unitPrice, total);
    if (r.total === undefined || r.total <= 0) return;
    items.push({
      name: name || '?',
      total: r.total,
      quantity: r.quantity,
      unit: line.unit,
      unitPrice: r.unitPrice,
      verified: r.verified,
      alternatives: unique(r.alternatives).filter((a) => a && a !== r.total),
      barcode,
    });
  });
  return items;
}

/** Fallback: one item per line whose rightmost word is a price. */
function itemsFromPriceLines(words: Word[], h: number, startY: number, endY: number): Item[] {
  const items: Item[] = [];
  for (const row of groupRows(words.filter((w) => midY(w) > startY && midY(w) < endY), h)) {
    row.sort(byX);
    const price = parsePrice(row.at(-1)!);
    const name = row.slice(0, -1).filter((w) => hasLetters(w.text)).map((w) => w.text).join(' ');
    if (!price || !name) continue;
    items.push({
      name: cleanName([[word(0, 0, 0, 0, name)]]) || name,
      total: price.candidates[0],
      verified: false,
      alternatives: price.candidates.slice(1),
    });
  }
  return items;
}

// ───────── Header and totals ─────────

const TOTALS = new RegExp(`${B}(TOPLAM|TOPKDV|KDV|MATRAH|TUTAR|ARA ?TOPLAM)${B}`, 'iu');
const GRAND_TOTAL_LABELS = ['GENEL\\s*TOPLAM', `${B}TOPLAM${B}`, `${B}TUTAR${B}`, 'ÖDENECEK'].map(
  (label) => new RegExp(label, 'iu'),
);
const NOT_MERCHANT = new RegExp(
  `FATURA|ARŞ${I}V|ARS${I}V|F${I}Ş|F${I}S|TAR${I}H|SAAT|NO${B}|SAY${I}N|VERG${I}|MERS${I}S`,
  'iu',
);

function grandTotal(words: Word[], h: number, belowY: number): number | undefined {
  const candidates = words.filter((w) => midY(w) > belowY);
  for (const label of GRAND_TOTAL_LABELS) {
    for (const w of [...candidates].sort(byY)) {
      if (!label.test(w.text)) continue;
      const inline = priceCandidates(w.text.split(label).at(-1)!.trim());
      if (inline.length > 0) return inline[0];
      const right = pricesIn(candidates).filter(
        (p) => p.word.x0 > w.x1 - 2 && midY(p.word) >= midY(w) - 1.5 * h && midY(p.word) <= midY(w) + 0.8 * h,
      );
      const nearest = minBy(right, (p) => Math.abs(midY(p.word) - midY(w)));
      if (nearest) return nearest.candidates[0];
    }
  }
  return undefined;
}

export function issuedAt(words: Word[]): string | undefined {
  const text = [...words].sort(byYThenX).map((w) => w.text).join(' ');
  // A separator dot is often read as "1" or ",": "08.11.2026" -> "081112026".
  for (const m of text.matchAll(/(?<!\d)(\d{2})[./,-]?(\d{2})[./,1-]?(20\d{2})(?!\d)/g)) {
    const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > lastDay) continue;
    const date = `${m[3]}-${m[2]}-${m[1]}`;
    const end = m.index + m[0].length;
    const time = /(?<!\d)([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/.exec(text.slice(end, end + 40));
    return time ? `${date}T${time[1]}:${time[2]}:${time[3] ?? '00'}+03:00` : date;
  }
  return undefined;
}

/**
 * The receipt's number as the till prints it ("FİŞ NO: 0045", often read as
 * "FIS NO:45" or "F1Ş N0 0045"), without leading zeros. With the date and
 * total it tells two photos of one receipt apart from two purchases.
 */
export function receiptNo(words: Word[]): string | undefined {
  const text = [...words].sort(byYThenX).map((w) => w.text).join(' ');
  const m = /(?<![\p{L}])F\s?[İIiı1lL]\s?[ŞSşs$5]\s*N\s?[O0o]\s*[:.]?\s*(\d{1,8})(?!\d)/u.exec(text);
  if (!m) return undefined;
  return m[1].replace(/^0+(?=\d)/, '');
}

function merchant(words: Word[]): string | undefined {
  return [...words]
    .sort(byY)
    .slice(0, 15)
    .find((w) => w.score >= 0.8 && hasLetters(w.text, 4) && !/\d/.test(w.text) && !NOT_MERCHANT.test(w.text))
    ?.text.trim();
}

// ───────── Putting it together ─────────

/** If the items don't add up, tries other readings of unverified line totals. */
function fixWithTotal(items: Item[], total: number | undefined): boolean {
  if (total === undefined) return false;
  const diff = round(items.reduce((sum, i) => sum + i.total, 0) - total, 2);
  if (Math.abs(diff) <= 0.02) return true;
  for (const item of items) {
    for (const alt of item.alternatives) {
      if (Math.abs(round(diff - item.total + alt, 2)) <= 0.02) {
        item.total = alt;
        if (item.quantity) item.unitPrice = round(alt / item.quantity, 2);
        return true;
      }
    }
  }
  return false;
}

export interface ReceiptItemResult {
  name: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice: number;
  barcode?: string;
}

export interface ReceiptResult {
  merchantName?: string;
  issuedAt?: string;
  receiptNo?: string;
  currency?: string;
  total?: number;
  items: ReceiptItemResult[];
  confidence?: number;
  error?: string;
}

/** The fields that have a value (JSON and the validators leave the rest out). */
const defined = <T extends object>(fields: T): T =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as T;

/** What was read, or {error, items: []}. */
export function parseReceipt(found: Word[]): ReceiptResult {
  const words = found.filter((w) => w.text);
  if (words.length === 0) return { error: 'No text found in the photo', items: [] };
  const h = median(words.map(height));
  const topY = Math.min(...words.map(midY));

  const lines = findQuantityLines(words, h);
  const firstY = lines.length > 0 ? midY(lines[0].word) : topY;
  const endY = Math.min(Infinity, ...words.filter((w) => midY(w) > firstY && TOTALS.test(w.text)).map(midY));

  let items = lines.length > 0 ? itemsFromQuantityLines(words, lines, h, endY) : [];
  if (items.length === 0) items = itemsFromPriceLines(words, h, topY + 5 * h, endY);
  if (items.length === 0) {
    return { error: 'Could not find any items. Take a closer, straight photo of the receipt.', items: [] };
  }

  const total = grandTotal(words, h, firstY);
  const addsUp = fixWithTotal(items, total);
  const verified = items.filter((i) => i.verified).length / items.length;
  const confidence = lines.length > 0 ? verified * (addsUp ? 1 : 0.7) : addsUp ? 0.6 : 0.3;

  return defined({
    merchantName: merchant(words),
    issuedAt: issuedAt(words),
    receiptNo: receiptNo(words),
    currency: 'TRY',
    total,
    items: items.slice(0, 300).map((i) =>
      defined({
        name: i.name.slice(0, 200),
        quantity: i.quantity ? round(i.quantity, 3) : undefined,
        unit: i.unit,
        unitPrice: i.unitPrice,
        totalPrice: i.total,
        barcode: i.barcode,
      }),
    ),
    confidence: round(confidence, 2),
  });
}
