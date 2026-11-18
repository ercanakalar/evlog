const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
}

export const env = {
  /** Base URL of the versioned API, e.g. http://localhost:3000/api/v1 */
  apiUrl: `${raw.replace(/\/+$/, '')}/api/v1`,
  /** Public web origin used for universal links. */
  webOrigin: 'https://evlog.app',
} as const;
