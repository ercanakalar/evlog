# Raf mobile (Expo SDK 58 · React Native 0.88)

The phone app for [Raf](../README.md): scan market receipts, follow how long each product
lasts, keep market lists, count what is at home and see where the money goes.
Run these commands in `apps/shelf-tracker/raf-mobile`:

```bash
cp .env.example .env      # EXPO_PUBLIC_API_URL → the Raf API (../raf-api, port 3100)
npm install
npm start                 # i / a, or scan the QR code
```

`EXPO_PUBLIC_API_URL` must be reachable from the phone: `http://10.0.2.2:3100` on the
Android emulator, your computer's LAN IP on a real device.

`EXPO_PUBLIC_SUPPORT_EMAIL` is shown under Settings → Help.

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
another network; rebuild the APK then. Release builds block plain `http://`; `app.config.ts`
allows it only when the API's address starts with `http://`, so a build that points at an
HTTPS API never allows it, and a production EAS build refuses anything but HTTPS.
If the phone still cannot connect, open the port on this computer's firewall
(`sudo ufw allow 3100/tcp`) and check `http://<LAN-IP>:3100/health` in the phone's browser. Only `arm64-v8a` is built by default; add
`--build-arg ABIS=arm64-v8a,armeabi-v7a,x86_64` for old phones or the emulator.
The first build downloads the Android SDK, NDK and Gradle (several GB); later
builds reuse them. The APK is signed with the debug key, which is fine for
installing it yourself but not for the Play Store (use EAS for that).

## Store builds with EAS

[`eas.json`](eas.json) has two profiles: `preview` (an APK to install directly) and
`production` (a signed AAB / IPA; EAS raises the build number). `.env` is not uploaded,
so the address of the HTTPS API is stored on Expo. Once:

```bash
npx eas-cli@latest login
npx eas-cli@latest init        # links the app to your Expo account; if it cannot write the
                               # project id itself, add it to app.json as extra.eas.projectId
for env in preview production; do
  npx eas-cli@latest env:set --environment $env --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://<api>
  npx eas-cli@latest env:set --environment $env --visibility plaintext --name EXPO_PUBLIC_SUPPORT_EMAIL --value <email>
done
```

Then, for each release:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production    # to Play's internal test track
```

Google Play needs the first AAB of a new app to be uploaded by hand in the Play Console,
and a Google service account key for `submit` after that.

## Google sign-in

Create OAuth client ids in Google Cloud Console (web, iOS, Android), put them in
`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` here and in `GOOGLE_CLIENT_IDS` in
`apps/shelf-tracker/raf-api/.env`. Without them the button is hidden; it is also hidden on iOS,
where Apple then requires Sign in with Apple.

## Screens

| Tab / screen | What it does |
| --- | --- |
| Sign in | Continue with Google, or sign up / log in with email; reset a forgotten password with an emailed code. |
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
| Settings | Expiry reminders and lead time, at-home tracking, currency, language, appearance (theme, colour palette, font style), help and legal pages, log out, delete account. |

## Structure

Same layout and conventions as [`apps/home-tracker/mobile-react-native`](../../home-tracker/mobile-react-native/README.md#structure):

```
src/
├── navigators/   RootNavigator (signed out / in), TabNavigator + TabBar (dark bar, scan button), linking
├── screens/      auth, home, shelf, scan, packs, receipts, product, lists, trips, spending, settings
├── components/   ui/ (design kit: ReceiptPaper, TickBar, Segmented, Switch, Chip…) + one folder per feature
├── hooks/        screen logic, one folder per feature (+ app/ for bootstrap and expiry reminders)
├── store/        RTK Query services (auth, me, receipts, items, home items, lists, insights), slices, middlewares
├── services/     SecureStore / AsyncStorage, camera & photo prep, local reminders
├── theme/        colour palettes (each light + dark) and font styles, both chosen in Settings
└── i18n/         English and Turkish
```

Deep links: `raf://scan`, `raf://receipt/<id>`, `raf://trip/<id>`, `raf://product/<id>`, `raf://shelf`…
