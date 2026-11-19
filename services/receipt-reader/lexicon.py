"""
Corrects OCR letter mistakes in product names against a list of words that
appear on Turkish grocery receipts.

Receipt OCR confuses letters that look alike (H/N/M, U/V, O/Q/0, 7/Y, 5/S)
and drops spaces ("MUZITHAL"). A word that is not in the list is replaced by
the one list word it is closest to, when that is clearly the closest: the
distance counts look-alike swaps as cheap and other edits as dear, and must
be small for the word's length. Words that are already correct, numbers and
sizes ("500GR", "1000") and anything ambiguous are left as read.
"""

from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

WORDS = """
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
""".split()

LEXICON = frozenset(WORDS)

# Look-alike characters in receipt print, each swap costing less than a real edit.
_SIMILAR = [
    "HNM", "UVN", "OQ0D", "IL1", "S5", "B8", "Y7V", "G6C", "Z2", "EF", "KX", "AR", "PR",
]
_CHEAP = {(a, b) for group in _SIMILAR for a in group for b in group if a != b}
LOOKALIKE = 0.4


def fold(text: str) -> str:
    """Upper-case ASCII: "Süt" -> "SUT", "İçim" -> "ICIM"."""
    text = text.replace("ı", "i").replace("İ", "I")
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)).upper()


def distance(a: str, b: str) -> float:
    """Edit distance where swapping look-alike characters costs LOOKALIKE."""
    prev = [float(j) for j in range(len(b) + 1)]
    for i, x in enumerate(a, 1):
        cur = [float(i)]
        for j, y in enumerate(b, 1):
            sub = 0.0 if x == y else LOOKALIKE if (x, y) in _CHEAP else 1.0
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub))
        prev = cur
    return prev[-1]


def _limit(length: int) -> float:
    if length <= 3:
        return 0.0       # too short to tell apart: "KOZ", "SOG"
    if length <= 5:
        return 0.8       # two look-alike swaps ("PE7H" -> "PEYN")
    if length <= 8:
        return 1.2
    return 1.6


# Turkish endings: a known word with one of these is a correct word ("POSETI").
SUFFIX = re.compile(r"(I|U|SI|SU|LI|LU|LAR|LER|LARI|LERI|DA|DE|TA|TE)")


@lru_cache(maxsize=4096)
def correct_word(word: str) -> str:
    """The list word an OCR-read word was meant to be, or the word itself."""
    if word in LEXICON or len(word) <= 3 or not any(c.isalpha() for c in word):
        return word
    if any(word.startswith(w) and SUFFIX.fullmatch(word[len(w):]) for w in LEXICON if len(w) >= 3):
        return word
    # Mostly digits is a size, a code or a price, not a word.
    if sum(c.isdigit() for c in word) * 2 > len(word):
        return word
    limit = _limit(len(word))
    scored = sorted((distance(word, w), w) for w in LEXICON if abs(len(w) - len(word)) <= 2)
    if scored and scored[0][0] <= limit and (len(scored) == 1 or scored[1][0] - scored[0][0] >= 0.3):
        return scored[0][1]
    # Two words run together: "MUZITHAL" -> "MUZ ITHAL", "HEYVELIYOGURT" -> "MEYVELI YOGURT".
    best: tuple[float, str] | None = None
    for cut in range(2, len(word) - 1):
        left, right = word[:cut], word[cut:]
        if len(left) < 2 or len(right) < 3:
            continue
        fixed_left = left if left in LEXICON else correct_word(left)
        fixed_right = right if right in LEXICON else correct_word(right)
        if fixed_left in LEXICON and fixed_right in LEXICON:
            cost = distance(left, fixed_left) + distance(right, fixed_right)
            if cost <= limit and (best is None or cost < best[0]):
                best = (cost, f"{fixed_left} {fixed_right}")
    return best[1] if best else word


_TOKEN = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşü0-9]+")


def correct_name(name: str) -> str:
    """Corrects each word of a product name, keeping sizes, numbers and punctuation as read."""

    def fix(match: re.Match[str]) -> str:
        token = match.group(0)
        folded = fold(token)
        # A size glued to its unit stays: "500GR", "15OGR" (O read for 0) -> "150GR".
        size = re.fullmatch(r"(\d+)[OQ](\d*)(GR|G|KG|ML|LT|L|CL|LI|LU)", folded)
        if size:
            return f"{size.group(1)}0{size.group(2)}{size.group(3)}"
        if re.fullmatch(r"\d+(GR|G|KG|ML|LT|L|CL|LI|LU|X\d+)?", folded):
            return token
        fixed = correct_word(folded)
        return token if fixed == folded else fixed

    return _TOKEN.sub(fix, name)
