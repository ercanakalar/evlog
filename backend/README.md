# Raf API (NestJS 12 · Prisma 7 · PostgreSQL)

Backend for [Raf](../README.md), the grocery app: scan market receipts, see how much you
spend and where, count down to when each product goes off, keep market lists
and count what you have at home. Run these commands in `backend`:

```bash
cp .env.example .env          # fill in secrets
docker compose up -d db       # port 5433, or use your own Postgres (database `raf`)
ONNXRUNTIME_NODE_INSTALL=skip npm install   # also runs `prisma generate`; skips the GPU libraries
npm run models                # the receipt reader's OCR models (135 MB, once)
npx prisma migrate dev        # create tables
npm run db:seed               # shelf-life table + demo account (demo@raf.app / Demo1234)
npm run start:dev
```

To run it in Docker instead: `docker compose up -d --build backend` from the repository root
(see [Run with Docker](../README.md#run-with-docker)).

* API: `http://localhost:3000/api/v1` · Swagger UI: `http://localhost:3000/docs` (non-production) · Health: `/health` (with the database), `/health/live` (the API alone)
* Requires Node ≥ 24.9 (NestJS 12 is ESM; Jest needs Node 24 to load it).
* A hosted database (such as Neon) works; keep the API close to it. Saving a long
  receipt is about 80 queries: instant in the same region, 13 s at 160 ms away.
  Never run `prisma migrate dev` against it (it can reset the database);
  `prisma migrate deploy` is safe; it runs when the Docker container starts, and as a
  job before each Cloud Run deploy. `prisma.config.ts` migrates over Neon's direct
  address, not the pooled one.
* On first boot the API fills an empty shelf-life table itself; `SEED_DEMO=false npm run db:seed`
  updates the table without adding the demo account.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Sign up / log in with email (argon2id) or **Google** (ID token checked with Google, audience must be one of `GOOGLE_CLIENT_IDS`). A Google sign-in with the email of an existing account links to it. Linking takes away a password set before the address was verified, so nobody can sign up with someone else's address and stay in the account. 15-min JWT access tokens, rotating refresh tokens (a replaced one works for another minute, for phones that lost the answer). Passwords are reset with an 8-digit code by email (`SMTP_URL`). |
| `users` | `GET /me` (profile, settings, category and market counts), `PATCH /me/settings`, `DELETE /me`. |
| `households` | People who live together share one household: its receipts, shelf, at-home counts, lists and spending (settings stay personal). Everyone has one, at first alone. `POST /household/invite` makes a code (`K7PM-4QXR`, one person, 24 h); `POST /household/join` with it moves the joiner's data in, adding at-home counts of the same product together (only someone living alone can join). `POST /household/leave` gives the person a new, empty household and leaves the shared data with the others. A receipt says who scanned it (`scannedBy`); one that repeats a receipt already in the household (same total and day, and the same minute or `FİŞ NO`) links to it in `duplicateOf`, and the app warns before saving it twice. |
| `events` | Live updates at `wss://…/api/v1/events` (subprotocols `raf` and the access token). After each change a member makes, and when a receipt is read, the household's apps get `{"type":"changed","tags":[…]}` with the cached data to fetch again. Instances share events through Postgres `LISTEN`/`NOTIFY`, so it needs a direct (not pooled) database connection. |
| `products` | The shelf-life reference table and the matcher that turns `TAM YAGLI SUT 1L` into *Whole milk 1 L · Dairy & eggs · 7 days (3 once opened)*. Longest keyword wins; lines it cannot place are flagged for the user to check. It also reads the **brand** (`SUTAS AYRAN 1000ML` → Sütaş, from the brand table kept in line with `brands.data.ts` on start) and the **pack size** (1000 ml), stored on each receipt line. |
| `receipts` | Upload one photo, or several for a **long receipt** (parts are read and joined, overlapping lines kept once) → read in the background (the app polls; unfinished ones are taken up again after a restart, at most 3 per person) → review → save. Product names are in the app's language (`Accept-Language`, kept on the receipt). `?unsaved=true` lists what is not saved yet. On review, each line has a checkbox, checked by default: a checked product gets a countdown on the shelf and is counted at home, and if no at-home product matches it one is added (named without the pack size; not for lines the reader could not place until the user confirms them). Unchecked products stay on the receipt only. A trash button removes a line the reader got wrong. A saved receipt is a *trip*: market, date, total, which is what spending counts whatever was switched on. Lists filter by market and date. |
| `legal` | `/privacy`, `/terms` and `/delete-account` in Turkish and English (`?lang=`), for the app and the store listing. Filled in from `LEGAL_OPERATOR` and `SUPPORT_EMAIL`. |
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
are read one at a time, pack labels before waiting receipts.

| File | What it does |
| --- | --- |
| `image.ts` | Decodes (sharp), resizes, straightens and evens out photos, like OpenCV does |
| `contours.ts`, `ocr.ts` | Find the lines of text and read them |
| `receipt-parser.ts` | Words → items, checked with quantity × price = total |
| `lexicon.ts`, `barcode.ts` | Fix letters in names and digits in barcodes |
| `label-parser.ts` | The expiry date on a pack |
| `reader.service.ts` | The queue; restarts the process after a crash or a photo that takes too long |

`OCR_THREADS` limits the CPU it uses. Plan for about 1 GB of memory.

How a receipt is read:

1. `ocr.ts` finds every word and its position.
2. `receipt-parser.ts` finds each item's quantity row (`1 ADET ₺98,90 … ₺98,90`), takes the
   name from the rows above it and checks quantity × unit price = line total, trying every
   likely reading of a misread number (the ₺ sign read as a digit, `0,968` read as `0.068`),
   then the sum against the printed total. Header text above the first item (ETTN, loyalty
   card, column headings) is kept out of names.
3. `lexicon.ts` fixes letters OCR confuses in names (H/N/M, U/N, O/Q/0, 7/Y): `MANDALIHA` →
   `MANDALINA`. Only words close to a word in its list change; Turkish endings, short words
   and unknown brands stay as read.
4. `barcode.ts` keeps the EAN-13 / EAN-8 printed beside an item when its check digit is right,
   and repairs one misread digit when only one repair fits.

Pack labels (`label-parser.ts`): the date labelled SKT / TETT / S.K.T. / EXP / BEST BEFORE,
never the production date (ÜT / ÜRT / ÜRETİM / PROD) beside it; without a label, the latest
date. Accepts 15.03.2027, 15/03/27, 15 03 2027, 150327 after SKT / TETT, 15 MAR 2027 /
15.OCA.27 (Turkish and English months), 03/2027 (end of month) and 2027-03-15. A photo with
no date is read again upside down, with the lighting evened out and turned 90°.

## A separate reader

With `OCR_SERVICE_URL` set, the API sends photos to a separate reader instead, with
`OCR_SERVICE_TOKEN` as a bearer token. The contract is in `src/receipts/ocr.client.ts`:
`POST /v1/receipts/parse` (multipart `file`, `receiptId`, `kind=GROCERY`, `callbackUrl`)
answers `200` with the result, or `202` and later posts it to `callbackUrl` with
`X-Ocr-Secret: <OCR_CALLBACK_SECRET>`. Long receipts need `200` for each part.
`POST /v1/labels/parse` reads pack labels.

## On Cloud Run

The API runs on Cloud Run with its receipt reader, receipt photos in a Cloud Storage
bucket mounted at `/mnt/uploads`, and the database on Neon. You need the
[gcloud CLI](https://cloud.google.com/sdk/docs/install) signed in (`gcloud auth login`)
and Docker.

```bash
cp .env.production.example .env.production   # fill it in; it is not committed
./scripts/setup-project.sh                   # once per project: APIs, registry, bucket, signing key, IAM
./scripts/deploy-manual.sh                   # every release
```

The deploy builds one image (tagged with the commit), runs `prisma migrate deploy` with it
as the Cloud Run job `JOB`, then rolls the service `SERVICE` onto it, and checks `/health`.
`DATABASE_URL` and `SMTP_URL` go from `.env.production` into Secret Manager, and a changed
value there gets a new version on the next deploy. `JWT_ACCESS_SECRET` is generated once and
never written down; replacing it signs everybody out.

It stops before building anything when a setting the API needs in production is missing:
`MAIL_FROM`, `LEGAL_OPERATOR`, `SUPPORT_EMAIL`, and the two secrets. `PUBLIC_API_URL`
defaults to the service's Cloud Run address, which is also what the app's
`EXPO_PUBLIC_API_URL` should be.

The service has 2 CPUs and 4 GiB by default (`CPU`, `MEMORY`; the reader, the API and the
bucket mount share the memory, and 2 GiB runs out while reading), scales from 0 to 2 instances
(`MIN_INSTANCES`, `MAX_INSTANCES`), and keeps its CPU on between requests, because receipts
are read after the upload has been answered. Receipts being read when an instance stops are
taken up again at the next start. The first request after an idle spell waits for the API
to start.

Check these in a browser; the store listing links to them:
`<address>/privacy`, `/terms` and `/delete-account` (`?lang=tr` for Turkish).

In production the API does not start with example secrets, or without email and legal
settings. Request limits count per user, and per email and address when signing in, because
mobile carriers put many phones behind one address.

### Deletion requests by email

People without the app write to `SUPPORT_EMAIL` (see `/delete-account`). Check that the
message comes from the account's own address, then send a password reset code to that
address and let them delete the account in the app: that removes their photos too.

## Tests

```bash
npm test            # unit: product matcher, long-receipt merge, the receipt reader
npm run test:e2e    # full flow against Postgres + a fake receipt reader
```

The e2e run creates its own schema (`e2e_<timestamp>`) in the database from
`TEST_DATABASE_URL` (default `postgresql://raf:raf@localhost:5433/raf`), applies
migrations, seeds the shelf-life table, and drops only that schema afterwards.
