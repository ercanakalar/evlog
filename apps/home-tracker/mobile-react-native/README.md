# Evlog mobile (Expo SDK 58 · React Native 0.88)

The phone app for [Evlog](../README.md). Run these commands in
`apps/home-tracker/mobile-react-native`:

```bash
cp .env.example .env      # EXPO_PUBLIC_API_URL → the Evlog API (../api, port 3000)
npm install
npm start                 # i / a, or scan the QR code
```

`EXPO_PUBLIC_API_URL` must be reachable from the phone: `http://10.0.2.2:3000` on the
Android emulator, your computer's LAN IP on a real device.

Checks: `npm run typecheck`, `npm run lint`.

`EXPO_PUBLIC_LEGAL_OPERATOR` and `EXPO_PUBLIC_SUPPORT_EMAIL` fill in the legal texts
(`src/i18n/locales/legal.en.ts`, `legal.tr.ts`).

## Store builds with EAS

[`eas.json`](eas.json) has two profiles: `preview` (an APK to install directly) and
`production` (a signed AAB / IPA; EAS raises the build number). `.env` is not uploaded, so
the settings are stored on Expo. `app.config.ts` stops a production build that has no HTTPS
API address, operator or support email. Once:

```bash
npx eas-cli@latest login
npx eas-cli@latest init        # links the app to your Expo account; if it cannot write the
                               # project id itself, add it to app.json as extra.eas.projectId
for env in preview production; do
  npx eas-cli@latest env:set --environment $env --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://<api>
  npx eas-cli@latest env:set --environment $env --visibility plaintext --name EXPO_PUBLIC_LEGAL_OPERATOR --value "<name, address>"
  npx eas-cli@latest env:set --environment $env --visibility plaintext --name EXPO_PUBLIC_SUPPORT_EMAIL --value <email>
done
```

Then, for each release, `npx eas-cli@latest build --platform android --profile production` and
`npx eas-cli@latest submit --platform android --profile production` (Play's internal test track;
the first AAB of a new app is uploaded by hand in the Play Console).

## Structure

```
mobile-react-native/
├── index.ts            → registerRootComponent(App), loads i18n, holds the splash screen
├── App.tsx             → provider tree: Redux → Theme → SafeArea → NavigationContainer
└── src/
    ├── navigators/     → RootNavigator (auth / onboarding / app groups), HomeTabNavigator,
    │                     linking.ts (deep links), navigationRef
    ├── screens/        → home, record, ratings, kitchen, upkeep, listing, receipts, report, onboarding,
    │                     profile/{auth, settings, legal}
    ├── components/     → ui/ (generic parts) + one folder per feature
    ├── hooks/          → screen logic, one folder per feature (+ common/, app/)
    ├── store/
    │   ├── slices/        auth, session (selected home/role), settings, consent
    │   ├── services/      RTK Query: authenticationService, homeService, conditionRecordService,
    │   │                  receiptService, ratingService, kitchenService, upkeepService, listingService, reportService
    │   ├── bases/         baseQuery, baseQueryWithReauth, errorMapping, paging, responseTransform
    │   ├── middlewares/   auth, consent, persistence listeners + custom createApi (baseApi)
    │   ├── actions/       thunks: bootstrap, session (restore / sign out), receipt scanning
    │   └── adapters/      entity adapters (appliances, receipts)
    ├── services/       → SecureStore / AsyncStorage, JWT decoding, camera, usage reporting, sharing
    ├── types/          → api/, store/, screens/ (navigation params), components/, hooks/
    ├── theme/          → ThemeProvider / useTheme (system · light · dark)
    ├── i18n/           → i18next + locales (en, tr; tr is type-checked against en)
    ├── constants/, config/, utils/
```

## How it fits together

* **Screens are thin.** Each one calls a hook from `hooks/<feature>` and renders components.
  The hooks hold the logic: queries, mutations, forms, alerts and navigation.
* **Server state** lives in RTK Query. Every service injects endpoints into a single `baseApi`
  (`store/middlewares/createApi.ts`). Tags keep things in sync: confirming a receipt refreshes
  the kitchen, the tenancy verification and the ratings evidence.
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
