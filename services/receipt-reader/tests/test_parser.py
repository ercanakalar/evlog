"""Run from services/receipt-reader:  python -m unittest discover -s tests"""

import contextlib
import io
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import receipt_parser as rp  # noqa: E402
from lexicon import correct_name  # noqa: E402
from receipt_parser import QuantityLine, Word, parse_price  # noqa: E402

H = 30.0


def w(text: str, x: float, y: float, score: float = 0.95) -> Word:
    return Word(x, x + 12 * len(text), y, y + H, text, score)


def parse(words: list[Word]) -> dict:
    with contextlib.redirect_stdout(io.StringIO()):
        return rp.parse(words)


class Quantities(unittest.TestCase):
    def test_a_stray_slash_in_a_weight(self):
        self.assertEqual(rp.quantity_candidates("1.0/32", "kg"), [1.032])

    def test_a_misread_quantity_is_recovered_from_an_exact_price(self):
        # 0,968 KG x ₺59,90 = ₺57,98, read as "0.068" and "259,90" (₺ as 2).
        line = QuantityLine(w("KG", 100, 0), "kg", [0.068], 60)
        q, u, t, verified, _ = rp.resolve(line, parse_price(w("259,90", 200, 0)), parse_price(w("₺57,98", 400, 0)))
        self.assertEqual((q, u, t, verified), (0.968, 59.9, 57.98, True))

    def test_a_barcode_beside_a_names_gr_row_is_not_a_quantity(self):
        words = [w("8662250613807", 60, 100), w("GR", 240, 100)]
        self.assertEqual(rp.find_quantity_lines(words, H), [])


class Names(unittest.TestCase):
    def test_header_words_are_dropped_but_the_name_on_their_row_is_kept(self):
        rows = [[w("ETIN:", 0, 0)], [w("KART NO: 990", 0, 30)],
                [w("SNNILr Birhn", 0, 60), w("MARKET POSETI (75AD/KG)", 200, 66)]]
        self.assertEqual(rp.clean_name(rows), "MARKET POSETI (75AD/KG)")

    def test_barcodes_with_misread_digits_are_dropped(self):
        self.assertEqual(rp.strip_leading_codes("DOV1707O0HSB7 SOLEN GRETA KOZ BIBERLI"), "SOLEN GRETA KOZ BIBERLI")
        self.assertEqual(rp.strip_leading_codes("5089 SUTAS PEYN.500GR SUZME"), "SUTAS PEYN.500GR SUZME")
        self.assertEqual(rp.strip_leading_codes("MASTER POTATO 160 GR"), "MASTER POTATO 160 GR")

    def test_ocr_letter_mistakes_are_corrected(self):
        for read, meant in [
            ("MANDALIHA (KG)", "MANDALINA (KG)"),
            ("MUZITHAL(KG)", "MUZ ITHAL(KG)"),
            ("DANOHE HEYVELIYOGURT CILEKLI 400GR", "DANONE MEYVELI YOGURT CILEKLI 400GR"),
            ("SUTAS PE7H.500GR SUZME", "SUTAS PEYN.500GR SUZME"),
            ("SOLEU GRETA 15OGR PORTAKALLI KRAKER", "SOLEN GRETA 150GR PORTAKALLI KRAKER"),
        ]:
            self.assertEqual(correct_name(read), meant)

    def test_correct_and_unknown_words_are_left_alone(self):
        for name in ["MARKET POSETI (75AD/KG)", "KUZU KULAGI (ADET)", "ORHAN REIS FILE SARIMSAK 250 GR",
                     "SOLEN GRETA KOZ BIBERLI", "ICIM KEFIR 1000 ML", "ABANT SU 5 LT*2LI (1PL:80)"]:
            self.assertEqual(correct_name(name), name)


class Dates(unittest.TestCase):
    def test_a_dot_read_as_one(self):
        self.assertEqual(rp.issued_at([w("081112026", 0, 0), w("17:31", 200, 0)]), "2026-11-08T17:31:00+03:00")


class Receipt(unittest.TestCase):
    def test_two_line_receipt_adds_up(self):
        words = [
            w("CITY GROSS", 100, 0),
            w("1 2901241", 0, 100), w("MUZITHAL(KG)", 200, 100),
            w("0,822", 0, 140), w("KG", 80, 140), w("₺119,90", 200, 140), w("1", 330, 140), w("₺0,00", 380, 140), w("₺98,56", 500, 140),
            w("2 2901235", 0, 200), w("DOMATES SALKIM (KG)", 200, 200),
            w("1.0/32", 0, 240), w("KG", 80, 240), w("₺79,90", 200, 240), w("1", 330, 240), w("₺0,00", 380, 240), w("₺82,46", 500, 240),
            w("TOPLAM", 0, 320), w("₺181,02", 500, 320),
        ]
        result = parse(words)
        self.assertEqual([(i["name"], i["quantity"], i["totalPrice"]) for i in result["items"]],
                         [("MUZ ITHAL(KG)", 0.822, 98.56), ("DOMATES SALKIM (KG)", 1.032, 82.46)])
        self.assertEqual(result["total"], 181.02)


if __name__ == "__main__":
    unittest.main()
