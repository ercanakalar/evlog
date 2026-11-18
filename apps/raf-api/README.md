# Raf API (NestJS 12 · Prisma 7 · PostgreSQL)

Backend for **Raf**, the grocery app: scan market receipts, see how much you
spend and where, count down to when each product goes off, keep market lists
and count what you have at home.

```bash
cp .env.example .env          # fill in secrets
docker compose up -d raf-db   # from the repo root: Raf's own Postgres server on port 5433
npm install                   # also runs `prisma generate`
npx prisma migrate dev        # create tables
npm run db:seed               # shelf-life table + demo account (demo@raf.app / Demo1234)
npm run start:dev
```

* API: `http://localhost:3100/api/v1` · Swagger UI: `http://localhost:3100/docs` (non-production) · Health: `/health`
* Requires Node ≥ 24.9 (NestJS 12 is ESM; Jest needs Node 24 to load it).
* Raf has its **own database server** (`raf-db`); it shares nothing with the Evlog API
  except the receipt reader in `services/receipt-reader`.
* On first boot the API fills an empty shelf-life table itself; `SEED_DEMO=false npm run db:seed`
  updates the table without adding the demo account.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Sign up / log in with email (argon2id) or **Google** (ID token checked with Google, audience must be one of `GOOGLE_CLIENT_IDS`). A Google sign-in with the email of an existing account links to it. 15-min JWT access tokens, rotating refresh tokens. |
| `users` | `GET /me` (profile, settings, category and market counts), `PATCH /me/settings`, `DELETE /me`. |
| `products` | The shelf-life reference table and the matcher that turns `TAM YAGLI SUT 1L` into *Whole milk 1 L · Dairy & eggs · 7 days (3 once opened)*. Longest keyword wins; lines it cannot place are flagged for the user to check. |
| `receipts` | Upload one photo, or several for a **long receipt** (parts are read and joined, overlapping lines kept once) → receipt reader → review → save. A saved receipt is a *trip*: market, date, total. Lists filter by market and date. |
| `items` | The shelf: every product from saved receipts with `daysLeft` / `totalDays`. Marking a product opened shortens its countdown; the date printed on the pack can replace the estimate; used-up products leave the shelf. Each product shows its purchase history. |
| `home-items` | "At home" counts. When a saved receipt has a line whose name matches (every word of the home item starts a word of the line, clean or raw name), the count goes up by the packs bought. |
| `lists` | Market lists, each item with the last price paid for a matching product; plus home items running low (count ≤ 1) as suggestions. |
| `insights` | Home screen (this month vs. the same day last month, use-soon products, last trip) and spending (monthly totals, by category, by market) in the phone's UTC offset. |

## Shelf life

`src/products/shelf-life.data.ts` holds the reference table (Turkish and English keywords,
category, storage, days unopened and opened), seeded into the `ShelfLife` table.
Values are typical keeping times in the style of the USDA FoodKeeper tables:
estimates the user can override with the date on the pack. Add a row and re-run
`npm run db:seed` to teach Raf a new product.

## Receipt reader contract

Same reader and contract as Evlog (`services/receipt-reader`), always with
`kind=GROCERY`. Single-photo receipts may be answered later via the callback;
long receipts need the reader to answer each part with `200`.

## Tests

```bash
npm test            # unit: product matcher, long-receipt merge, reader payload parsing
npm run test:e2e    # full flow against Postgres + a fake receipt reader
```

The e2e run creates its own schema (`e2e_<timestamp>`) in the database from
`TEST_DATABASE_URL` (default `postgresql://raf:raf@localhost:5433/raf`), applies
migrations, seeds the shelf-life table, and drops only that schema afterwards.
