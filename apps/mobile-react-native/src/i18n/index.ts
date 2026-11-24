import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { LanguagePreference } from '@/types/store/state';
import en from './locales/en';
import groceriesEn from './locales/groceries/en';
import groceriesTr from './locales/groceries/tr';
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
  // Groceries (the Raf features) keeps its strings in their own namespace.
  resources: {
    en: { translation: en, groceries: groceriesEn },
    tr: { translation: tr, groceries: groceriesTr },
  },
  defaultNS: 'translation',
  ns: ['translation', 'groceries'],
  lng: deviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false }, // React already escapes.
  returnNull: false,
});

export default i18n;
