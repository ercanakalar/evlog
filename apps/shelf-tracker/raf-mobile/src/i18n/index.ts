import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { LanguagePreference } from '@/types/store/state';
import en from './locales/en';
import tr from './locales/tr';

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const deviceLanguage = (): Language => {
  const code = getLocales()[0]?.languageCode;
  return code === 'tr' ? 'tr' : 'en';
};

export const resolveLanguage = (preference: LanguagePreference): Language =>
  preference === 'system' ? deviceLanguage() : preference;

/** App-wide instance; react-i18next picks it up through initReactI18next. */
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false }, // React already escapes.
  returnNull: false,
});

export default i18n;
