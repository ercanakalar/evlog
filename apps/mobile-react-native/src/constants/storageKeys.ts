export const StorageKeys = {
  /** SecureStore: access + refresh token. */
  tokens: 'evlog.tokens',
  /** AsyncStorage: persisted Redux slices (settings, consent, session). */
  persistedState: 'evlog.state.v1',
} as const;
