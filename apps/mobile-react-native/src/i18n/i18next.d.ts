import 'i18next';
import type en from './locales/en';
import type groceries from './locales/groceries/en';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en; groceries: typeof groceries };
  }
}
