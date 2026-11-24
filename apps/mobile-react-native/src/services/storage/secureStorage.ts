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

/** Token storage under one SecureStore key; each API account has its own. */
function tokenStorage(key: string) {
  return {
    async loadTokens(): Promise<StoredTokens | null> {
      try {
        const raw = await backend.getItemAsync(key);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return isTokens(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    saveTokens: (tokens: StoredTokens) => backend.setItemAsync(key, JSON.stringify(tokens)),
    clearTokens: () => backend.deleteItemAsync(key),
  };
}

/** The Evlog account. */
export const secureStorage = tokenStorage(StorageKeys.tokens);
/** The groceries (Raf API) account. */
export const groceriesTokenStorage = tokenStorage(StorageKeys.groceriesTokens);
