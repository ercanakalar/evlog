const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
}

const optional = (value: string | undefined) => (value ? value : undefined);
const versioned = (origin: string) => `${origin.replace(/\/+$/, '')}/api/v1`;
const rafOrigin = optional(process.env.EXPO_PUBLIC_RAF_API_URL);

export const env = {
  /** Base URL of the versioned Evlog API, e.g. http://localhost:3000/api/v1 */
  apiUrl: versioned(raw),
  /** Base URL of the Raf API behind the Groceries tab, e.g. http://localhost:3100/api/v1 */
  groceriesApiUrl: rafOrigin ? versioned(rafOrigin) : '',
  /** Groceries is shown only when the Raf API address is set. */
  groceriesEnabled: Boolean(rafOrigin),
  /** Public web origin used for universal links. */
  webOrigin: 'https://evlog.app',
  /** Google OAuth client ids for the groceries account; Google sign-in is hidden when none is set. */
  google: {
    webClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    iosClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  },
} as const;
