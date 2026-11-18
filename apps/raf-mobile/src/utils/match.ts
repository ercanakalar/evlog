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

export const namesMatch = (homeItem: string, purchase: string) => {
  const words = normalizeName(homeItem).split(' ').filter(Boolean);
  if (words.length === 0) return false;
  const target = ` ${normalizeName(purchase)} `;
  return words.every((word) => target.includes(` ${word}`));
};
