const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
}

const operator = process.env.EXPO_PUBLIC_LEGAL_OPERATOR;
const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

export const env = {
  /** Base URL of the versioned API, e.g. http://localhost:3000/api/v1 */
  apiUrl: `${raw.replace(/\/+$/, '')}/api/v1`,
  /** Public web origin used for universal links. */
  webOrigin: 'https://evlog.app',
  /** Named in the legal texts. Production builds fail without them (app.config.ts). */
  legal: {
    operator: operator || 'EXPO_PUBLIC_LEGAL_OPERATOR',
    email: email || 'EXPO_PUBLIC_SUPPORT_EMAIL',
  },
} as const;
