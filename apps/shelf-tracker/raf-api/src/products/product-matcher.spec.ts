import { BRANDS } from './brands.data';
import { SHELF_LIFE } from './shelf-life.data';
import {
  findBrand,
  homeName,
  matchProduct,
  namesMatch,
  packOf,
  packSize,
  productLanguage,
  type ShelfLifeEntry,
} from './product-matcher';
import { TURKISH_NAMES } from './turkish-names.data';

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

  it('does not put a count of pieces in the name', () => {
    expect(matchProduct('KUZU KULAGI (ADET)', catalog, 2, 'pcs').name).toBe('Sorrel');
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

describe('City Gross receipt lines', () => {
  it.each([
    ['KUZU KULAGI (ADET)', 'Sorrel', 'FRUIT_VEG'],
    ['MASTER POTATO SOGAN.EKST KRM.160 GR', 'Crisps 160 g', 'PANTRY'],
    ['MASTER POTATO SEBZE SOSLU CIPS 160 GR', 'Crisps 160 g', 'PANTRY'],
    ['SOLEN GRETA 150GR PORTAKALLI KRAKER', 'Crackers 150 g', 'PANTRY'],
    ['SOLEN GRETA KOZ BIBERLI', 'Crackers', 'PANTRY'],
    ['DANONE MEYVELI YOGURT CILEKLI 400GR', 'Yogurt 400 g', 'DAIRY_EGGS'],
    ['ICIM KEFIR 1000 ML ORMAN MEYVEL', 'Kefir 1000 ml', 'DAIRY_EGGS'],
    ['TURE YUM.30LU BEYAZ L', 'Eggs 30 pack', 'DAIRY_EGGS'],
    ['EKICI TOP PEYN.200GR', 'Cheese 200 g', 'DAIRY_EGGS'],
    ['HURMA TRABZON (KG)', 'Persimmons', 'FRUIT_VEG'],
    ['GREYFURT ACIK (KG)', 'Grapefruit', 'FRUIT_VEG'],
    ['NUTELLA 750GR', 'Hazelnut spread 750 g', 'PANTRY'],
    ['MARKET POSETI (75AD/KG)', 'Shopping bags', 'HOUSEHOLD'],
    ['PORTAKAL FILE (KG)', 'Oranges', 'FRUIT_VEG'],
    ['BIBER KIRMIZI (KAPYA) (KG)', 'Peppers', 'FRUIT_VEG'],
  ])('%s -> %s', (raw, name, category) => {
    expect(matchProduct(raw, catalog)).toMatchObject({ name, category, needsReview: false });
  });

  it('does not take a flavour for the product', () => {
    // "Strawberry-flavoured" yogurt read without its "YOGURT" word stays unknown, not "Strawberries".
    expect(matchProduct('DANOHE HEYVELIYOGURT CILEKLI 400GR', catalog).name).not.toMatch(/Strawberr/);
    expect(matchProduct('TAVUKLU NOODLE', catalog).name).not.toMatch(/Chicken/);
  });
});

describe('namesMatch with products kept at home', () => {
  it.each([
    ['Süt', 'TAM YAGLI SUT 1L', true],
    ['Süt', 'SUTAS PEYN.500GR SUZME', false],
    ['Soğan', 'MASTER POTATO SOGAN.EKST KRM.160 GR', false],
    ['Portakal', 'SOLEN GRETA 150GR PORTAKALLI KRAKER', false],
    ['Portakal', 'PORTAKAL FILE (KG)', true],
    ['Egg', 'Eggs 30 pack', true],
    ['Tomato', 'Tomatoes 1 kg', true],
    ['Kefir', 'ICIM KEFIR 1000 ML ORMAN MEYVEL', true],
    ['Kefir', 'Kefir 1000 ml', true],
    ['Muz', 'MUZ ITHAL (KG)', true],
  ])('%s / %s -> %s', (home, purchase, expected) => {
    expect(namesMatch(home, purchase)).toBe(expected);
  });
});

describe('findBrand', () => {
  const brands = BRANDS.map(([name, ...keywords]) => ({ id: name, name, keywords }));
  it.each([
    ['SUTAS AYRAN 1000ML', 'Sütaş'],
    ['SÜTAŞ AYRAN 250 ML', 'Sütaş'],
    ['SUTAS.AYRAN 1L', 'Sütaş'],
    ['PINAR SUT 1L', 'Pınar'],
    ['PINAR SU 5L', 'Pınar Su'],
    ['ULKER CIK.GOFRET 36G', 'Ülker'],
    ['COCA COLA 1L', 'Coca-Cola'],
    // "eti" here is meat, not the Eti brand.
    ['DANA ETI KG', null],
    ['TAM YAGLI SUT 1L', null],
  ])('%s -> %s', (raw, brand) => {
    expect(findBrand(raw, brands)?.name ?? null).toBe(brand);
  });

  it('lists every spelling once, normalised', () => {
    const all = BRANDS.flatMap(([, ...keywords]) => keywords);
    expect(new Set(all).size).toBe(all.length);
    for (const k of all) expect(k).toMatch(/^[a-z0-9 ]+$/);
  });
});

describe('packOf', () => {
  it('reads the printed pack size as a number and unit', () => {
    expect(packOf('SUTAS AYRAN 1000ML')).toEqual({ amount: 1000, unit: 'ml' });
    expect(packOf('SUTAS AYRAN 250 ML')).toEqual({ amount: 250, unit: 'ml' });
    expect(packOf('TAM YAGLI SUT 1,5LT')).toEqual({ amount: 1.5, unit: 'L' });
    expect(packOf('YUMURTA 15LI')).toEqual({ amount: 15, unit: 'pack' });
    expect(packOf('EKMEK')).toBeNull();
  });
});

describe('homeName', () => {
  it.each([
    ['Ayran 1000 ml', 'Ayran'],
    ['Whole milk 1 L', 'Whole milk'],
    ['Eggs 15 pack', 'Eggs'],
    ['Bananas 1.12 kg', 'Bananas'],
    ['Bread', 'Bread'],
  ])('%s -> %s', (name, expected) => {
    expect(homeName(name)).toBe(expected);
  });
});

describe('Turkish product names', () => {
  it('has one for every product', () => {
    const missing = SHELF_LIFE.map(([, name]) => name).filter((name) => !TURKISH_NAMES[name]);
    expect(missing).toEqual([]);
  });

  it('names products in the language of the app', () => {
    const name = (raw: string) => matchProduct(raw, catalog, undefined, undefined, 'tr').name;
    expect(name('TAM YAGLI SUT 1L')).toBe('Tam yağlı süt 1 L');
    expect(name('YUMURTA 15LI')).toBe('Yumurta 15 adet');
    expect(matchProduct('MUZ KG', catalog, 1.12, 'kg', 'tr').name).toBe('Muz 1,12 kg');
    expect(homeName('Muz 1,12 kg')).toBe('Muz');
    expect(homeName(name('YUMURTA 15LI'))).toBe('Yumurta');
    expect(productLanguage('tr')).toBe('tr');
    expect(productLanguage('tr-TR,tr;q=0.9')).toBe('tr');
    expect(productLanguage(undefined)).toBe('en');
  });
});
