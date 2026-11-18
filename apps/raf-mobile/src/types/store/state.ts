export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | 'en' | 'tr';

export interface SettingsState {
  theme: ThemePreference;
  language: LanguagePreference;
}

export type ConsentDecision = 'unknown' | 'granted' | 'denied';

export interface ConsentState {
  /** Anonymous usage reporting (which features are used, never content). */
  usageReporting: ConsentDecision;
}

/** The subset of state written to AsyncStorage. */
export interface PersistedState {
  settings: SettingsState;
  consent: ConsentState;
}
