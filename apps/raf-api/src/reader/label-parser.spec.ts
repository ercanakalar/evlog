import { eanValid, findEan } from './barcode';
import { parseLabel } from './label-parser';
import { word } from './words';

const TODAY = new Date('2026-11-19');
const label = (...lines: string[]) =>
  parseLabel(lines.map((t, i) => word(0, 20 * t.length, 40 * i, 40 * i + 30, t)), TODAY);

describe('expiry dates', () => {
  it.each([
    ['SKT: 12.03.2027', '2027-03-12'],
    ['TETT 05/01/27', '2027-01-05'],
    ['S.K.T. 28-02-2027', '2027-02-28'],
    ['Son Tüketim Tarihi: 01.12.2026', '2026-12-01'],
    ['Tav. Ed. Tük. Tar. 11/2027', '2027-11-30'],
    // The production date beside it is not taken.
    ['ÜT: 01.11.2026  SKT: 15.11.2026', '2026-11-15'],
    ['12.11.2026 26.11.2026', '2026-11-26'],
    // Imported packs.
    ['EXP 2027-06-30', '2027-06-30'],
    ['BEST BEFORE 06.2028', '2028-06-30'],
    // OCR noise and inkjet layouts.
    ['SKT 12,03,2027', '2027-03-12'],
    ['SKT 12. 03. 2027', '2027-03-12'],
    ['SKT 15 03 2027', '2027-03-15'],
    ['TETT 15 03 27', '2027-03-15'],
    ['TETT 150327', '2027-03-15'],
    ['SKT:15032027', '2027-03-15'],
    // Month names.
    ['EXP 15 MAR 2027', '2027-03-15'],
    ['SKT 15.OCA.27', '2027-01-15'],
    ['SKT 15 NİSAN 2027', '2027-04-15'],
    ['skt 15 nisan 2027', '2027-04-15'],
    ['TETT KASIM 2027', '2027-11-30'],
    ['BEST BEFORE 05 AUG 2027', '2027-08-05'],
    // A lot number is not a date.
    ['L 120427 SKT 15.03.2027', '2027-03-15'],
  ])('reads %s', (text, date) => {
    expect(label(text).expiresOn).toBe(date);
  });

  it('looks at the label on the same line', () => {
    expect(label('ÜRT 10.10.2026', 'TETT 10.04.2027').expiresOn).toBe('2027-04-10');
    expect(label('Üretim 02.11.2026', '09.11.2026').expiresOn).toBe('2026-11-09');
  });

  it('knows labels written with a Turkish i', () => {
    expect(label('TAVSİYE ED. 01.06.2027 01.09.2027').expiresOn).toBe('2027-06-01');
    expect(label('tavsıye ed. 01.06.2027 01.09.2027').expiresOn).toBe('2027-06-01');
  });

  it.each([[['L: 150327']], [['PINAR LABNE 400 g']], [['NET 400 GR', '₺279,90']], [['SKT 31.02.2027']]])(
    'finds no date in %j',
    (lines) => {
      expect(label(...lines).expiresOn).toBeNull();
    },
  );

  it('reads a barcode on the label', () => {
    expect(label('8690565007679', 'SKT 12.03.2027').barcode).toBe('8690565007679');
    expect(label('8 690565 007679', 'SKT 12.03.2027').barcode).toBeNull();
  });
});

describe('barcodes', () => {
  it('checks the check digit', () => {
    expect(eanValid('8690565007679')).toBe(true);
    expect(eanValid('80176800')).toBe(true);
    expect(eanValid('8690565007678')).toBe(false);
  });

  it('finds them in receipt text', () => {
    expect(findEan('17 8690565007679 PINAR LABNE 2X400GR')).toBe('8690565007679');
    expect(findEan('19 80176800 NUTELLA 750GR')).toBe('80176800');
    expect(findEan('2901241 MUZ ITHAL (KG)')).toBeUndefined(); // store code of weighed produce
    expect(findEan('PINAR LABNE 2X400GR 4100,53')).toBeUndefined();
  });

  it('reads letters as digits and repairs one misread digit', () => {
    expect(findEan('869O565OO7679 PINAR')).toBe('8690565007679');
    expect(findEan('21 8092971429410 ICIM KEFIR')).toBe('8692971429410');
  });

  it('can repair the wrong digit, so matches are shown to the user first', () => {
    expect(findEan('8690565007670')).not.toBe('8690565007679');
  });
});
