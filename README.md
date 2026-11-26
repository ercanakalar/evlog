# Raf

A grocery app: scan market receipts, see where the money goes and use food before
it goes off.

* Sign in with Google or email, scan market receipts (long ones in parts), and see
  how much you spend, when, where and on which categories.
* Every product gets a countdown from a shelf-life table; mark it opened, use the
  date on the pack, or mark it used up. Reminders before things go off.
* Market lists with last prices, and "at home" counts that go up when a receipt
  has a matching product.

```
 Raf app ──▶ Raf API :3000 ──▶ PostgreSQL, database raf
             (receipt reader built in)
```

## Folder structure

```
evlog/
├── backend/                  NestJS API, port 3000, receipt reader built in
│   └── scripts/              Cloud Run setup and deploy, OCR model download
├── mobile-react-native/      Expo phone app
│   └── scripts/              Android release build, crash logs, icons, contrast check
├── docker-compose.yml        database, API and Expo for local development
├── docker-compose.apk.yml    signed Android builds and phone crash logs
└── .github/workflows/ci.yml  lint, type checks and tests for both packages
```

| Path | Stack |
| --- | --- |
| [`backend`](backend) | NestJS 12, Prisma 7 (`pg` driver adapter), PostgreSQL, Zod-validated config, JWT, Google sign-in, receipt reader on ONNX Runtime |
| [`mobile-react-native`](mobile-react-native) | Expo SDK 58, React Native 0.88, React Navigation 7, Redux Toolkit + RTK Query, i18next (EN/TR), react-hook-form + Zod, expo-camera, expo-notifications |

Each package keeps its own `package-lock.json`: they pin different React and
TypeScript toolchains and are deployed separately.

## Run with Docker

You need Docker with Compose, and Node 24 for the phone app. Run these commands
from the repository root.

### 1. Database

**Your own Postgres**: create an empty database `raf`.

**Or Postgres in Docker**: `docker compose up -d db` starts one on port 5433
(`raf` / `raf`), which is what `backend/.env.example` points at.

### 2. Settings

```bash
cp backend/.env.example backend/.env
```

With your own Postgres, set `DATABASE_URL` in it:

```
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/raf?schema=public
```

The API container uses your computer's network, so `localhost` means your
computer, as it does when you run the API with npm.

### 3. Start the API

```bash
docker compose up -d --build backend
curl localhost:3000/health
```

The API answers at `http://localhost:3000/api/v1`. The first build takes several
minutes: it downloads the receipt reader's OCR models into the image. It applies
database migrations when it starts, and fills the shelf-life table the first time.

To add a demo account (`demo@raf.app` / `Demo1234`), run the seed once with Node:

```bash
(cd backend && ONNXRUNTIME_NODE_INSTALL=skip npm install && npm run db:seed)
```

### 4. Phone app

The app runs with Expo. Point it at your computer's LAN IP (`hostname -I`, the first
address); the phone must be on the same Wi-Fi:

```bash
cd mobile-react-native
cp .env.example .env          # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000
npm install
npm run android               # builds and installs a development build, then starts Expo
```

The camera, reminders and Google sign-in need that development build; Expo Go lacks
them. Once it is installed, `npm start` (or `docker compose run --rm mobile`) is
enough. Your LAN IP changes when you join another network: update `.env` and
restart Expo with `npm start -- -c`.

To install Raf without Expo, see [Android builds](mobile-react-native/README.md#android-builds).

### Everyday commands

```bash
docker compose ps                        # what is running
docker compose logs -f backend           # follow the logs (Ctrl+C to stop)
docker compose up -d --build backend     # rebuild after changing API code
docker compose up -d backend             # pick up a changed .env
docker compose down                      # stop everything (data is kept)
```

Notes:
* Run the API either in Docker or with npm, not both: they use the same port.
* Photos uploaded through the container are kept in a Docker volume, separate from
  `backend/uploads/` used when the API runs with npm.
* `docker compose down -v` also deletes that volume and the Postgres container's data.

## Run without Docker

```bash
cd backend
cp .env.example .env && ONNXRUNTIME_NODE_INSTALL=skip npm install && npm run models
npx prisma migrate dev && npm run db:seed
npm run start:dev
```

Then start the phone app as in [step 4](#4-phone-app).

## Publish

* **API**: Cloud Run, with the database on Neon; see [On Cloud Run](backend/README.md#on-cloud-run).
* **Android app**: a signed AAB for Google Play, built in Docker or with EAS; see
  [Android builds](mobile-react-native/README.md#android-builds).

## Documentation

| Read | For |
| --- | --- |
| [backend](backend/README.md) | The API: modules, shelf life, the receipt reader, Cloud Run, tests |
| [mobile-react-native](mobile-react-native/README.md) | The phone app: screens, structure, Android builds, Google sign-in |
