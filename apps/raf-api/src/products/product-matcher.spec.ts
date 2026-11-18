import { SHELF_LIFE } from './shelf-life.data';
import { matchProduct, namesMatch, packSize, type ShelfLifeEntry } from './product-matcher';

const catalog: ShelfLifeEntry[] = SHELF_LIFE.map(
  ([keyword, displayName, category, storage, shelfLifeDays, openedShelfLifeDays]) => ({
    keyword, displayName, category, storage, shelfLifeDays, openedShelfLifeDays,
  }),
);

describe('matchProduct', () => {
  it('finds the product in Turkish receipt text and keeps the pack size', () => {
    expect(matchProduct('TAM YAGLI SUT 1L', catalog)).toMatchObject({
      name: 'Whole milk 1 L', category: 'DAIRY_EGGS', shelfLifeDays: 7, openedShelfLifeDays: 3,
      needsReview: false,
    });
    expect(matchProduct('MAKARNA 500G', catalog)).toMatchObject({ name: 'Pasta 500 g', shelfLifeDays: 730 });
    expect(matchProduct('BULASIK DET 750ML', catalog)).toMatchObject({
      name: 'Dish soap 750 ml', category: 'HOUSEHOLD', shelfLifeDays: null,
    });
  });

  it('prefers the longest keyword', () => {
    expect(matchProduct('SUZME YOGURT 1KG', catalog).name).toBe('Strained yogurt 1 kg');
    expect(matchProduct('PORTAKAL SUYU 1L', catalog).name).toBe('Orange juice 1 L');
  });

  it('uses the weighed quantity for loose produce', () => {
    expect(matchProduct('MUZ KG', catalog, 1.12, 'kg').name).toBe('Bananas 1.12 kg');
  });

  it('needs whole words for short keywords', () => {
    expect(matchProduct('BALIK FILETO', catalog).name).toBe('Fish');
    expect(matchProduct('SU 5L', catalog).name).toBe('Water 5 L');
  });

  it('flags lines it cannot place', () => {
    expect(matchProduct('XYZ URUN', catalog)).toMatchObject({
      name: 'Xyz Urun', category: 'OTHER', needsReview: true,
    });
  });
});

describe('namesMatch', () => {
  it('matches every word of the home item at the start of a purchased word', () => {
    expect(namesMatch('Whole milk', 'Whole milk 1 L')).toBe(true);
    expect(namesMatch('Eggs', 'Eggs 15 pack')).toBe(true);
    expect(namesMatch('Rice', 'Pirinç')).toBe(false);
    expect(namesMatch('Olive oil', 'Olive bread')).toBe(false);
  });
});

describe('packSize', () => {
  it('reads common receipt units', () => {
    expect(packSize('YUMURTA 15LI')).toBe('15 pack');
    expect(packSize('KRM PEYN 200G')).toBe('200 g');
    expect(packSize('EKMEK')).toBeNull();
  });
});
