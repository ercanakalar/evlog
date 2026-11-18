# Receipt reader (runs on your computer)

Both APIs (Evlog and Raf) send receipt photos here and store whatever comes
back. Reading is free and offline: [RapidOCR](https://github.com/RapidAI/RapidOCR)
runs PaddleOCR's Turkish models (`ocr.py`), and `receipt_parser.py` turns the
words into items, merchant, date and total.

## Run

```bash
docker compose up -d --build receipt-reader    # from the repo root
curl localhost:8000/health                     # {"status":"ok"}
docker compose logs -f receipt-reader          # one line per receipt read
```

`docker compose up api raf-api` starts it too. The first build downloads the
OCR models into the image, so the reader needs no internet afterwards. The code is
mounted into the container and reloads on save; rebuild only after changing
`requirements.txt`. A receipt takes 15–30 seconds on a CPU.

The APIs find it through their `.env`:

```
OCR_SERVICE_URL=http://localhost:8000
OCR_SERVICE_TOKEN=change-me-ocr-token
OCR_TIMEOUT_MS=90000
```

The port is only open to this computer. If an API runs elsewhere (in the cloud),
expose the reader through a tunnel (Cloudflare Tunnel, Tailscale) rather than
opening the port.

## Contract

`POST /v1/receipts/parse` (multipart: `file`, `receiptId`, `kind`, `callbackUrl`,
header `Authorization: Bearer <OCR_SERVICE_TOKEN>`); see the docstring in `app.py`.

**Sync vs. async.** Returning the result straight away (HTTP 200) is what this
reader does: the phone gets the parsed receipt in the same request. A slower
reader can answer `202` immediately and later `POST` the result to `callbackUrl`
with header `X-Ocr-Secret: <OCR_CALLBACK_SECRET>`; the app polls until it arrives.

To add a model that crops the receipt first (for example YOLO), do it in
`read_receipt()` in `app.py`, before `ocr.recognize()`.
