import type { ConfigContext, ExpoConfig } from 'expo/config';

// Set by EAS on the build server: what a store build cannot do without.
if (process.env.EAS_BUILD_PROFILE === 'production') {
  if (!process.env.EXPO_PUBLIC_API_URL?.startsWith('https://')) {
    throw new Error('Production builds need an https:// EXPO_PUBLIC_API_URL.');
  }
  for (const name of ['EXPO_PUBLIC_LEGAL_OPERATOR', 'EXPO_PUBLIC_SUPPORT_EMAIL']) {
    if (!process.env[name]) throw new Error(`Production builds need ${name}: the legal texts show it.`);
  }
}

/** Extends app.json. */
export default ({ config }: ConfigContext): ExpoConfig => config as ExpoConfig;
