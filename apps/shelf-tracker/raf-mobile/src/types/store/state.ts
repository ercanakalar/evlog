export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | 'en' | 'tr';
/** Highlighter colour and paper tint; each works in light and dark. */
export type PalettePreference = 'lime' | 'mint' | 'sky' | 'lilac' | 'rose' | 'lemon' | 'aqua' | 'orchid';
/** Which set of text, heading and receipt (mono) fonts the app uses. */
export type FontPreference = 'receipt' | 'editorial' | 'rounded' | 'legible';

export interface SettingsState {
  theme: ThemePreference;
  palette: PalettePreference;
  font: FontPreference;
  language: LanguagePreference;
}

/** The subset of state written to AsyncStorage. */
export interface PersistedState {
  settings: SettingsState;
}
