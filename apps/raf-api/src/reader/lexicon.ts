/**
 * Corrects OCR letter mistakes in product names against a list of words that
 * appear on Turkish grocery receipts.
 *
 * Receipt OCR confuses letters that look alike (H/N/M, U/V, O/Q/0, 7/Y, 5/S)
 * and drops spaces ("MUZITHAL"). A word that is not in the list is replaced by
 * the one list word it is closest to, when that is clearly the closest: the
 * distance counts look-alike swaps as cheap and other edits as dear, and must
 * be small for the word's length. Words that are already correct, numbers and
 * sizes ("500GR", "1000") and anything ambiguous are left as read.
 */
import { digitCount } from './words';

const WORDS = `
SUT YOGURT AYRAN KEFIR PEYNIR PEYN BEYAZ KASAR LABNE TEREYAG TEREYAGI KAYMAK KREMA YUMURTA YUM
TAVUK GOGUS BUT KANAT BAGET KIYMA DANA KUZU KULAGI KOFTE BALIK SOMON HAMSI LEVREK CIPURA SUCUK SALAM SOSIS
PASTIRMA HINDI KONTRAFILE BONFILE ANTRIKOT KUSBASI BIFTEK
MUZ ELMA ARMUT PORTAKAL MANDALINA LIMON GREYFURT CILEK UZUM KARPUZ KAVUN HURMA KIVI NAR ANANAS AVOKADO
DOMATES SALATALIK BIBER PATLICAN KABAK ISPANAK MARUL ROKA MAYDANOZ DEREOTU NANE HAVUC PATATES SOGAN
SARIMSAK MANTAR BROKOLI KARNABAHAR LAHANA PIRASA FASULYE BEZELYE MISIR TERE
EKMEK SIMIT LAVAS YUFKA POGACA TOST UN SEKER TUZ MAKARNA SPAGETTI PIRINC BULGUR MERCIMEK NOHUT
ZEYTIN ZEYTINYAGI AYCICEK YAG SALCA BAL RECEL TAHIN PEKMEZ CAY KAHVE YULAF BISKUVI KRAKER CIKOLATA
CIPS GOFRET KEK KURABIYE KURUYEMIS FINDIK FISTIK CEREZ SU MADEN SODA KOLA GAZOZ MEYVE SUYU NEKTAR
DETERJAN BULASIK CAMASIR YUMUSATICI SABUN SAMPUAN KAGIT HAVLU PECETE POSET TUVALET SUNGER COP
MARKET FILE KG ADET ITHAL YERLI KIRMIZI YESIL SARI SIYAH DOLMALIK CARLISTON SIVRI KAPYA SALKIM
TRABZON MEYVELI CILEKLI PORTAKALLI BIBERLI KOZ SADE TAM YAGLI YARIM LIGHT SUZME TOP TAZE
DONDURULMUS ORGANIK KUCUK BUYUK PAKET CIFT KILITLI BAHARATLI ACILI SEBZE SOSLU EKSTRA KREMALI
FAMILY KAKAOLU SUTLU FINDIKLI LIMONLU NANELI SOGANLI PEYNIRLI
PINAR SUTAS DANONE ICIM ULKER ETI ETIBOR TORKU SOLEN GRETA NUTELLA ABANT ERIKLI HAYAT SIRMA OMO ALO
FAIRY PRIL SELPAK SOLO FAMILIA TAT TAMEK TARIS KOMILI YUDUM BIZIM DOGADAN LIPTON NESCAFE JACOBS
MASTER POTATO BANVIT SEK TIKVESLI MIGROS DIMES CAPPY COCA COLA
PEPSI LAYS DORITOS RUFFLES PRINGLES BIRSAH MIS SUPER OLETTO
`;

const LEXICON = new Set(WORDS.trim().split(/\s+/));
const LEXICON_WORDS = [...LEXICON];

/** Look-alike characters in receipt print, each swap costing less than a real edit. */
const SIMILAR = ['HNM', 'UVN', 'OQ0D', 'IL1', 'S5', 'B8', 'Y7V', 'G6C', 'Z2', 'EF', 'KX', 'AR', 'PR'];
const CHEAP = new Set(
  SIMILAR.map((group) => Array.from(group)).flatMap((group) =>
    group.flatMap((a) => group.filter((b) => a !== b).map((b) => a + b)),
  ),
);
const LOOKALIKE = 0.4;

