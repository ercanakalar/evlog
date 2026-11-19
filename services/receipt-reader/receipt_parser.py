"""
Turns OCR words (text + position) from a Turkish receipt into structured data.

Pure Python, no OCR dependency, so it can be tested on saved OCR output.

Layout handled (e-Arşiv / market receipts):

    1 2901221           PORTAKAL FILE (KG)
      4,072 KG  ₺49,90   1   ₺0,00   ₺203,19
      qty unit  unit pr. VAT discount line total

Each item ends with a quantity line (`... KG` / `... ADET`); its name is on
the lines above it. Photos of curled paper are tilted, so words are matched by
position rather than by OCR line order. The lira sign is often misread as a
digit (`₺203,19` -> `1203,19`), so prices get candidates that are checked with
quantity x unit price = line total, and finally against the grand total.

Receipts without quantity lines (`SÜT 1LT  %08  *42,75`) fall back to one
item per line that ends in a price.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from itertools import product
from statistics import median

from lexicon import correct_name


@dataclass
class Word:
    x0: float
    x1: float
    y0: float
    y1: float
    text: str
    score: float = 1.0

    @property
    def y(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def h(self) -> float:
        return self.y1 - self.y0


def words_from_ocr(boxes, texts, scores) -> list[Word]:
    words = []
    for box, text, score in zip(boxes, texts, scores):
        xs = [float(p[0]) for p in box]
        ys = [float(p[1]) for p in box]
        text = str(text).strip()
        if text:
            words.append(Word(min(xs), max(xs), min(ys), max(ys), text, float(score)))
    return words


# ───────── Numbers ─────────

# Characters OCR produces for the lira sign, plus the `*` price marker.
CURRENCY_MARKS = "₺tTLl€£$*"
PRICE_END = re.compile(r"(\d[\d.,' ]*)[.,](\d{2})$")
MAX_PRICE = 10_000_000


@dataclass
class Price:
    word: Word
    candidates: list[float]  # most likely first


def price_candidates(text: str) -> list[float]:
    """'t49,90' -> [49.9]; '1203,19' -> [203.19, 1203.19] (₺ read as 1)."""
    s = text.replace("O", "0").replace("o", "0").strip(" :")
    explicit = bool(s) and s[0] in CURRENCY_MARKS
    s = s.lstrip(CURRENCY_MARKS)
    match = PRICE_END.search(s)
    if not match or match.start() > 1:
        return []
    digits = re.sub(r"\D", "", match.group(1))
    cents = int(match.group(2)) / 100
    full = int(digits) + cents
    if explicit or len(digits) < 2:
        values = [full]
    else:
        # A leading 1 / 6 / 4 / 0 is often the misread ₺ sign.
        stripped = int(digits[1:]) + cents
        values = [stripped, full] if digits[0] in "1640" else [full, stripped]
    return [round(v, 2) for v in dict.fromkeys(values) if v <= MAX_PRICE]


def parse_price(word: Word) -> Price | None:
    candidates = price_candidates(word.text)
    return Price(word, candidates) if candidates else None


QTY_UNIT = re.compile(r"^([\dGOoBl.,/']*)\s*(KG|KGM|ADET|AD|LT|GR|PK|PKT)\.?$", re.I)
UNIT_NAMES = {"KG": "kg", "KGM": "kg", "ADET": "pcs", "AD": "pcs", "LT": "L", "GR": "g", "PK": "pcs", "PKT": "pcs"}


def quantity_candidates(text: str, unit: str) -> list[float]:
    """'4,072' -> [4.072]; 'G.822' -> [0.822, 1.822, ...] (first digit unreadable)."""
    # OCR sometimes adds a slash or apostrophe inside a number: "1.0/32" is 1,032.
    s = text.replace("O", "0").replace("o", "0").replace("/", "").replace("'", "").rstrip(".")
    if not s:
        return []
    if unit == "pcs":
        return [int(s)] if s.isdigit() and 0 < int(s) < 1000 else []
    s = s.replace(",", ".")
    if re.fullmatch(r"\d+(\.\d+)?", s):
        return [float(s)]
    if re.fullmatch(r"[^\d.]\.\d+", s):  # unreadable whole-number digit
        return [float(f"{d}{s[1:]}") for d in range(10)]
    return []


# ───────── Items ─────────


@dataclass
class Item:
    name: str
    total: float
    quantity: float | None = None
    unit: str | None = None
    unit_price: float | None = None
    verified: bool = False  # quantity x unit price matched the line total
    alternatives: list[float] = field(default_factory=list)  # other readings of total


@dataclass
class QuantityLine:
    word: Word          # the token with the unit (or the qty+unit token)
    unit: str
    quantities: list[float]
    x0: float           # left edge of the quantity


def find_quantity_lines(words: list[Word], h: float) -> list[QuantityLine]:
    lines = []
    for word in words:
        match = QTY_UNIT.match(word.text.replace(" ", "") if len(word.text) < 14 else "")
        if not match:
            continue
        unit = UNIT_NAMES[match.group(2).upper()]
        qty_text, x0 = match.group(1), word.x0
        if not qty_text:  # quantity is a separate word just left of the unit
            left = [w for w in words if w.x1 <= word.x0 + 2 and abs(w.y - word.y) < 0.7 * h
                    and word.x0 - w.x1 < 3 * h and re.fullmatch(r"[\dGO.,/']+\.?", w.text)]
            if left:
                nearest = max(left, key=lambda w: w.x1)
                qty_text, x0 = nearest.text, nearest.x0
        if not qty_text and unit not in ("pcs", "kg"):
            continue  # a bare 'GR' / 'LT' is part of a product name ('250 GR')
        if sum(c.isdigit() for c in qty_text) > 6:
            continue  # a barcode next to a name's 'GR' row is not a quantity
        lines.append(QuantityLine(word, unit, quantity_candidates(qty_text, unit), x0))
    return sorted(lines, key=lambda line: line.word.y)


def looks_like_price(text: str) -> bool:
    return bool(re.search(r"[\dOo][.,]\d{2}$", text.strip()))


def has_letters(text: str, n: int = 2) -> bool:
    return sum(c.isalpha() for c in text) >= n


CODE = re.compile(r"[\dBO]{7,14}")


# Receipt header text that sits right above the first item: the e-invoice
# number (ETTN), the loyalty card line and the column headings
# ("S.N Miktar Birim Fiyat KDV İnd. Kdvli Tutar"), often garbled by OCR.
HEADER = re.compile(r"(?i)(\bE\s?[T1I]{1,2}\s?N\b|\b[IK]?KART\s*N[O0]|\bMiktar|\bBirim|\bBir[hn]n\b|\bFiyat|\bTutar|\bKdvl?[iı1T]?\b)")


def drop_header_rows(rows: list[list[Word]]) -> list[list[Word]]:
    """
    Keeps only the words below the last receipt-header word. The first item's
    name can share a printed row with the column headings, so words are
    compared one by one, not whole rows.
    """
    header = [w for row in rows for w in row if HEADER.search(w.text)]
    if not header:
        return rows
    cut = max(w.y for w in header)
    kept = [[w for w in row if w.y > cut and not HEADER.search(w.text)] for row in rows]
    return [row for row in kept if row]


def strip_leading_codes(name: str) -> str:
    """
    Drops what is left of the item number and barcode at the start of a name
    when OCR misread some digits ("DOV170Z008SB7 SOLEU…", "5089 SUTAS…").
    """
    tokens = name.split(" ")
    while len(tokens) > 1:
        t = tokens[0]
        digits = sum(c.isdigit() for c in t)
        digit_like = sum(c.isdigit() or c in "OQDBSZGIL" for c in t)
        if (len(t) == 1 or (len(t) >= 4 and digits * 2 >= len(t)) or (t.isdigit() and len(t) <= 3)
                or (len(t) >= 8 and digits >= 3 and digit_like * 4 >= len(t) * 3)):
            tokens.pop(0)
        else:
            break
    return " ".join(tokens)


def clean_name(rows: list[list[Word]]) -> str:
    """Joins name rows; drops the item index and barcode and anything above it."""
    rows = drop_header_rows(rows)
    code_row = next((row for row in rows if any(CODE.search(w.text) for w in row)), None)
    if code_row is not None:
        code_y = median(w.y for w in code_row)
        h = median(w.h for w in code_row)
        code_word = next(w for w in code_row if CODE.search(w.text))
        match = CODE.search(code_word.text)
        # Where the name starts in the barcode row (the barcode can share a word with it).
        name_x = code_word.x0 + (code_word.x1 - code_word.x0) * match.end() / len(code_word.text)
        rows = [row if median(w.y for w in row) >= code_y - 0.3 * h
                else [w for w in row if w.x0 >= name_x - h]
                for row in rows if median(w.y for w in row) >= code_y - 0.8 * h]
        rows = [row for row in rows if row]
    parts = []
    for row in rows:
        text = " ".join(w.text for w in sorted(row, key=lambda w: w.x0))
        match = CODE.search(text)
        if match:
            text = text[match.end():]
        parts.append(text)
    name = " ".join(parts)
    name = re.sub(r"^\W*(\d{1,3}\s+)?([A-Z0-9]\s+)?", "", name.strip())  # index / stray char
    name = strip_leading_codes(re.sub(r"\s+", " ", name).strip(" .-:"))
    return correct_name(name)


def group_rows(words: list[Word], h: float) -> list[list[Word]]:
    rows: list[list[Word]] = []
    for word in sorted(words, key=lambda w: w.y):
        if rows and abs(rows[-1][-1].y - word.y) < 0.5 * h:
            rows[-1].append(word)
        else:
            rows.append([word])
    return rows


def exact_quantity(total: float, unit_price: float, unit: str) -> float | None:
    """The quantity that makes quantity x unit price = total to the kuruş, if there is one."""
    if unit_price <= 0:
        return None
    if unit == "pcs":
        q = round(total / unit_price)
        return q if 1 <= q <= 999 and abs(round(q * unit_price, 2) - total) <= 0.01 else None
    q = round(total / unit_price, 3)
    return q if 0 < q < 1000 and abs(round(q * unit_price, 2) - total) <= 0.01 else None


def similarity(a: float, b: float) -> int:
    """How many digits two numbers share in place ("0.968" vs "0.068" -> 4)."""
    x, y = f"{a:.3f}", f"{b:.3f}"
    return sum(c == d for c, d in zip(x.rjust(9), y.rjust(9)))


def resolve(line: QuantityLine, unit_price: Price | None, total: Price | None) -> tuple[float | None, float | None, float | None, bool, list[float]]:
    """
    Picks the quantity, unit price and line total readings that agree
    (quantity x unit price = total). Returns them, whether they agreed, and
    other plausible line totals for the grand-total check to fall back on.
    """
    known_qty = line.quantities[0] if len(line.quantities) == 1 else None
    quantities = line.quantities or (list(range(1, 21)) if line.unit == "pcs" else [])
    units = [c for c in unit_price.candidates if c > 0] if unit_price else []
    totals = [c for c in total.candidates if c > 0] if total else []
    for t in totals:  # most likely reading first
        for q, u in product(quantities, units):
            if abs(round(q * u, 2) - t) <= 0.02 + 0.002 * t:
                return q, u, t, True, []
    # Quantity misread too (0,968 -> "0.068"): a unit price reading that
    # divides the total exactly gives the quantity; closest to what was read wins.
    if totals and units and line.quantities:
        exact = []
        for u in units:
            q = exact_quantity(totals[0], u, line.unit)
            if q is not None:
                exact.append((similarity(q, line.quantities[0]), q, u))
        if exact:
            _, q, u = max(exact)
            return q, u, totals[0], True, []
    u = units[0] if units else None
    computed = round(known_qty * u, 2) if known_qty is not None and u else None
    if totals and computed and unit_price.word.score > total.word.score + 0.05:
        # They disagree and OCR was surer of the unit price than of the total.
        return known_qty, u, computed, False, totals
    if totals:
        t = totals[0]
        q = known_qty
        # The three disagree, so one of quantity / unit price was misread.
        # Shelf prices end in a round 10 kuruş (39,90); weighed amounts don't.
        fixed_u = round(t / q, 2) if q else None
        if fixed_u and round(fixed_u * 100) % 10 == 0 and abs(round(fixed_u * q, 2) - t) <= 0.02:
            u = fixed_u
        elif u:  # quantity = total / unit price, when that is a sensible number
            derived = t / u
            if line.unit != "pcs":
                q = round(derived, 3)
            elif abs(derived - round(derived)) < 0.01 and round(derived) >= 1:
                q = round(derived)
        elif q:
            u = round(t / q, 2)
        if q is None and line.unit == "pcs" and u is None:
            q = 1  # count and unit price unreadable: one piece is by far the most common
        return q, u, t, False, ([computed] if computed else []) + totals[1:]
    return known_qty, u, computed, False, []  # line total unreadable


def items_from_quantity_lines(words: list[Word], lines: list[QuantityLine], h: float, end_y: float) -> list[Item]:
    items = []
    prices = [p for p in (parse_price(w) for w in words) if p]
    lines = [line for line in lines if line.word.y < end_y]

    def on_line(line: QuantityLine) -> list[Price]:
        """Prices on the same physical line, allowing for tilt (right side up to ~1.5 lines higher)."""
        y = line.word.y
        found = [p for p in prices if p.word.x0 > line.word.x1 - 2 and y - 1.5 * h <= p.word.y <= y + 0.6 * h]
        return sorted(found, key=lambda p: p.word.x0)

    # The line total is the right-aligned last column. Its x drifts on curled
    # paper, so each line compares against its neighbours' right edges.
    right_edges = [max((p.word.x1 for p in on_line(line)), default=None) for line in lines]

    previous_y = None
    for i, line in enumerate(lines):
        y = line.word.y
        found = on_line(line)
        nearby = [x for x in right_edges[max(0, i - 2):i + 3] if x is not None]
        column = median(nearby) if nearby else None
        in_column = [p for p in found if column is not None and p.word.x1 >= column - 1.2 * h]
        total = max(in_column, key=lambda p: p.word.x1) if in_column else None
        # First price after the quantity; a ₺0,00 discount (read as 10,00) is never a unit price.
        unit_price = next((p for p in found if p is not total and p not in in_column
                           and 0.0 not in p.candidates and any(c > 0 for c in p.candidates)), None)

        top = max(previous_y + 0.2 * h if previous_y is not None else -1e9, y - 4.5 * h)
        right_edge = total.word.x0 if total else float("inf")
        name_words = [
            w for w in words
            if top <= w.y < y - 0.5 * h and w.x0 < right_edge - h
            and has_letters(w.text) and not looks_like_price(w.text) and not QTY_UNIT.match(w.text)
        ]
        name = clean_name(group_rows(name_words, h))
        previous_y = y

        q, u, t, verified, alternatives = resolve(line, unit_price, total)
        if t is None or t <= 0:
            continue
        alternatives = [a for a in dict.fromkeys(alternatives) if a and a != t]
        items.append(Item(name or "?", t, q, line.unit, u, verified, alternatives))
    return items


def items_from_price_lines(words: list[Word], h: float, start_y: float, end_y: float) -> list[Item]:
    """Fallback: one item per line whose rightmost word is a price."""
    items = []
    for row in group_rows([w for w in words if start_y < w.y < end_y], h):
        row.sort(key=lambda w: w.x0)
        price = parse_price(row[-1])
        name = " ".join(w.text for w in row[:-1] if has_letters(w.text))
        if price and name:
            items.append(Item(clean_name([[Word(0, 0, 0, 0, name)]]) or name, price.candidates[0],
                              alternatives=price.candidates[1:]))
    return items


# ───────── Header and totals ─────────

TOTALS = re.compile(r"\b(TOPLAM|TOPKDV|KDV|MATRAH|TUTAR|ARA ?TOPLAM)\b", re.I)
GRAND_TOTAL_LABELS = [r"GENEL\s*TOPLAM", r"\bTOPLAM\b", r"\bTUTAR\b", r"ÖDENECEK"]
NOT_MERCHANT = re.compile(r"FATURA|ARŞIV|ARSIV|FIŞ|FIS|TARIH|SAAT|NO\b|SAYIN|VERGI|MERSIS", re.I)


def grand_total(words: list[Word], h: float, below_y: float) -> float | None:
    candidates = [w for w in words if w.y > below_y]
    for label in GRAND_TOTAL_LABELS:
        for word in sorted(candidates, key=lambda w: w.y):
            if not re.search(label, word.text, re.I):
                continue
            inline = parse_price(Word(0, 0, 0, 0, re.split(label, word.text, flags=re.I)[-1].strip()))
            if inline:
                return inline.candidates[0]
            right = [p for p in (parse_price(w) for w in candidates)
                     if p and p.word.x0 > word.x1 - 2 and word.y - 1.5 * h <= p.word.y <= word.y + 0.8 * h]
            if right:
                return min(right, key=lambda p: abs(p.word.y - word.y)).candidates[0]
    return None


def issued_at(words: list[Word]) -> str | None:
    text = " ".join(w.text for w in sorted(words, key=lambda w: (w.y, w.x0)))
    date = None
    # A separator dot is often read as "1" or ",": "08.11.2026" -> "081112026".
    for match in re.finditer(r"(?<!\d)(\d{2})[./,-]?(\d{2})[./,1-]?(20\d{2})(?!\d)", text):
        day, month, year = map(int, match.groups())
        try:
            date = datetime(year, month, day)
        except ValueError:
            continue
        time = re.search(r"(?<!\d)([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?", text[match.end():match.end() + 40])
        if time:
            hh, mm, ss = int(time.group(1)), int(time.group(2)), int(time.group(3) or 0)
            return date.replace(hour=hh, minute=mm, second=ss).strftime("%Y-%m-%dT%H:%M:%S+03:00")
        return date.strftime("%Y-%m-%d")
    return None


def merchant(words: list[Word]) -> str | None:
    for word in sorted(words, key=lambda w: w.y)[:15]:
        if word.score >= 0.8 and has_letters(word.text, 4) and not re.search(r"\d", word.text) \
                and not NOT_MERCHANT.search(word.text):
            return word.text.strip()
    return None


# ───────── Putting it together ─────────


def fix_with_total(items: list[Item], total: float | None) -> bool:
    """If the items don't add up, tries other readings of unverified line totals."""
    if total is None or not items:
        return False
    diff = round(sum(i.total for i in items) - total, 2)
    if abs(diff) <= 0.02:
        return True
    for item in items:
        for alt in item.alternatives:
            if abs(round(diff - item.total + alt, 2)) <= 0.02:
                item.total = alt
                if item.quantity:
                    item.unit_price = round(alt / item.quantity, 2)
                return True
    return False


