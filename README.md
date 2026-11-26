# Evlog

Two home apps in one repository. Each has its own phone app, API and database.

| Product | Folder | What it is for |
| --- | --- | --- |
| **Evlog** | [`apps/home-tracker`](apps/home-tracker) | Home record, ratings, listings, kitchen and appliance upkeep, for owners and tenants |
| **Raf** | [`apps/shelf-tracker`](apps/shelf-tracker) | Grocery receipts, spending, shelf-life countdowns and market lists |

## Folder structure

```
evlog/
├── apps/
│   ├── home-tracker/               Evlog
│   │   ├── api/                    NestJS API, port 3000
│   │   └── mobile-react-native/    Expo phone app
│   └── shelf-tracker/              Raf
│       ├── raf-api/                NestJS API, port 3100, receipt reader built in
│       └── raf-mobile/             Expo phone app
├── services/
│   └── receipt-reader/             OCR service that reads Evlog's receipts, port 8000
├── deploy/
│   ├── evlog/                      Evlog on a server: HTTPS, API, receipt reader, database
│   └── raf/                        Raf on a server: HTTPS, API, database, backups
├── .github/workflows/ci.yml        lint, type checks and tests for each package
└── docker-compose.yml              databases, APIs and receipt reader for local development
```

| Path | Stack |
| --- | --- |
| [`apps/home-tracker/api`](apps/home-tracker/api) | NestJS 12, Prisma 7 (`pg` driver adapter), PostgreSQL, class-validator, Zod-validated config, JWT |
| [`apps/home-tracker/mobile-react-native`](apps/home-tracker/mobile-react-native) | Expo SDK 58, React Native 0.88, React Navigation 7, Redux Toolkit + RTK Query, i18next (EN/TR), react-hook-form + Zod |
| [`apps/shelf-tracker/raf-api`](apps/shelf-tracker/raf-api) | NestJS 12, Prisma 7, PostgreSQL, Google sign-in, receipt reader on ONNX Runtime |
| [`apps/shelf-tracker/raf-mobile`](apps/shelf-tracker/raf-mobile) | Same stack and conventions as the Evlog app, plus expo-camera and expo-notifications |
| [`services/receipt-reader`](services/receipt-reader) | FastAPI + RapidOCR (PaddleOCR models, offline and free) |

Each package keeps its own `package-lock.json` on purpose: the APIs and the phone
apps pin different React/TypeScript toolchains and are deployed separately.

```
 Evlog app ──▶ Evlog API :3000 ──▶ PostgreSQL, database evlog
                     │
                     ▼
         receipt reader :8000 (OCR, on your computer)

 Raf app ────▶ Raf API   :3100 ──▶ PostgreSQL, database raf
               (OCR built in)
```

The phone apps run with Expo on your computer; everything else can run in Docker.

## Run with Docker

You need Docker with Compose, and Node 24 for the phone apps. Run the commands in
this section from the repository root.

### 1. Databases

**Your own Postgres** (for example the one you manage in pgAdmin): create two
empty databases, `evlog` and `raf`. The APIs create their tables on start.

**Or Postgres in Docker**: `docker compose up -d db raf-db` starts Evlog's on
port 5432 (`evlog` / `evlog`) and Raf's on port 5433 (`raf` / `raf`). Stop your
own Postgres first if it already uses port 5432.

### 2. Settings

```bash
cp apps/home-tracker/api/.env.example apps/home-tracker/api/.env
cp apps/shelf-tracker/raf-api/.env.example apps/shelf-tracker/raf-api/.env
```

The examples match the Postgres containers. With your own Postgres, set
`DATABASE_URL` in each file:

```
# apps/home-tracker/api/.env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/evlog?schema=public
# apps/shelf-tracker/raf-api/.env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/raf?schema=public
```

Keep Evlog's `OCR_SERVICE_URL=http://localhost:8000`. Raf needs none: its reader is
built in. The API containers use your computer's network, so `localhost` means your
computer, as it does when you run the APIs with npm.

### 3. Start

```bash
docker compose up -d --build api raf-api    # both APIs + Evlog's receipt reader
```

