import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const KEY = 'evlog.tokens';

// SecureStore is native-only; the web build (used for previews) falls back
// to localStorage, which is not a secure place for tokens in production.
const storage =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
        deleteItemAsync: async (key: string) => globalThis.localStorage?.removeItem(key),
      }
    : SecureStore;
let current: Tokens | null = null;
const listeners = new Set<(tokens: Tokens | null) => void>();

/** Tokens live in the OS keychain/keystore, mirrored in memory for speed. */
export const tokenStore = {
  get: () => current,

  async load(): Promise<Tokens | null> {
    const raw = await storage.getItemAsync(KEY);
    current = raw ? (JSON.parse(raw) as Tokens) : null;
    return current;
  },

  async set(tokens: Tokens | null): Promise<void> {
    current = tokens;
    if (tokens) await storage.setItemAsync(KEY, JSON.stringify(tokens));
    else await storage.deleteItemAsync(KEY);
    listeners.forEach((listener) => listener(tokens));
  },

  subscribe(listener: (tokens: Tokens | null) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
