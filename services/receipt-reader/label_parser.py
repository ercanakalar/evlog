"""
Reads the expiry date from a photo of a product pack.

Turkish packs print it after "SKT" (son tüketim tarihi, use by) or "TETT"
(tavsiye edilen tüketim tarihi, best before); imported ones after "EXP" or
"BEST BEFORE". The production date ("ÜT", "ÜRT", "ÜRETİM", "PROD") is often
printed right beside it and must not be taken for it. Dates come as
12.03.2027, 12/03/27, 12-03-2027 or just 03/2027 (end of that month).

Works on the words OCR found, so it can be tested without the OCR models.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date

from receipt_parser import Word, find_ean

EXPIRY = re.compile(
    r"S\.?\s?K\.?\s?T|T\.?\s?E\.?\s?T\.?\s?T|SON\s*T[UÜ]K|TAV(S[İI]YE)?\.?\s*ED|T[ÜU]K(ET[İI]M)?\.?\s*TAR"
    r"|\bEXP|BEST\s*BEFORE|\bB\.?\s?B\b|USE\s*BY",
    re.I,
)
PRODUCTION = re.compile(r"[ÜU]\.?\s?T\b|[ÜU]RT|[ÜU]RET[İI]M|PROD|MFG|\bP\.?\s?D\b|IMAL", re.I)

# Separators OCR may read for "." : "," "/" "-" " " and sometimes nothing.
SEP = r"\s?[./,\-]\s?"
FULL = re.compile(rf"(?<!\d)([0-3]?\d){SEP}([01]?\d){SEP}((?:20)?\d{{2}})(?!\d)")
MONTH = re.compile(rf"(?<![\d./,\-])([01]?\d){SEP}(20\d{{2}})(?!\d)")
ISO = re.compile(r"(?<!\d)(20\d{2})-([01]\d)-([0-3]\d)(?!\d)")


@dataclass
class FoundDate:
    value: date
    start: int
    kind: str  # "expiry", "production" or "unknown"


def _year(text: str) -> int:
    y = int(text)
    return y + 2000 if y < 100 else y


def _plausible(d: date, today: date) -> bool:
    return date(today.year - 3, 1, 1) <= d <= date(today.year + 10, 12, 31)


def _kind(text: str, start: int, previous_end: int) -> str:
    """
    What the label right before a date says it is: looking back at most ~25
    characters, on the same line, and not past the date before it.
    """
    line_start = text.rfind("\n", 0, start) + 1
    before = text[max(line_start, previous_end, start - 25):start]
    expiry = [m.end() for m in EXPIRY.finditer(before)]
    production = [m.end() for m in PRODUCTION.finditer(before)]
    if not expiry and not production:
        return "unknown"
    return "expiry" if max(expiry, default=-1) >= max(production, default=-1) else "production"


def find_dates(text: str, today: date) -> list[FoundDate]:
    found: list[FoundDate] = []
    taken: list[range] = []

    def add(d: date, span: tuple[int, int]) -> None:
        if _plausible(d, today) and not any(span[0] in r for r in taken):
            taken.append(range(*span))
            found.append(FoundDate(d, span[0], "unknown"))

    for m in ISO.finditer(text):
        try:
            add(date(int(m[1]), int(m[2]), int(m[3])), m.span())
        except ValueError:
            pass
    for m in FULL.finditer(text):
        try:
            add(date(_year(m[3]), int(m[2]), int(m[1])), m.span())
        except ValueError:
            pass
    for m in MONTH.finditer(text):
        month, year = int(m[1]), int(m[2])
        if 1 <= month <= 12:
            add(date(year, month, calendar.monthrange(year, month)[1]), m.span())
    found.sort(key=lambda f: f.start)
    ends = {r.start: r.stop for r in taken}
    previous_end = 0
    for f in found:
        f.kind = _kind(text, f.start, previous_end)
        previous_end = ends[f.start]
    return found


def reading_text(words: list[Word]) -> str:
    """The words in reading order: top to bottom, left to right on each line."""
    if not words:
        return ""
    h = sorted(w.h for w in words)[len(words) // 2]
    rows: list[list[Word]] = []
    for word in sorted(words, key=lambda w: w.y):
        if rows and abs(rows[-1][-1].y - word.y) < 0.5 * h:
            rows[-1].append(word)
        else:
            rows.append([word])
    return "\n".join(" ".join(w.text for w in sorted(row, key=lambda w: w.x0)) for row in rows)


def parse_label(words: list[Word], today: date | None = None) -> dict:
    """
    {"expiresOn": "2027-03-12" | None, "barcode": "869..." | None, "dates": [...]}.
    The expiry date is the one labelled SKT/TETT/EXP; failing that, the
    latest date that is not labelled as the production date.
    """
    today = today or date.today()
    text = reading_text(words)
    dates = find_dates(text, today)
    labelled = [d for d in dates if d.kind == "expiry"]
    candidates = labelled or [d for d in dates if d.kind != "production"]
    expires = max(candidates, key=lambda d: d.value).value if candidates else None
    return {
        "expiresOn": expires.isoformat() if expires else None,
        "barcode": find_ean(text),
        "dates": [{"date": d.value.isoformat(), "kind": d.kind} for d in dates],
    }
