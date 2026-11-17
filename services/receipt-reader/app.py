"""
Receipt reader that runs on your own computer.

It speaks the HTTP contract the Evlog API expects:

    POST /v1/receipts/parse            multipart/form-data
      Authorization: Bearer <OCR_SERVICE_TOKEN>
      file          the receipt image
      receiptId     the API's id for this receipt
      kind          GROCERY | RENT | UTILITY_GAS | ...
      callbackUrl   where to POST the result when answering 202

Answer 200 with the result straight away (simplest), or 202 and POST the
result later to callbackUrl with header  X-Ocr-Secret: <OCR_CALLBACK_SECRET>.

Result body (every field optional except items):
    {
      "merchantName": "Migros",
      "issuedAt": "2026-11-15T14:32:00+03:00",
      "currency": "TRY",
      "total": 842.50,
      "items": [{"name": "SÜT 1LT", "quantity": 1, "unit": "L",
                 "unitPrice": 42.75, "totalPrice": 42.75}],
      "confidence": 0.93
    }
or, when the image cannot be read:  {"error": "Image too blurry", "items": []}
"""

import hmac
import os

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "change-me-ocr-token")
MAX_BYTES = 15 * 1024 * 1024

app = FastAPI(title="Evlog receipt reader")


def read_receipt(image: bytes, kind: str) -> dict:
    """
    Plug your YOLO + OCR pipeline in here.

    Typical flow:
      1. YOLO detects regions: merchant header, date, line items, total.
      2. OCR (e.g. PaddleOCR / Tesseract with the Turkish model) reads each region.
      3. Parse prices with Turkish formatting ("1.234,50" -> 1234.50).
    Return a dict shaped like the result body in the module docstring.
    """
    raise NotImplementedError("Connect your YOLO model here")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/receipts/parse")
async def parse(
    file: UploadFile = File(...),
    receiptId: str = Form(...),
    kind: str = Form(...),
    callbackUrl: str = Form(...),
    authorization: str | None = Header(default=None),
) -> dict:
    if not authorization or not hmac.compare_digest(authorization, f"Bearer {TOKEN}"):
        raise HTTPException(status_code=401)
    image = await file.read(MAX_BYTES + 1)
    if len(image) > MAX_BYTES:
        raise HTTPException(status_code=413)
    try:
        return read_receipt(image, kind)
    except NotImplementedError as error:
        return {"error": str(error), "items": []}
    except Exception:  # never leak a stack trace to the API
        return {"error": "Could not read this receipt", "items": []}
