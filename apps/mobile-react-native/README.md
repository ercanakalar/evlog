# Evlog mobile (Expo SDK 58 · React Native 0.88)

The one phone app: the home record, ratings, listing and upkeep (Evlog API), and a
**Groceries** tab for market receipts, the expiry countdown, lists and trips (Raf API).

```bash
cp .env.example .env      # EXPO_PUBLIC_API_URL → Evlog API, EXPO_PUBLIC_RAF_API_URL → Raf API
npm install
npm start                 # i / a, or scan the QR code
```

Both URLs must be reachable from the phone: `http://10.0.2.2:<port>` on the
Android emulator, your computer's LAN IP on a real device. Leave
`EXPO_PUBLIC_RAF_API_URL` empty to build without the Groceries tab.

The live scanner (`expo-camera`), expiry reminders (`expo-notifications`) and Google
sign-in need a development build (`npx expo run:ios|android`); Expo Go lacks some
of these modules.

Checks: `npm run typecheck`, `npm run lint`.

## Two accounts, one app

Groceries keeps its own account on the Raf API, so grocery receipts stay separate
from the home record. The first time you open the tab it asks you to connect
(Google, or email with your Evlog email filled in). Signing out of Evlog signs out
of Groceries too. Tokens are stored under separate SecureStore keys.

## Android APK with Docker

Builds an installable release APK in Docker ([Dockerfile.android](Dockerfile.android)),
with no Android Studio or Expo account:

```bash
hostname -I                                                    # this computer's LAN IP (first one)
npm run apk                                                    # -> build/evlog.apk, APIs from .env
npm run apk -- --build-arg API_URL=http://<LAN-IP>:3000 --build-arg RAF_API_URL=http://<LAN-IP>:3100
adb install -r build/evlog.apk                                 # or copy it to the phone
```

The `EXPO_PUBLIC_*` values are built into the APK, so the API URLs must be ones the
phone can reach. The APIs are plain `http://`, which release builds block by default,
so `app.json` allows it (`expo-build-properties`, `usesCleartextTraffic`); put the APIs
behind HTTPS before shipping the app to others. Only `arm64-v8a` is built by default;
add `--build-arg ABIS=arm64-v8a,armeabi-v7a,x86_64` for old phones or the emulator.
The APK is signed with the debug key: fine for installing it yourself, not for the
Play Store (use EAS for that).

## Google sign-in (Groceries)

Create OAuth client ids in Google Cloud Console (web, iOS, Android), put them in
`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` here and in `GOOGLE_CLIENT_IDS` in
`apps/raf-api/.env`. Without them the button explains that Google sign-in is not
set up yet.

## Structure

```
mobile-react-native/
├── index.ts            → registerRootComponent(App), loads i18n, holds the splash screen
├── App.tsx             → provider tree: Redux → Theme → SafeArea → NavigationContainer
└── src/
    ├── navigators/     → RootNavigator (auth / onboarding / app / groceries groups),
    │                     HomeTabNavigator (dark tab bar), GroceriesTabNavigator + GroceriesTabBar
    │                     (Overview · Shelf · Lists · Trips + scan), linking.ts, navigationRef
    ├── screens/        → home, record, ratings, upkeep, listing, receipts, onboarding,
    │                     profile/{auth, settings, legal}, groceries/<feature>
    ├── components/     → ui/ (the design kit: Card, Button, ReceiptPaper, TickBar, Segmented,
    │                     AppModal/useModal…), settings/, one folder per feature, groceries/<feature>
    ├── hooks/          → screen logic, one folder per feature (+ common/, app/)
    ├── store/
    │   ├── slices/        auth, session (selected home/role), settings, consent
    │   ├── services/      RTK Query (Evlog API): authenticationService, homeService, conditionRecordService,
    │   │                  receiptService, ratingService, upkeepService, listingService
    │   ├── groceries/     the Raf API: its own api slice (groceriesApi), auth slice, base queries,
    │   │                  auth listeners, services and thunks
    │   ├── bases/         baseQuery, baseQueryWithReauth, errorMapping, paging, responseTransform
    │   ├── middlewares/   auth, consent, persistence listeners + custom createApi (baseApi)
    │   ├── actions/       thunks: bootstrap, session (restore / sign out), receipt scanning
    │   └── adapters/      entity adapters (appliances, receipts)
    ├── services/       → SecureStore / AsyncStorage, JWT decoding, camera, usage reporting, sharing
    ├── types/          → api/, store/, screens/ (navigation params), components/, hooks/
    ├── theme/          → ThemeProvider / useTheme: light · dark, eight highlighter palettes, four font styles
    ├── i18n/           → i18next + locales (en, tr; tr is type-checked against en);
    │                     Groceries strings live in the `groceries` namespace (locales/groceries)
    ├── constants/, config/, utils/
```

## How it fits together

* **Screens are thin.** Each one calls a hook from `hooks/<feature>` and renders components.
  The hooks hold the logic: queries, mutations, forms, alerts and navigation.
* **Server state** lives in RTK Query. Every service injects endpoints into a single `baseApi`
  (`store/middlewares/createApi.ts`); Groceries services inject into `groceriesApi`
  (`store/groceries/api.ts`). Tags keep things in sync: confirming a receipt refreshes
  the tenancy verification and the ratings evidence.
* **Auth.** `baseQueryWithReauth` refreshes ahead of expiry and once more after a 401. If several
  requests need a refresh at the same time, they share one. The auth middleware mirrors tokens to
  SecureStore. Signing out clears the tokens and every cached response.
* **Persistence.** Settings, consent and the selected home are saved to AsyncStorage (debounced),
  then restored by `bootstrapApp` before the session.
* **Consent.** The usage-reporting middleware records feature names only, and only once the user
  has opted in under Settings.
* **Paging.** The receipt list is an RTK Query infinite query with a cursor. Pages are merged with
  an entity adapter.
* **Validation.** Forms use react-hook-form with Zod schemas (`utils/validation.ts`) that mirror
  the API's DTOs. Error messages are i18n keys. The API validates everything again.
* **Deep links.** `evlog://join/<code>` opens onboarding with the invite code filled in.
  Owners share this link from the Home screen. Also: `receipt/<id>`, `condition/<id>`, `settings`, …
