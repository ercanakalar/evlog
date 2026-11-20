"""
Local OCR: RapidOCR runs PaddleOCR's PP-OCRv6 models (Turkish) on ONNX Runtime.
Free and offline; the models are downloaded into the image when it is built.
"""

import threading

import cv2
import numpy as np
from rapidocr import OCRVersion, RapidOCR
from rapidocr.utils.typings import ModelType

from receipt_parser import Word, words_from_ocr

PARAMS = {
    # Receipts are photographed upright. The text-line orientation check flips
    # some lines upside down, which turns prices into nonsense ("₺98,90" -> "06'86").
    "Global.use_cls": False,
    # The default (2000) would shrink the enlarged image back down.
    "Global.max_side_len": 4000,
    "Global.log_level": "warning",
    "Det.ocr_version": OCRVersion.PPOCRV6,
    "Det.model_type": ModelType.MEDIUM,
    "Rec.ocr_version": OCRVersion.PPOCRV6,
    "Rec.model_type": ModelType.MEDIUM,
    "Rec.lang_type": "tr",
}

_engine: RapidOCR | None = None
_lock = threading.Lock()


def engine() -> RapidOCR:
    global _engine
    with _lock:
        if _engine is None:
            _engine = RapidOCR(params=PARAMS)
        return _engine


def warm_up() -> None:
    """RapidOCR loads (and downloads) its models on the first image, so read one."""
    img = np.full((160, 900, 3), 255, np.uint8)
    cv2.putText(img, "TOPLAM 12,50", (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 2.5, (0, 0, 0), 5)
    ocr = engine()
    with _lock:
        ocr(img)


def decode(image: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(image, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Not a readable image")
    return img


def evened(img: np.ndarray) -> np.ndarray:
    """
    Evens out the lighting and boosts contrast: glare on a shiny pack and
    dark print on a dark or colourful carton otherwise leave no readable text.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    background = cv2.GaussianBlur(gray, (0, 0), sigmaX=max(gray.shape) / 30)
    flat = cv2.divide(gray, background, scale=200)
    sharp = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(flat)
    return cv2.cvtColor(sharp, cv2.COLOR_GRAY2BGR)


def label_views(img: np.ndarray):
    """
    Ways to look at a pack photo, most likely first. Dates are printed at
    any angle (lids, can bottoms, box sides); the text-direction check is off
    for receipts because it flips some receipt lines, so turns are tried here.
    """
    yield "as taken", img
    yield "upside down", cv2.rotate(img, cv2.ROTATE_180)
    yield "evened lighting", evened(img)
    yield "turned right", cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    yield "turned left", cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    yield "evened, upside down", cv2.rotate(evened(img), cv2.ROTATE_180)


def recognize_array(img: np.ndarray) -> list[Word]:
    """Like recognize(), for an image already decoded."""
    _, buf = cv2.imencode(".png", img)
    return recognize(buf.tobytes())


def recognize(image: bytes) -> list[Word]:
    """Returns every word found in the image with its position."""
    img = cv2.imdecode(np.frombuffer(image, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Not a readable image")
    long_side = max(img.shape[:2])
    # Receipt text is small in a phone photo; it reads far better enlarged
    # (2x, within max_side_len). The app sends photos of at most 2000px.
    scale = min(2.0, 4000 / long_side)
    if scale > 1.05:
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    ocr = engine()
    with _lock:  # one receipt at a time; OCR already uses every CPU core
        result = ocr(img)
    if result.boxes is None:
        return []
    return words_from_ocr(result.boxes, result.txts, result.scores)