/** Upper-case ASCII: "Süt" -> "SUT", "İçim" -> "ICIM". */
export const fold = (text: string) =>
  text.replaceAll('ı', 'i').replaceAll('İ', 'I').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();

/** Edit distance where swapping look-alike characters costs LOOKALIKE. */
export function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const x = a[i - 1];
      const y = b[j - 1];
      const swap = x === y ? 0 : CHEAP.has(x + y) ? LOOKALIKE : 1;
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + swap));
    }
    prev = cur;
  }
  return prev[b.length];
}

function limit(length: number): number {
  if (length <= 3) return 0; // too short to tell apart: "KOZ", "SOG"
  if (length <= 5) return 0.8; // two look-alike swaps ("PE7H" -> "PEYN")
  return length <= 8 ? 1.2 : 1.6;
}

/** Turkish endings: a known word with one of these is a correct word ("POSETI"). */
const SUFFIX = /^(I|U|SI|SU|LI|LU|LAR|LER|LARI|LERI|DA|DE|TA|TE)$/;

const CACHE_SIZE = 4096;
const cache = new Map<string, string>();

/** The list word an OCR-read word was meant to be, or the word itself. */
export function correctWord(word: string): string {
  const known = cache.get(word);
  if (known !== undefined) return known;
  const corrected = findCorrection(word);
  if (cache.size >= CACHE_SIZE) cache.clear();
  cache.set(word, corrected);
  return corrected;
}

function findCorrection(word: string): string {
  if (LEXICON.has(word) || word.length <= 3 || !/\p{L}/u.test(word)) return word;
  if (LEXICON_WORDS.some((w) => w.length >= 3 && word.startsWith(w) && SUFFIX.test(word.slice(w.length)))) {
    return word;
  }
  // Mostly digits is a size, a code or a price, not a word.
  if (digitCount(word) * 2 > word.length) return word;
  const max = limit(word.length);
  const scored = LEXICON_WORDS.filter((w) => Math.abs(w.length - word.length) <= 2)
    .map((w) => ({ d: distance(word, w), w }))
    .sort((a, b) => a.d - b.d || (a.w < b.w ? -1 : 1));
  if (scored.length > 0 && scored[0].d <= max && (scored.length === 1 || scored[1].d - scored[0].d >= 0.3)) {
    return scored[0].w;
  }
  // Two words run together: "MUZITHAL" -> "MUZ ITHAL", "HEYVELIYOGURT" -> "MEYVELI YOGURT".
  let best: { cost: number; words: string } | undefined;
  for (let cut = 2; cut < word.length - 2; cut++) {
    const left = word.slice(0, cut);
    const right = word.slice(cut);
    const fixedLeft = correctWord(left);
    const fixedRight = correctWord(right);
    if (!LEXICON.has(fixedLeft) || !LEXICON.has(fixedRight)) continue;
    const cost = distance(left, fixedLeft) + distance(right, fixedRight);
    if (cost <= max && (!best || cost < best.cost)) best = { cost, words: `${fixedLeft} ${fixedRight}` };
  }
  return best?.words ?? word;
}

/** Corrects each word of a product name, keeping sizes, numbers and punctuation as read. */
export const correctName = (name: string) =>
  name.replace(/[A-Za-zÇĞİÖŞÜçğıöşü0-9]+/g, (token) => {
    const folded = fold(token);
    // A size glued to its unit stays: "500GR", "15OGR" (O read for 0) -> "150GR".
    const size = /^(\d+)[OQ](\d*)(GR|G|KG|ML|LT|L|CL|LI|LU)$/.exec(folded);
    if (size) return `${size[1]}0${size[2]}${size[3]}`;
    if (/^\d+(GR|G|KG|ML|LT|L|CL|LI|LU|X\d+)?$/.test(folded)) return token;
    const fixed = correctWord(folded);
    return fixed === folded ? token : fixed;
  });
