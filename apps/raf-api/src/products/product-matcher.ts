import type { Category, Storage } from '../generated/prisma/enums';
import { normalizeProductName } from '../common/utils/normalize';

export interface ShelfLifeEntry {
  keyword: string;
  displayName: string;
  category: Category;
  storage: Storage;
  shelfLifeDays: number | null;
  openedShelfLifeDays: number | null;
}

export interface ProductMatch {
  /** Clean name with the pack size, e.g. "Whole milk 1 L". */
  name: string;
  category: Category;
  storage: Storage | null;
  shelfLifeDays: number | null;
  openedShelfLifeDays: number | null;
  /** True when no reference entry matched; the user should check the line. */
  needsReview: boolean;
}

/** Keywords shorter than this must match a whole word ("su", "un", "bal"). */
const MIN_PREFIX_KEYWORD = 4;

const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|ml|cl|adet|li|lu)\b/i;
const UNIT_LABEL: Record<string, string> = {
  kg: 'kg', gr: 'g', g: 'g', lt: 'L', l: 'L', ml: 'ml', cl: 'cl',
  adet: 'pack', li: 'pack', lu: 'pack',
};

/** "TAM YAGLI SUT 1L" -> "1 L"; "YUMURTA 15LI" -> "15 pack". */
export const packSize = (raw: string): string | null => {
  const match = SIZE_RE.exec(raw);
  if (!match) return null;
  const unit = UNIT_LABEL[match[2].toLowerCase()];
  const amount = match[1].replace(',', '.');
  return unit === 'pack' ? `${amount} pack` : `${amount} ${unit}`;
};

/** Pack size as a number and unit: "AYRAN 1000ML" -> 1000 ml; "YUMURTA 15LI" -> 15 pack. */
export const packOf = (raw: string): { amount: number; unit: string } | null => {
  const match = SIZE_RE.exec(raw);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  return amount > 0 ? { amount, unit: UNIT_LABEL[match[2].toLowerCase()] } : null;
};

export interface BrandEntry {
  id: string;
  name: string;
  /** Normalised spellings, matched as whole words. */
  keywords: string[];
}

/**
 * The brand printed in a receipt line, if it is a known one. Punctuation
 * separates words ("SUTAS.AYRAN"), and the longest spelling found wins, so
 * "pinar su" (water) beats "pinar" (dairy).
 */
export const findBrand = <B extends BrandEntry>(rawName: string, brands: readonly B[]): B | null => {
  const haystack = ` ${normalizeProductName(rawName).replace(/[.,%]/g, ' ')} `;
  let best: { brand: B; length: number } | null = null;
  for (const brand of brands) {
    for (const keyword of brand.keywords) {
      if (haystack.includes(` ${keyword} `) && (!best || keyword.length > best.length)) {
        best = { brand, length: keyword.length };
      }
    }
  }
  return best?.brand ?? null;
};

/** Weight printed in a product name, in kg: "MAKARNA 500G" -> 0.5, "PIRINC 1KG" -> 1. */
export const weightKg = (raw: string): number | null => {
  const match = /(\d+(?:[.,]\d+)?)\s*(kg|gr|g)\b/i.exec(raw);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  return match[2].toLowerCase() === 'kg' ? amount : amount / 1000;
};

/**
 * Turkish "-li / -lı / -lu / -lü" makes a flavour adjective: "CILEKLI" is
 * strawberry-flavoured (yogurt), "PORTAKALLI" orange-flavoured (crackers).
 * After normalising, what is left of the word is just "li" or "lu".
 */
const FLAVOUR_SUFFIX = /^l[iu](?![a-z])/;

const keywordMatches = (name: string, keyword: string): boolean => {
  const haystack = ` ${name} `;
  if (keyword.length < MIN_PREFIX_KEYWORD) return haystack.includes(` ${keyword} `);
  // Every place a word starts with the keyword; it counts unless the rest of
  // that word only makes it a flavour.
  for (let at = haystack.indexOf(` ${keyword}`); at !== -1; at = haystack.indexOf(` ${keyword}`, at + 1)) {
    const rest = haystack.slice(at + 1 + keyword.length).split(' ')[0] ?? '';
    if (!FLAVOUR_SUFFIX.test(rest)) return true;
  }
  return false;
};

const titleCase = (text: string): string =>
  text
    .toLocaleLowerCase('tr-TR')
    .replace(/(^|\s)(\S)/g, (_m, space: string, ch: string) => space + ch.toLocaleUpperCase('tr-TR'));

/**
 * Finds the reference entry for a receipt line. The longest matching keyword
 * wins, so "suzme yogurt" beats "yogurt" and "portakal suyu" beats "portakal".
 */
export function matchProduct(
  rawName: string,
  catalog: readonly ShelfLifeEntry[],
  quantity?: number,
  unit?: string | null,
): ProductMatch {
  const normalized = normalizeProductName(rawName);
  let best: ShelfLifeEntry | undefined;
  for (const entry of catalog) {
    if (!keywordMatches(normalized, entry.keyword)) continue;
    if (!best || entry.keyword.length > best.keyword.length) best = entry;
  }

  let size = packSize(rawName);
  // Loose produce: "MUZ KG" with quantity 1.12 -> "1.12 kg". A count of
  // pieces is not part of the name (the receipt line shows "× 6" already).
  if (!size && unit && unit !== 'pcs' && quantity && quantity !== 1) size = `${quantity} ${unit}`;

  if (!best) {
    return {
      name: titleCase(rawName.trim()),
      category: 'OTHER',
      storage: null,
      shelfLifeDays: null,
      openedShelfLifeDays: null,
      needsReview: true,
    };
  }
  return {
    name: size ? `${best.displayName} ${size}` : best.displayName,
    category: best.category,
    storage: best.storage,
    shelfLifeDays: best.shelfLifeDays,
    openedShelfLifeDays: best.openedShelfLifeDays,
    needsReview: false,
  };
}

/** What may follow a home item's word inside a receipt word: a plural, or a size ("1l", ".500gr"). */
const WORD_TAIL = /^(s|es|ler|lar)?([^a-z].*)?$/;

/**
 * Whether a product the user keeps at home ("Whole milk", "Süt") is the
 * same as a purchased line ("Whole milk 1 L" / "TAM YAGLI SUT 1L"). Each word
 * of the home item must be a word of the purchase, or that word plus a
 * plural or a size: "Egg" finds "Eggs", but "Süt" does not find the brand
 * "SUTAS", and "Soğan" does not find onion-flavoured crisps ("SOGAN.EKST").
 */
export const namesMatch = (homeItem: string, purchase: string): boolean => {
  const words = normalizeProductName(homeItem).split(' ').filter(Boolean);
  if (words.length === 0) return false;
  const tokens = normalizeProductName(purchase).split(' ');
  return words.every((word) =>
    tokens.some((token) => {
      if (!token.startsWith(word)) return false;
      const tail = token.slice(word.length);
      // "sogan.ekst" is a word with an abbreviation after it, not a size.
      return WORD_TAIL.test(tail) && !/^\.[a-z]/.test(tail) && !FLAVOUR_SUFFIX.test(tail);
    }),
  );
};
