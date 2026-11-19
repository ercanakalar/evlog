/**
 * Same rules as the API (products/product-matcher.ts): a product kept at
 * home matches a purchase when every word of it starts a word of the purchase.
 */
export const normalizeName = (name: string) =>
  name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.,% ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const weightKg = (text: string) => {
  const match = /(\d+(?:[.,]\d+)?)\s*(kg|gr|g)\b/i.exec(text);
  if (!match?.[1] || !match[2]) return null;
  const amount = Number(match[1].replace(',', '.'));
  return match[2].toLowerCase() === 'kg' ? amount : amount / 1000;
};

/** What one receipt line adds to an at-home item (same rules as the API's amountBought). */
export const amountBought = (
  line: { name: string; rawName: string; quantity: string; unit: string | null },
  unit: 'PIECE' | 'KG',
) => {
  const quantity = Number(line.quantity);
  const weighed = line.unit?.toLowerCase() === 'kg';
  if (unit === 'KG') {
    if (weighed) return Math.round(quantity * 1000) / 1000;
    const perPack = weightKg(line.rawName) ?? weightKg(line.name);
    return perPack ? Math.round(perPack * Math.max(1, Math.round(quantity)) * 1000) / 1000 : 0;
  }
  return weighed || (line.unit && line.unit !== 'pcs') ? 1 : Math.max(1, Math.round(quantity));
};

/** Plural or size after the word ("eggs", "sut1l"); see WORD_TAIL in the API. */
const WORD_TAIL = /^(s|es|ler|lar)?([^a-z].*)?$/;
/** Turkish flavour suffix: "cilekli" is strawberry-flavoured, not strawberries. */
const FLAVOUR_SUFFIX = /^l[iu](?![a-z])/;

export const namesMatch = (homeItem: string, purchase: string) => {
  const words = normalizeName(homeItem).split(' ').filter(Boolean);
  if (words.length === 0) return false;
  const tokens = normalizeName(purchase).split(' ');
  return words.every((word) =>
    tokens.some((token) => {
      if (!token.startsWith(word)) return false;
      const tail = token.slice(word.length);
      return WORD_TAIL.test(tail) && !/^\.[a-z]/.test(tail) && !FLAVOUR_SUFFIX.test(tail);
    }),
  );
};
