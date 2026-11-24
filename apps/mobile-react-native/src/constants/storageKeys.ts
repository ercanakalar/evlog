export const StorageKeys = {
  /** SecureStore: Evlog API access + refresh token. */
  tokens: 'evlog.tokens',
  /** SecureStore: Raf (groceries) API access + refresh token; a separate account. */
  groceriesTokens: 'evlog.groceries.tokens',
  /** AsyncStorage: persisted Redux slices (settings, consent, session). */
  persistedState: 'evlog.state.v1',
} as const;
