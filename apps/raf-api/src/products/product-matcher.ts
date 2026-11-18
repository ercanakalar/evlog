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

const keywordMatches = (name: string, keyword: string): boolean => {
  const haystack = ` ${name} `;
  if (keyword.length < MIN_PREFIX_KEYWORD) return haystack.includes(` ${keyword} `);
  return haystack.includes(` ${keyword}`);
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
  // Loose produce: "MUZ KG" with quantity 1.12 -> "1.12 kg".
  if (!size && unit && quantity && quantity !== 1) size = `${quantity} ${unit}`;

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

/**
 * Whether a product the user keeps at home ("Whole milk") is the same as a
 * purchased line ("whole milk 1 l" / "tam yagli sut 1l"): every word of the
 * home item must start a word of the purchase.
 */
export const namesMatch = (homeItem: string, purchase: string): boolean => {
  const words = normalizeProductName(homeItem).split(' ').filter(Boolean);
  if (words.length === 0) return false;
  const target = ` ${normalizeProductName(purchase)} `;
  return words.every((word) => target.includes(` ${word}`));
};
