/**
 * Normalises a product name from a Turkish receipt so the same product
 * matches across receipts: "SÜT 1LT TAM YAĞLI" -> "sut 1lt tam yagli".
 */
export const normalizeProductName = (name: string): string =>
  name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.,% ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const DAY_MS = 24 * 60 * 60 * 1000;

export const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / DAY_MS);

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * DAY_MS);
