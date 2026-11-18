export const StorageKeys = {
  /** SecureStore: access + refresh token. */
  tokens: 'raf.tokens',
  /** AsyncStorage: persisted Redux slices (settings, consent). */
  persistedState: 'raf.state.v1',
} as const;
