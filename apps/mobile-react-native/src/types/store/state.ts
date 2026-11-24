import type { Role } from '@/types/api/models';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
}

/** Which home and role the user is looking at (the Owner/Tenant switch). */
export interface SessionState {
  homeId: string | null;
  role: Role | null;
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

export type ConsentDecision = 'unknown' | 'granted' | 'denied';

export interface ConsentState {
  /** Anonymous usage reporting (which features are used, never content). */
  usageReporting: ConsentDecision;
}

/** The subset of state written to AsyncStorage. */
export interface PersistedState {
  settings: SettingsState;
  consent: ConsentState;
  session: SessionState;
}
