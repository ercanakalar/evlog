const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
}

const optional = (value: string | undefined) => (value ? value : undefined);

export const env = {
  /** Base URL of the versioned API, e.g. http://localhost:3100/api/v1 */
  apiUrl: `${raw.replace(/\/+$/, '')}/api/v1`,
  /** Google OAuth client ids; Google sign-in is hidden behind a notice when none is set. */
  google: {
    webClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    iosClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: optional(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  },
} as const;
