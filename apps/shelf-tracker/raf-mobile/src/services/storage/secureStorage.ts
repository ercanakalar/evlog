import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { StorageKeys } from '@/constants/storageKeys';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// SecureStore is native-only (Keychain / Keystore). The web build, used only
// for previews, falls back to localStorage, which is not secure.
const backend =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
        deleteItemAsync: async (key: string) => globalThis.localStorage?.removeItem(key),
      }
    : SecureStore;

const isTokens = (value: unknown): value is StoredTokens =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as StoredTokens).accessToken === 'string' &&
  typeof (value as StoredTokens).refreshToken === 'string';

export const secureStorage = {
  async loadTokens(): Promise<StoredTokens | null> {
    try {
      const raw = await backend.getItemAsync(StorageKeys.tokens);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return isTokens(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  saveTokens: (tokens: StoredTokens) =>
    backend.setItemAsync(StorageKeys.tokens, JSON.stringify(tokens)),
  clearTokens: () => backend.deleteItemAsync(StorageKeys.tokens),
};
