# Evlog API (NestJS 12 · Prisma 7 · PostgreSQL)

Backend of [Evlog](../README.md). Run these commands in `apps/home-tracker/api`:

```bash
cp .env.example .env          # fill in secrets
docker compose up -d db receipt-reader    # Postgres (or use your own, database `evlog`) and the reader
npm install                   # also runs `prisma generate`
npx prisma migrate dev        # create tables
npm run db:seed               # optional demo data (demo.owner@evlog.app / Demo1234)
npm start                     # watches for changes
```

To run it in Docker instead: `docker compose up -d --build api` from the repo root
(see [Run with Docker](../../../README.md#run-with-docker)).

* API: `http://localhost:3000/api/v1` · Swagger UI: `http://localhost:3000/docs` (non-production) · Health: `/health`
* Requires Node ≥ 24.9 (NestJS 12 is ESM; Jest needs Node 24 to load it).

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Register / login, argon2id hashes, 15-min JWT access tokens, rotating refresh tokens (only a hash is stored). |
| `users` | `GET /me`: the signed-in user. `DELETE /me`: deletes the account, its files, and the homes nobody else lives in; a home with a tenant stays with the tenant, and condition photos in a home that stays are kept without a link to the person. |
| `homes` | Homes and the `HomeAccessService` that decides owner vs. tenant rights (unknown ⇒ 404, wrong role ⇒ 403). |
| `tenancies` | Owner invites with a one-time code; tenancy becomes **verified** after `RENT_RECEIPTS_TO_VERIFY` confirmed rent receipts in different months. |
| `condition-records` | Photo sessions per room. Each photo: SHA-256, device time, server time. Locking writes a content hash over all photos; then both parties confirm. Not a contract — a verification. |
| `receipts` | Upload → receipt reader → review → confirm. Duplicate images are rejected per user. |
| `ratings` | One rating per tenancy across 5 categories. Evidence is gathered server-side: condition record, rent receipts, utility / gas bills, renovation receipts. Categories without evidence are refused. |
| `listings` | Links sahibinden.com listings, grants brokers token-based read-only access, "Send update" snapshots exactly what the owner chose to share. |
| `kitchen` | Confirmed grocery receipts feed the pantry ("running low" learned from purchase gaps), price watch vs. last purchase, and anonymous market averages (hidden below 3 households). |
| `reports` | Reports about ratings, condition photos and shared listings (from users and, by share link, brokers), and the moderator endpoints that hide or restore them. |
| `appliances` | Appliances with recommended maintenance schedules, "mark as done" logs, next-due overview. |

## Validation & safety

* Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) with class-validator DTOs on every body, query and param (`ParseUUIDPipe`).
* Environment validated with Zod at boot; the app refuses to start on bad config.
* Uploads: size limit + **magic-number** type check (`file-type`), stored write-once under random keys; files are only served after an access check and are deleted with their receipt, home or account.
* Reader (OCR) responses are untrusted and validated with the same DTO rules. The callback endpoint uses a shared secret compared in constant time.
* Helmet, CORS allow-list, rate limiting (tighter on auth and uploads), Prisma errors mapped to 404/409.

## Receipt reader contract

See [`services/receipt-reader`](../../../services/receipt-reader/README.md). The API calls `POST {OCR_SERVICE_URL}/v1/receipts/parse`
with the image; reply `200` with the parsed JSON (the phone gets it in the same request)
or `202` and later `POST` the result to the `callbackUrl` with `X-Ocr-Secret`.

## sahibinden.com

sahibinden.com has no public API. Listing data is available to corporate members
through their partner programme. Until you have credentials the API runs in
**link-only** mode: links / listing numbers are validated and stored, nothing is
scraped. With `SAHIBINDEN_API_URL` and `SAHIBINDEN_API_KEY` set, `SahibindenProvider.fetch`
syncs title and price — adapt its field mapping to the contract you receive.

## Tests

```bash
npm test            # unit
npm run test:e2e    # full flow against Postgres + a fake receipt reader
```

The e2e run creates its own schema (`e2e_<timestamp>`) in the database from
`TEST_DATABASE_URL` (default `postgresql://evlog:evlog@localhost:5432/evlog`),
applies migrations with `migrate deploy`, and drops only that schema afterwards.
