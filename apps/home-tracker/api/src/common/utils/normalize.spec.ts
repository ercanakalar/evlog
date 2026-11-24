import { daysBetween, normalizeProductName } from './normalize';

describe('normalizeProductName', () => {
  it.each([
    ['SÜT 1LT TAM YAĞLI', 'sut 1lt tam yagli'],
    ['  Zeytinyağı   1L ', 'zeytinyagi 1l'],
    ['IŞIK ÇAY 500G', 'isik cay 500g'],
    ['Yumurta (30\'lu)', 'yumurta 30 lu'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeProductName(input)).toBe(expected);
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween(new Date('2026-11-01T10:00Z'), new Date('2026-11-08T09:00Z'))).toBe(6);
  });
});
