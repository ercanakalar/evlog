# Raf (shelf tracker)

A grocery app: scan market receipts, see where the money goes and use food before
it goes off.

| Folder | What it is |
| --- | --- |
| [`raf-api`](raf-api) | NestJS API on port 3100, database `raf`, receipt reader built in |
| [`raf-mobile`](raf-mobile) | Expo phone app |

```
 raf-mobile ──▶ raf-api :3100 ──▶ PostgreSQL, database raf
                (OCR built in)
```

Raf shares no code or data with [Evlog](../home-tracker). Its reader is a TypeScript
port of [`services/receipt-reader`](../../services/receipt-reader), which it can use
instead when `OCR_SERVICE_URL` is set.

## What it does

* Sign in with Google or email, scan market receipts (long ones in parts), and see
  how much you spend, when, where and on which categories.
* Every product gets a countdown from a shelf-life table; mark it opened, use the
  date on the pack, or mark it used up. Reminders before things go off.
* Market lists with last prices, and "at home" counts that go up when a receipt
  has a matching product.

## Publish

[`store`](store) has the checklist, listing texts, Play Console answers and graphics;
[`deploy/raf`](../../deploy/raf) runs the API on a server.

## Run only Raf

With the [databases and settings](../../README.md#run-with-docker) in place, from the repository root:

```bash
docker compose up -d --build raf-api  # no other service needed
cd apps/shelf-tracker/raf-mobile
cp .env.example .env                  # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3100
npm install && npm start
```

To install it on a phone without Expo, see
[Android APK with Docker](raf-mobile/README.md#android-apk-with-docker).
