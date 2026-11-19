"""Run from services/receipt-reader:  python -m unittest discover -s tests"""

import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from label_parser import parse_label  # noqa: E402
from receipt_parser import Word, ean_valid, find_ean  # noqa: E402

TODAY = date(2026, 11, 19)


def label(*lines: str) -> list[Word]:
    return [Word(0, 20 * len(t), 40 * i, 40 * i + 30, t) for i, t in enumerate(lines)]


def expires(*lines: str) -> str | None:
    return parse_label(label(*lines), TODAY)["expiresOn"]


class ExpiryDates(unittest.TestCase):
    def test_turkish_labels(self):
        self.assertEqual(expires("SKT: 12.03.2027"), "2027-03-12")
        self.assertEqual(expires("TETT 05/01/27"), "2027-01-05")
        self.assertEqual(expires("S.K.T. 28-02-2027"), "2027-02-28")
        self.assertEqual(expires("Son Tüketim Tarihi: 01.12.2026"), "2026-12-01")
        self.assertEqual(expires("Tav. Ed. Tük. Tar. 11/2027"), "2027-11-30")

    def test_the_production_date_beside_it_is_not_taken(self):
        self.assertEqual(expires("ÜT: 01.11.2026  SKT: 15.11.2026"), "2026-11-15")
        self.assertEqual(expires("ÜRT 10.10.2026", "TETT 10.04.2027"), "2027-04-10")
        # Unlabelled: the later date is the expiry, the production one is skipped.
        self.assertEqual(expires("Üretim 02.11.2026", "09.11.2026"), "2026-11-09")
        self.assertEqual(expires("12.11.2026 26.11.2026"), "2026-11-26")

    def test_imported_packs(self):
        self.assertEqual(expires("EXP 2027-06-30"), "2027-06-30")
        self.assertEqual(expires("BEST BEFORE 06.2028"), "2028-06-30")

    def test_ocr_noise_in_the_separators(self):
        self.assertEqual(expires("SKT 12,03,2027"), "2027-03-12")
        self.assertEqual(expires("SKT 12. 03. 2027"), "2027-03-12")

    def test_no_date(self):
        self.assertIsNone(expires("PINAR LABNE 400 g"))
        # A price or a weight is not a date.
        self.assertIsNone(expires("NET 400 GR", "₺279,90"))

    def test_barcode_on_the_label(self):
        self.assertEqual(parse_label(label("8 690565 007679", "SKT 12.03.2027"), TODAY)["barcode"], None)
        self.assertEqual(parse_label(label("8690565007679", "SKT 12.03.2027"), TODAY)["barcode"], "8690565007679")


class Barcodes(unittest.TestCase):
    def test_check_digit(self):
        self.assertTrue(ean_valid("8690565007679"))
        self.assertTrue(ean_valid("80176800"))
        self.assertFalse(ean_valid("8690565007678"))

    def test_found_in_receipt_text(self):
        self.assertEqual(find_ean("17 8690565007679 PINAR LABNE 2X400GR"), "8690565007679")
        self.assertEqual(find_ean("19 80176800 NUTELLA 750GR"), "80176800")
        self.assertEqual(find_ean("2901241 MUZ ITHAL (KG)"), None)  # store code of weighed produce

    def test_letters_for_digits_and_one_misread_digit(self):
        self.assertEqual(find_ean("869O565OO7679 PINAR"), "8690565007679")
        self.assertEqual(find_ean("21 8092971429410 ICIM KEFIR"), "8692971429410")

    def test_a_repair_can_pick_the_wrong_digit(self):
        # The check digit cannot always tell which digit was misread: here the
        # last one was, and another single swap also gives a valid code. Matches
        # from barcodes are therefore shown to the user, never applied silently.
        self.assertNotEqual(find_ean("8690565007670"), "8690565007679")

    def test_too_few_digits_is_not_a_barcode(self):
        self.assertIsNone(find_ean("PINAR LABNE 2X400GR"))
        self.assertIsNone(find_ean("4100,53"))
