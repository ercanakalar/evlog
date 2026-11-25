# Raf API (NestJS 12 · Prisma 7 · PostgreSQL)

Backend for [Raf](../README.md), the grocery app: scan market receipts, see how much you
spend and where, count down to when each product goes off, keep market lists
and count what you have at home. Run these commands in `apps/shelf-tracker/raf-api`:

```bash
cp .env.example .env          # fill in secrets
docker compose up -d raf-db   # port 5433, or use your own Postgres (database `raf`)
ONNXRUNTIME_NODE_INSTALL=skip npm install   # also runs `prisma generate`; skips the GPU libraries
npm run models                # the receipt reader's OCR models (135 MB, once)
npx prisma migrate dev        # create tables
npm run db:seed               # shelf-life table + demo account (demo@raf.app / Demo1234)
npm run start:dev
```

To run it in Docker instead: `docker compose up -d --build raf-api` from the repo root
(see [Run with Docker](../../../README.md#run-with-docker)).

* API: `http://localhost:3100/api/v1` · Swagger UI: `http://localhost:3100/docs` (non-production) · Health: `/health` (with the database), `/health/live` (the API alone)
* Requires Node ≥ 24.9 (NestJS 12 is ESM; Jest needs Node 24 to load it).
* Raf has its **own database** (`raf`) and its own receipt reader (below); it
  shares nothing with the Evlog API.
* A hosted database (such as Neon) works; keep the API close to it. Saving a long
  receipt is about 80 queries: instant in the same region, 13 s at 160 ms away.
  Never run `prisma migrate dev` against it (it can reset the database);
  `prisma migrate deploy` is safe and runs when the container starts.
* On first boot the API fills an empty shelf-life table itself; `SEED_DEMO=false npm run db:seed`
  updates the table without adding the demo account.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Sign up / log in with email (argon2id) or **Google** (ID token checked with Google, audience must be one of `GOOGLE_CLIENT_IDS`). A Google sign-in with the email of an existing account links to it. Linking takes away a password set before the address was verified, so nobody can sign up with someone else's address and stay in the account. 15-min JWT access tokens, rotating refresh tokens. |
| `users` | `GET /me` (profile, settings, category and market counts), `PATCH /me/settings`, `DELETE /me`. |
| `products` | The shelf-life reference table and the matcher that turns `TAM YAGLI SUT 1L` into *Whole milk 1 L · Dairy & eggs · 7 days (3 once opened)*. Longest keyword wins; lines it cannot place are flagged for the user to check. It also reads the **brand** (`SUTAS AYRAN 1000ML` → Sütaş, from the brand table kept in line with `brands.data.ts` on start) and the **pack size** (1000 ml), stored on each receipt line. |
| `receipts` | Upload one photo, or several for a **long receipt** (parts are read and joined, overlapping lines kept once) → receipt reader → review → save. On review, each line has a checkbox, checked by default: a checked product gets a countdown on the shelf and is counted at home, and if no at-home product matches it one is added (named without the pack size; not for lines the reader could not place until the user confirms them). Unchecked products stay on the receipt only. A trash button removes a line the reader got wrong. A saved receipt is a *trip*: market, date, total, which is what spending counts whatever was switched on. Lists filter by market and date. |
| `items` (labels) | `POST /items/:id/label`: a photo of the pack is read by the receipt reader and the printed use-by / best-before date replaces the estimate (the photo is not kept). Receipt lines keep the barcode printed beside them, so the app can match a scanned pack to its line. |
| `items` (shelf) | The shelf: every product from saved receipts with `daysLeft` / `totalDays`. Marking a product opened shortens its countdown; the date printed on the pack can replace the estimate; used-up products leave the shelf and lower the matching at-home counts; anything that reaches 0 goes on the first market list (one is made if there is none). Each product shows its brand, pack size and purchase history. |
| `home-items` | "At home" counts. When a saved receipt has a line whose name matches (every word of the home item starts a word of the line, clean or raw name), the count goes up by the packs bought. `GET /home-items/:id` (and each item in the list) splits what is at home by brand and pack size (`variants`: Sütaş 1000 ml × 1, Sütaş 250 ml × 2), from what receipts added less what was used up. New products start at 1. Using a product up puts whatever runs out on the first market list; when the user lowers a count to 0 the app asks, then `POST /home-items/:id/shopping-list` adds it. Either way it is skipped if already on a list and not bought yet. |
| `lists` | Market lists, each item with the last price paid for a matching product; plus home items running low (count ≤ 1) as suggestions. |
| `insights` | Home screen (this month vs. the same day last month, use-soon products, last trip) and spending (monthly totals, by category, by market) in the phone's UTC offset. |

## Shelf life

`src/products/shelf-life.data.ts` holds the reference table (Turkish and English keywords,
category, storage, days unopened and opened), seeded into the `ShelfLife` table.
Values are typical keeping times in the style of the USDA FoodKeeper tables:
estimates the user can override with the date on the pack. Add a row and re-run
`npm run db:seed` to teach Raf a new product.

## Receipt reader

Built in (`src/reader`), free and offline: PaddleOCR's PP-OCRv6 models run on ONNX
Runtime, with its usage reporting turned off. A receipt takes about 15 seconds on a
CPU, in a process of its own (`reader.process.ts`) so the API stays responsive; photos
are read one at a time.

| File | What it does |
| --- | --- |
| `image.ts` | Decodes (sharp), resizes, straightens and evens out photos, like OpenCV does |
| `contours.ts`, `ocr.ts` | Find the lines of text and read them |
| `receipt-parser.ts` | Words → items, checked with quantity × price = total |
| `lexicon.ts`, `barcode.ts` | Fix letters in names and digits in barcodes |
| `label-parser.ts` | The expiry date on a pack |
| `reader.service.ts` | The queue; restarts the process after a crash or a photo that takes too long |

It is a port of [`services/receipt-reader`](../../../services/receipt-reader/README.md),
whose README explains how receipts are read.
`OCR_THREADS` limits the CPU it uses. Plan for about 1 GB of memory.

## A separate reader

With `OCR_SERVICE_URL` set, the API uses a separate reader instead.

Same reader and contract as Evlog ([`services/receipt-reader`](../../../services/receipt-reader/README.md)), always with
`kind=GROCERY`. Single-photo receipts may be answered later via the callback;
long receipts need the reader to answer each part with `200`.

## Tests

```bash
npm test            # unit: product matcher, long-receipt merge, the receipt reader
npm run test:e2e    # full flow against Postgres + a fake receipt reader
```

The e2e run creates its own schema (`e2e_<timestamp>`) in the database from
`TEST_DATABASE_URL` (default `postgresql://raf:raf@localhost:5433/raf`), applies
migrations, seeds the shelf-life table, and drops only that schema afterwards.
