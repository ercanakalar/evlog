const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
}

/** Base URL of the versioned API, e.g. http://localhost:3000/api/v1 */
export const API_URL = `${raw.replace(/\/+$/, '')}/api/v1`;
