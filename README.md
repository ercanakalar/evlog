# Evlog

A home app for **owners and tenants**.

**Part 1 — Home record, ratings & listings**
* The owner (or tenant) photographs every room; photos are time-stamped,
  hashed and locked, and both sides confirm. It is a verification, not a contract.
* Tenants rate the home, neighbourhood, infrastructure, heating efficiency and
  renovations — each score must be backed by receipts (rent, utility, gas,
  renovation) or the confirmed condition record.
* Owners link their sahibinden.com listing and share chosen, verified data with
  real-estate brokers.

**Part 2 — Kitchen, market data & appliances**
* Scan grocery receipts: items and prices are added, "running low" is learned,
  prices are compared with your last receipt and with anonymous market averages.
* Appliance upkeep: maintenance schedules, reminders, invoices.

**Raf — grocery receipts** (separate app, own API and database)
* Sign in with Google or email, scan market receipts (long ones in parts), and see
  how much you spend, when, where and on which categories.
* Every product gets a countdown from a shelf-life table; mark it opened, use the
  date on the pack, or mark it used up. Reminders before things go off.
* Market lists with last prices, and "at home" counts that go up when a receipt
  has a matching product.

## Repository

| Path | Stack |
| --- | --- |
| [`apps/api`](apps/api) | NestJS 12, Prisma 7 (`pg` driver adapter), PostgreSQL, class-validator, Zod-validated config, JWT |
| [`apps/mobile-react-native`](apps/mobile-react-native) | Expo SDK 58, React Native 0.88, React Navigation 7, Redux Toolkit + RTK Query, i18next (EN/TR), react-hook-form + Zod |
| [`apps/raf-api`](apps/raf-api) | Raf backend: NestJS 12, Prisma 7, its own PostgreSQL database (`raf`), Google sign-in |
| [`apps/raf-mobile`](apps/raf-mobile) | Raf app: Expo SDK 58, same stack and conventions as the Evlog app, plus expo-camera and expo-notifications |
| [`services/receipt-reader`](services/receipt-reader) | FastAPI + RapidOCR (PaddleOCR models, offline and free): reads receipt photos for both APIs |

```
 Evlog app ──▶ Evlog API :3000 ──▶ PostgreSQL, database evlog
                     │
                     ▼
         receipt reader :8000 (OCR, on your computer)
                     ▲
                     │
 Raf app ────▶ Raf API   :3100 ──▶ PostgreSQL, database raf
```

The phone apps run with Expo on your computer; everything else can run in Docker.

## Run with Docker

You need Docker with Compose, and Node 24 for the phone apps. The APIs and the
receipt reader run in containers; Postgres can be your own (recommended if you
already have one) or a container.

### 1. Databases

**Your own Postgres** (for example the one you manage in pgAdmin): create two
empty databases, `evlog` and `raf`. The APIs create their tables on start.

**Or Postgres in Docker**: `docker compose up -d db raf-db` starts Evlog's on
port 5432 (`evlog` / `evlog`) and Raf's on port 5433 (`raf` / `raf`). Stop your
own Postgres first if it already uses port 5432.

### 2. Settings

```bash
cp apps/api/.env.example apps/api/.env
cp apps/raf-api/.env.example apps/raf-api/.env
```

Set `DATABASE_URL` in each file. With your own Postgres:

```
# apps/api/.env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/evlog?schema=public
# apps/raf-api/.env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/raf?schema=public
```

The examples already match the Postgres containers. Keep `OCR_SERVICE_URL=http://localhost:8000`.
The containers use your computer's network, so `localhost` means your computer, as it
does when you run the APIs with npm.

### 3. Start

```bash
docker compose up -d --build api raf-api    # both APIs + the receipt reader
```

| Service | Address | Check |
| --- | --- | --- |
| Evlog API | `http://localhost:3000/api/v1` | `curl localhost:3000/health` |
| Raf API | `http://localhost:3100/api/v1` | `curl localhost:3100/health` |
| Receipt reader | `http://localhost:8000` (this computer only) | `curl localhost:8000/health` |

The first build takes several minutes: it downloads the OCR models into the
reader's image. Later starts are quick. Each API applies its database migrations when
it starts. To add demo accounts, run the seed once with Node on your computer:
`cd apps/api && npm install && npm run db:seed` (`demo.owner@evlog.app` / `Demo1234`),
and the same in `apps/raf-api` (`demo@raf.app` / `Demo1234`).

### 4. Phone apps

The apps run with Expo, outside Docker. Point each at your computer's LAN IP
(find it with `hostname -I`); the phone must be on the same Wi-Fi.

```bash
cd apps/mobile-react-native && cp .env.example .env    # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000
npm install && npm start

cd apps/raf-mobile && cp .env.example .env             # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3100
npm install && npm start
```

Your LAN IP changes when you join another network; update both `.env` files
and restart Expo (`npm start -- -c`).

To install Raf without Expo, build its APK in Docker:
`cd apps/raf-mobile && npm run apk -- --build-arg API_URL=http://<LAN-IP>:3100`
writes `build/raf.apk` (see [apps/raf-mobile/README.md](apps/raf-mobile/README.md#android-apk-with-docker)).

### Everyday commands

```bash
docker compose ps                                     # what is running
docker compose logs -f api raf-api receipt-reader     # follow the logs (Ctrl+C to stop)
docker compose up -d --build api                      # rebuild after changing API code
docker compose restart api                            # pick up a changed apps/api/.env
docker compose down                                   # stop everything (data is kept)
```

The receipt reader's code is mounted into its container and reloads on save;
rebuild it only after changing `requirements.txt`:
`docker compose up -d --build receipt-reader`.

Notes:
* Run each API either in Docker or with npm, not both: they use the same port.
* Photos uploaded through the containers are kept in Docker volumes
  (`evlog_uploads`, `evlog_raf-uploads`), separate from `apps/*/uploads` used when the APIs run with npm.
* `docker compose down -v` also deletes those volumes and the Postgres containers' data.

## Run without Docker

```bash
nvm use                                                # Node 24
docker compose up -d receipt-reader                    # or see services/receipt-reader
cd apps/api && cp .env.example .env && npm install && npx prisma migrate dev && npm run db:seed && npm start
cd apps/raf-api && cp .env.example .env && npm install && npx prisma migrate dev && npm run db:seed && npm run start:dev
```

Then start the phone apps as in [step 4](#4-phone-apps).

Each app keeps its own `package-lock.json` on purpose: the API and the React
Native app pin different React/TypeScript toolchains and are deployed separately.