| Compose service | Built from | Address | Check |
| --- | --- | --- | --- |
| `api` | `apps/home-tracker/api` | `http://localhost:3000/api/v1` | `curl localhost:3000/health` |
| `raf-api` | `apps/shelf-tracker/raf-api` | `http://localhost:3100/api/v1` | `curl localhost:3100/health` |
| `receipt-reader` | `services/receipt-reader` | `http://localhost:8000` (this computer only) | `curl localhost:8000/health` |

The first build takes several minutes: it downloads the OCR models into the
reader's and Raf's images. Later starts are quick. Each API applies its database
migrations when it starts.

To add demo accounts, run the seeds once with Node on your computer:

```bash
(cd apps/home-tracker/api && npm install && npm run db:seed)        # demo.owner@evlog.app, demo.tenant@evlog.app / Demo1234
(cd apps/shelf-tracker/raf-api && ONNXRUNTIME_NODE_INSTALL=skip npm install && npm run db:seed)    # demo@raf.app / Demo1234
```

### 4. Phone apps

The apps run with Expo, outside Docker. Point each at your computer's LAN IP
(find it with `hostname -I`, the first address); the phone must be on the same Wi-Fi.
Start each app in its own terminal:

```bash
cd apps/home-tracker/mobile-react-native
cp .env.example .env          # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000
npm install && npm start
```

```bash
cd apps/shelf-tracker/raf-mobile
cp .env.example .env          # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3100
npm install && npm start
```

Your LAN IP changes when you join another network; update both `.env` files
and restart Expo (`npm start -- -c`).

To install Raf without Expo, build its APK in Docker. This writes `build/raf.apk`
(see [Android APK with Docker](apps/shelf-tracker/raf-mobile/README.md#android-apk-with-docker)):

```bash
cd apps/shelf-tracker/raf-mobile
npm run apk -- --build-arg API_URL=http://<LAN-IP>:3100
```

### Everyday commands

```bash
docker compose ps                                     # what is running
docker compose logs -f api raf-api receipt-reader     # follow the logs (Ctrl+C to stop)
docker compose up -d --build api                      # rebuild after changing API code
docker compose up -d api                              # pick up a changed .env
docker compose down                                   # stop everything (data is kept)
```

The receipt reader's code is mounted into its container and reloads on save;
rebuild it only after changing `requirements.txt`:
`docker compose up -d --build receipt-reader`.

Notes:
* Run each API either in Docker or with npm, not both: they use the same port.
* Photos uploaded through the containers are kept in Docker volumes
  (`evlog_uploads`, `evlog_raf-uploads`), separate from the `uploads/` folder in each
  API used when it runs with npm.
* `docker compose down -v` also deletes those volumes and the Postgres containers' data.

## Run without Docker

Evlog's API needs the receipt reader; it is easiest to keep that one in Docker
(or see [its README](services/receipt-reader)).

```bash
nvm use                                                # Node 24
docker compose up -d receipt-reader
```

Evlog API:

```bash
cd apps/home-tracker/api
cp .env.example .env && npm install
npx prisma migrate dev && npm run db:seed
npm start
```

Raf API, in another terminal:

```bash
cd apps/shelf-tracker/raf-api
cp .env.example .env && ONNXRUNTIME_NODE_INSTALL=skip npm install && npm run models
npx prisma migrate dev && npm run db:seed
npm run start:dev
```

Then start the phone apps as in [step 4](#4-phone-apps).

## Documentation

| Read | For |
| --- | --- |
| [apps/home-tracker](apps/home-tracker/README.md) | What Evlog does and how its parts fit |
| [apps/home-tracker/api](apps/home-tracker/api/README.md) | Evlog API: modules, validation, reader contract, sahibinden.com, tests |
| [apps/home-tracker/mobile-react-native](apps/home-tracker/mobile-react-native/README.md) | Evlog phone app: structure and conventions |
| [apps/shelf-tracker](apps/shelf-tracker/README.md) | What Raf does and how its parts fit |
| [apps/shelf-tracker/raf-api](apps/shelf-tracker/raf-api/README.md) | Raf API: modules, shelf life, built-in reader, tests |
| [apps/shelf-tracker/raf-mobile](apps/shelf-tracker/raf-mobile/README.md) | Raf phone app: screens, structure, APK build, Google sign-in |
| [services/receipt-reader](services/receipt-reader/README.md) | How receipts and pack labels are read |
