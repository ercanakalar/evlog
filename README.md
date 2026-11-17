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

## Repository

| Path | Stack |
| --- | --- |
| [`apps/api`](apps/api) | NestJS 12, Prisma 7 (`pg` driver adapter), PostgreSQL, class-validator, Zod-validated config, JWT |
| [`apps/mobile`](apps/mobile) | Expo SDK 58, React Native 0.88, Expo Router, TanStack Query, react-hook-form + Zod |
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
cd apps/mobile && cp .env.example .env && npm install && npm start
```

Each app keeps its own `package-lock.json` on purpose: the API and the React
Native app pin different React/TypeScript toolchains and are deployed separately.
