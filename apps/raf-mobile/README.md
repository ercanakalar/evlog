# Raf mobile (Expo SDK 58 · React Native 0.88)

The phone app for Raf: scan market receipts, follow how long each product
lasts, keep market lists, count what is at home and see where the money goes.

```bash
cp .env.example .env      # EXPO_PUBLIC_API_URL → the Raf API (port 3100)
npm install
npm start                 # i / a, or scan the QR code
```

`EXPO_PUBLIC_API_URL` must be reachable from the phone: `http://10.0.2.2:3100` on the
Android emulator, your computer's LAN IP on a real device.

The live scanner (`expo-camera`), reminders (`expo-notifications`) and Google
sign-in need a development build (`npx expo run:ios|android`); Expo Go lacks some
of these modules.

Checks: `npm run typecheck`, `npm run lint`.

## Android APK with Docker

Builds an installable release APK in Docker ([Dockerfile.android](Dockerfile.android)),
with no Android Studio or Expo account:

```bash
hostname -I                                                    # this computer's LAN IP (first one)
npm run apk                                                    # -> build/raf.apk, API from .env
npm run apk -- --build-arg API_URL=http://<LAN-IP>:3100        # another API than .env
adb install -r build/raf.apk                                   # or copy it to the phone
```

The `EXPO_PUBLIC_*` values in `.env` are built into the APK, so the API URL must be
one the phone can reach: this computer's LAN IP, on the same Wi-Fi (`API_URL`
overrides it without editing `.env`). The LAN IP changes when the computer joins
another network; rebuild the APK then. The API is plain `http://`, which release
builds block by default, so `app.json` allows it (`expo-build-properties`,
`usesCleartextTraffic`); put the API behind HTTPS before shipping the app to others.
If the phone still cannot connect, open the port on this computer's firewall
(`sudo ufw allow 3100/tcp`) and check `http://<LAN-IP>:3100/health` in the phone's browser. Only `arm64-v8a` is built by default; add
`--build-arg ABIS=arm64-v8a,armeabi-v7a,x86_64` for old phones or the emulator.
The first build downloads the Android SDK, NDK and Gradle (several GB); later
builds reuse them. The APK is signed with the debug key, which is fine for
installing it yourself but not for the Play Store (use EAS for that).

## Google sign-in

Create OAuth client ids in Google Cloud Console (web, iOS, Android), put them in
`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` here and in `GOOGLE_CLIENT_IDS` in
`apps/raf-api/.env`. Without them the button stays and explains that Google
sign-in is not set up yet.

## Screens

| Tab / screen | What it does |
| --- | --- |
| Sign in | Continue with Google, or sign up / log in with email. |
| Home | This month's spend vs. last month, the three products to use soonest, the last trip. |
| Shelf · Countdown | Every product with its days left, filtered by category. |
| Shelf · At home | Products you keep at home with counts; saved receipts raise matching counts. |
| Scan (lime button) | Live camera with flash, gallery, and *long receipt* mode (photograph in parts). |
| Review receipt | Market, date, total; each line's clean name, receipt text, category, shelf life and "At home +1"; unsure lines ask "Is this the right product?". |
| Scan pack dates | From a receipt, the shelf or a product: the camera reads a pack's barcode, finds the product on your receipts, then a photo of the printed date (SKT / TETT / EXP) replaces the estimate. Fruit and veg keep their average keeping times. If no date is read, type it in. |
| Product | Big countdown, unopened / opened estimate, date on the pack, purchase history, mark as used up. |
| Lists | Several market lists, ticks, last prices and an estimate; running-low suggestions. |
| Trips | Saved receipts by month with totals, filtered by market. |
| Receipt detail | The trip as a receipt, grouped by category, with days left per product and the original photo. |
| Spending | Six months of totals; a month by category or by market. |
| Settings | Expiry reminders and lead time, at-home tracking, currency, language, appearance, log out, delete account. |

## Structure

Same layout and conventions as `apps/mobile-react-native`:

```
src/
├── navigators/   RootNavigator (signed out / in), TabNavigator + TabBar (dark bar, scan button), linking
├── screens/      auth, home, shelf, scan, receipts, product, lists, trips, spending, settings
├── components/   ui/ (design kit: ReceiptPaper, TickBar, Segmented, Switch, Chip…) + one folder per feature
├── hooks/        screen logic, one folder per feature (+ app/ for bootstrap and expiry reminders)
├── store/        RTK Query services (auth, me, receipts, items, home items, lists, insights), slices, middlewares
├── services/     SecureStore / AsyncStorage, camera & photo prep, local reminders
├── theme/        Raf palette (light + dark) and fonts (Inter, Space Grotesk, JetBrains Mono)
└── i18n/         English and Turkish
```

Deep links: `raf://scan`, `raf://receipt/<id>`, `raf://trip/<id>`, `raf://product/<id>`, `raf://shelf`…
