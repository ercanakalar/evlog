import { correctName } from './lexicon';
import {
  cleanName, findQuantityLines, issuedAt, parsePrice, parseReceipt, priceCandidates, quantityCandidates, resolve,
  stripLeadingCodes,
} from './receipt-parser';
import { round, word } from './words';

const H = 30;
const w = (text: string, x: number, y: number, score = 0.95) =>
  word(x, x + 12 * text.length, y, y + H, text, score);

describe('numbers', () => {
  it('reads a leading digit as the lira sign when it can be', () => {
    expect(priceCandidates('t49,90')).toEqual([49.9]);
    expect(priceCandidates('1203,19')).toEqual([203.19, 1203.19]);
  });

  it('ignores a stray slash in a weight', () => {
    expect(quantityCandidates('1.0/32', 'kg')).toEqual([1.032]);
  });

  it('rounds the exact value, half to even', () => {
    expect(round(1.005, 2)).toBe(1);
    expect(round(0.125, 2)).toBe(0.12);
    expect(round(0.375, 2)).toBe(0.38);
    expect(round(2.5)).toBe(2);
  });

  it('recovers a misread quantity from an exact price', () => {
    // 0,968 KG x ₺59,90 = ₺57,98, read as "0.068" and "259,90" (₺ as 2).
    const line = { word: w('KG', 100, 0), unit: 'kg', quantities: [0.068] };
    const r = resolve(line, parsePrice(w('259,90', 200, 0)), parsePrice(w('₺57,98', 400, 0)));
    expect(r).toMatchObject({ quantity: 0.968, unitPrice: 59.9, total: 57.98, verified: true });
  });

  it("does not take a barcode beside a name's GR row for a quantity", () => {
    expect(findQuantityLines([w('8662250613807', 60, 100), w('GR', 240, 100)], H)).toEqual([]);
  });
});

describe('names', () => {
  it('drops header words but keeps the name on their row', () => {
    const rows = [
      [w('ETIN:', 0, 0)],
      [w('KART NO: 990', 0, 30)],
      [w('SNNILr Birhn', 0, 60), w('MARKET POSETI (75AD/KG)', 200, 66)],
    ];
    expect(cleanName(rows)).toBe('MARKET POSETI (75AD/KG)');
  });

  it('knows header words with Turkish letters', () => {
    expect(cleanName([[w('KDVİ', 0, 0), w('BİRİM FİYAT', 60, 0)], [w('SUT 1 LT', 0, 40)]])).toBe('SUT 1 LT');
  });

  it('drops barcodes with misread digits', () => {
    expect(stripLeadingCodes('DOV1707O0HSB7 SOLEN GRETA KOZ BIBERLI')).toBe('SOLEN GRETA KOZ BIBERLI');
    expect(stripLeadingCodes('5089 SUTAS PEYN.500GR SUZME')).toBe('SUTAS PEYN.500GR SUZME');
    expect(stripLeadingCodes('MASTER POTATO 160 GR')).toBe('MASTER POTATO 160 GR');
  });

  it.each([
    ['MANDALIHA (KG)', 'MANDALINA (KG)'],
    ['MUZITHAL(KG)', 'MUZ ITHAL(KG)'],
    ['DANOHE HEYVELIYOGURT CILEKLI 400GR', 'DANONE MEYVELI YOGURT CILEKLI 400GR'],
    ['SUTAS PE7H.500GR SUZME', 'SUTAS PEYN.500GR SUZME'],
    ['SOLEU GRETA 15OGR PORTAKALLI KRAKER', 'SOLEN GRETA 150GR PORTAKALLI KRAKER'],
  ])('corrects %s', (read, meant) => {
    expect(correctName(read)).toBe(meant);
  });

  it.each([
    'MARKET POSETI (75AD/KG)', 'KUZU KULAGI (ADET)', 'ORHAN REIS FILE SARIMSAK 250 GR', 'SOLEN GRETA KOZ BIBERLI',
    'ICIM KEFIR 1000 ML', 'ABANT SU 5 LT*2LI (1PL:80)',
  ])('leaves %s alone', (name) => {
    expect(correctName(name)).toBe(name);
  });
});

describe('dates', () => {
  it('reads a dot taken for a one', () => {
    expect(issuedAt([w('081112026', 0, 0), w('17:31', 200, 0)])).toBe('2026-11-08T17:31:00+03:00');
  });

  it('skips a date that does not exist', () => {
    expect(issuedAt([w('31.02.2026', 0, 0), w('08.11.2026', 200, 0)])).toBe('2026-11-08');
  });
});

describe('a whole receipt', () => {
  it('adds up two lines', () => {
    const result = parseReceipt([
      w('CITY GROSS', 100, 0),
      w('1 2901241', 0, 100), w('MUZITHAL(KG)', 200, 100),
      w('0,822', 0, 140), w('KG', 80, 140), w('₺119,90', 200, 140), w('1', 330, 140), w('₺0,00', 380, 140), w('₺98,56', 500, 140),
      w('2 2901235', 0, 200), w('DOMATES SALKIM (KG)', 200, 200),
      w('1.0/32', 0, 240), w('KG', 80, 240), w('₺79,90', 200, 240), w('1', 330, 240), w('₺0,00', 380, 240), w('₺82,46', 500, 240),
      w('TOPLAM', 0, 320), w('₺181,02', 500, 320),
    ]);
    expect(result.items.map((i) => [i.name, i.quantity, i.totalPrice])).toEqual([
      ['MUZ ITHAL(KG)', 0.822, 98.56],
      ['DOMATES SALKIM (KG)', 1.032, 82.46],
    ]);
    expect(result).toMatchObject({ merchantName: 'CITY GROSS', total: 181.02, confidence: 1 });
  });

  it('falls back to one item per price line', () => {
    const result = parseReceipt([
      w('MARKET', 0, 0), w('SUT 1LT', 0, 200), w('*42,75', 400, 200), w('EKMEK', 0, 240), w('*15,00', 400, 240),
      w('TOPLAM', 0, 320), w('*57,75', 400, 320),
    ]);
    expect(result.items.map((i) => [i.name, i.totalPrice])).toEqual([['SUT 1LT', 42.75], ['EKMEK', 15]]);
    expect(result.total).toBe(57.75);
  });

  it('says so when there is nothing to read', () => {
    expect(parseReceipt([])).toEqual({ error: 'No text found in the photo', items: [] });
    expect(parseReceipt([w('HELLO', 0, 0)]).error).toMatch(/Could not find any items/);
  });
});
