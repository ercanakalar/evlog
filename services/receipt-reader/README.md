# Receipt reader (runs on your computer)

The Evlog API sends each receipt photo here and stores whatever comes back.
`app.py` already implements the HTTP contract; put your YOLO pipeline inside
`read_receipt()`.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
OCR_SERVICE_TOKEN=change-me-ocr-token uvicorn app:app --host 0.0.0.0 --port 8000
```

Then set in `apps/api/.env`:

```
OCR_SERVICE_URL=http://<this-computer>:8000
OCR_SERVICE_TOKEN=change-me-ocr-token
```

If the API runs in the cloud and this machine is at home, expose the reader
through a tunnel (Cloudflare Tunnel, Tailscale) rather than opening a port.

**Sync vs. async.** Returning the result from `/v1/receipts/parse` (HTTP 200)
is simplest: the phone gets the parsed receipt in the same request. If reading
takes longer than `OCR_TIMEOUT_MS`, answer `202` immediately and later
`POST` the result to the `callbackUrl` you were given, with header
`X-Ocr-Secret: <OCR_CALLBACK_SECRET>`. The app polls until it arrives.
