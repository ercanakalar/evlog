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

Reading is free and local: OCR (ocr.py) finds the words, receipt_parser.py
turns them into items. To add a YOLO model later, crop the receipt in
read_receipt() before calling recognize().
"""

import hmac
import logging
import os
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

import ocr
import receipt_parser

TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "change-me-ocr-token")
MAX_BYTES = 15 * 1024 * 1024

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load the models in the background so the first receipt isn't slow.
    threading.Thread(target=ocr.warm_up, daemon=True).start()
    yield


app = FastAPI(title="Evlog receipt reader", lifespan=lifespan)


def read_receipt(image: bytes, kind: str) -> dict:
    started = time.monotonic()
    try:
        words = ocr.recognize(image)
    except ValueError:
        return {"error": "Unsupported image format, send a JPEG or PNG", "items": []}
    result = receipt_parser.parse(words)
    logger.info(
        "Read %s receipt: %d words, %d items, total %s, confidence %s, %.1fs",
        kind, len(words), len(result["items"]), result.get("total"),
        result.get("confidence"), time.monotonic() - started,
    )
    return result


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
        return await run_in_threadpool(read_receipt, image, kind)
    except Exception:  # never leak a stack trace to the API
        logger.exception("Failed to read receipt %s", receiptId)
        return {"error": "Could not read this receipt", "items": []}