def parse(words: list[Word]) -> dict:
    """Returns the API's OCR result shape, or {"error": ..., "items": []}."""
    words = [w for w in words if w.text]
    if not words:
        return {"error": "No text found in the photo", "items": []}
    h = median(w.h for w in words)

    lines = find_quantity_lines(words, h)
    first_y = lines[0].word.y if lines else min(w.y for w in words)
    totals_words = [w for w in words if w.y > first_y and TOTALS.search(w.text)]
    end_y = min((w.y for w in totals_words), default=float("inf"))

    items = items_from_quantity_lines(words, lines, h, end_y) if lines else []
    if not items:
        items = items_from_price_lines(words, h, min(w.y for w in words) + 5 * h, end_y)
    if not items:
        return {"error": "Could not find any items. Take a closer, straight photo of the receipt.", "items": []}

    total = grand_total(words, h, first_y)
    adds_up = fix_with_total(items, total)
    verified = sum(i.verified for i in items) / len(items)
    confidence = round(verified * (1.0 if adds_up else 0.7) if lines else (0.6 if adds_up else 0.3), 2)

    result = {
        "merchantName": merchant(words),
        "issuedAt": issued_at(words),
        "currency": "TRY",
        "total": total,
        "items": [
            {k: v for k, v in {
                "name": i.name[:200],
                "quantity": round(i.quantity, 3) if i.quantity else None,
                "unit": i.unit,
                "unitPrice": i.unit_price,
                "totalPrice": i.total,
            }.items() if v is not None}
            for i in items[:300]
        ],
        "confidence": confidence,
    }

    print(result)
    return {k: v for k, v in result.items() if v is not None}
