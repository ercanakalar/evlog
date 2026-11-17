# Evlog mobile (Expo SDK 58 · React Native 0.88)

Five tabs, matching the design: **Home · Record · Ratings · Kitchen · Upkeep**,
plus the Listing screen (owners), receipt review and condition-session detail.
Light and dark themes follow the system setting.

```bash
cp .env.example .env      # set EXPO_PUBLIC_API_URL to your API
npm install
npm start                 # then press i / a, or scan the QR code
```

`EXPO_PUBLIC_API_URL` must be reachable from the phone: `http://10.0.2.2:3000`
on the Android emulator, your computer's LAN IP on a real device.

| Folder | What lives there |
| --- | --- |
| `src/app` | Routes (Expo Router). `_layout.tsx` guards signed-out / onboarding / signed-in screens with `Stack.Protected`. |
| `src/lib/api.ts` | Fetch wrapper: bearer token, single-flight refresh-token rotation, typed `ApiError` with field messages. |
| `src/lib/queries.ts` | TanStack Query hooks for every endpoint. |
| `src/lib/images.ts` | Camera / library capture, resized to ≤2000px and re-encoded as JPEG (drops EXIF location). |
| `src/lib/token-store.ts` | Tokens in the iOS Keychain / Android Keystore via `expo-secure-store`. |
| `src/components/ui.tsx` | Themed primitives (Card, Button, Chip, Badge, Stars, Field…). |
| `src/theme` | Colour tokens taken from the mockups. |

Forms are validated with **Zod** + **react-hook-form** before they are sent;
the API validates everything again.

Checks: `npm run typecheck`, `npm run lint`.
Native modules used (camera, secure store) work in Expo Go; build a dev client
with `npx expo run:ios|android` or EAS when you add modules that are not in Expo Go.
