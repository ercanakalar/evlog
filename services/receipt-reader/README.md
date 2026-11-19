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

## How it reads

1. `ocr.py` finds every word and its position (RapidOCR, PaddleOCR's models).
2. `receipt_parser.py` finds each item's quantity row (`1 ADET ₺98,90 … ₺98,90`),
   takes the name from the rows above it and checks quantity × unit price = line
   total, trying every likely reading of a misread number (the ₺ sign read as a
   digit, `0,968` read as `0.068`, `1.0/32` for `1,032`), then the sum against
   the printed total.
3. `lexicon.py` fixes letters OCR confuses in names (H/N/M, U/N, O/Q/0, 7/Y):
   `MANDALIHA` → `MANDALINA`, `MUZITHAL` → `MUZ ITHAL`, `PE7H` → `PEYN`. Only
   words close to a word in its list change; Turkish endings (`POSETI`), short
   words and unknown brands stay as read. Add common words or brands to
   `WORDS` to teach it more.

Header text above the first item (ETTN, loyalty card, column headings) and
barcodes OCR half-misread are kept out of names.

Tall photos of long receipts read best at full width; the Raf app sends them
up to 1200 px wide instead of shrinking them to 2000 px tall.

## Tests

```bash
python -m unittest discover -s tests -v      # no OCR models needed
```

## Contract

`POST /v1/receipts/parse` (multipart: `file`, `receiptId`, `kind`, `callbackUrl`,
header `Authorization: Bearer <OCR_SERVICE_TOKEN>`); see the docstring in `app.py`.

**Sync vs. async.** Returning the result straight away (HTTP 200) is what this
reader does: the phone gets the parsed receipt in the same request. A slower
reader can answer `202` immediately and later `POST` the result to `callbackUrl`
with header `X-Ocr-Secret: <OCR_CALLBACK_SECRET>`; the app polls until it arrives.

To add a model that crops the receipt first (for example YOLO), do it in
`read_receipt()` in `app.py`, before `ocr.recognize()`.
