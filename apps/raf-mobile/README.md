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
