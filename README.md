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
| [`apps/raf-api`](apps/raf-api) | Raf backend: NestJS 12, Prisma 7, its own PostgreSQL server (`raf-db`, port 5433), Google sign-in |
| [`apps/raf-mobile`](apps/raf-mobile) | Raf app: Expo SDK 58, same stack and conventions as the Evlog app, plus expo-camera and expo-notifications |
| [`services/receipt-reader`](services/receipt-reader) | FastAPI stub that runs on your computer; plug your YOLO model into `read_receipt()` |

```
 phone ──HTTPS──▶ API ──▶ PostgreSQL
                   │ ▲
     receipt image │ │ parsed JSON (200, or 202 + callback)
                   ▼ │
           receipt reader (YOLO, your computer)
```

## Quick start

```bash
nvm use                                  # Node 24
docker compose up -d db
cd apps/api && cp .env.example .env && npm install && npx prisma migrate dev && npm run db:seed && npm run start:dev
cd services/receipt-reader && pip install -r requirements.txt && uvicorn app:app --port 8000
cd apps/mobile-react-native && cp .env.example .env && npm install && npm start
```

Raf:

```bash
docker compose up -d raf-db
cd apps/raf-api && cp .env.example .env && npm install && npx prisma migrate dev && npm run db:seed && npm run start:dev
cd apps/raf-mobile && cp .env.example .env && npm install && npm start
```

Each app keeps its own `package-lock.json` on purpose: the API and the React
Native app pin different React/TypeScript toolchains and are deployed separately.
