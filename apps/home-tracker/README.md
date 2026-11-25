# Evlog (home tracker)

A home app for **owners and tenants**.

| Folder | What it is |
| --- | --- |
| [`api`](api) | NestJS API on port 3000, database `evlog` |
| [`mobile-react-native`](mobile-react-native) | Expo phone app |

Receipts are read by the separate [receipt reader](../../services/receipt-reader) on port 8000.

```
 mobile-react-native ──▶ api :3000 ──▶ PostgreSQL, database evlog
                           │
                           ▼
              services/receipt-reader :8000
```

## What it does

**Home record, ratings and listings**
* The owner (or tenant) photographs every room; photos are time-stamped,
  hashed and locked, and both sides confirm. It is a verification, not a contract.
* Tenants rate the home, neighbourhood, infrastructure, heating efficiency and
  renovations. Each score must be backed by receipts (rent, utility, gas,
  renovation) or the confirmed condition record.
* Owners link their sahibinden.com listing and share chosen, verified data with
  real-estate brokers.

**Kitchen, market data and appliances**
* Scan grocery receipts: items and prices are added, "running low" is learned,
  prices are compared with your last receipt and with anonymous market averages.
* Appliance upkeep: maintenance schedules, reminders, invoices.

## Run only Evlog

With the [databases and settings](../../README.md#run-with-docker) in place, from the repository root:

```bash
docker compose up -d --build api      # Evlog API + receipt reader
cd apps/home-tracker/mobile-react-native
cp .env.example .env                  # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000
npm install && npm start
```

## Run it on a server

See [`deploy/evlog`](../../deploy/evlog): HTTPS, API, receipt reader, database, backups and moderation.
