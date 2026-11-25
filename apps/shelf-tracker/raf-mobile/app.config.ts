import type { ConfigContext, ExpoConfig } from 'expo/config';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

// Set by EAS on the build server. Store builds must never talk to the API unencrypted.
if (process.env.EAS_BUILD_PROFILE === 'production' && !apiUrl.startsWith('https://')) {
  throw new Error('Production builds need an https:// EXPO_PUBLIC_API_URL (see "Store builds with EAS" in README.md).');
}

/**
 * Extends app.json. Android release builds block plain http, so it is allowed
 * only when this build points at an http API (a computer on the same Wi-Fi).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ...(apiUrl.startsWith('http://')
      ? [['expo-build-properties', { android: { usesCleartextTraffic: true } }] as [string, object]]
      : []),
  ],
});
