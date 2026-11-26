import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { env } from '@/config/env';

/** Opens the legal pages inside the app, in its language. */
export function useLegalLinks() {
  const { i18n } = useTranslation();
  const open = (page: 'privacy' | 'terms') => () =>
    void WebBrowser.openBrowserAsync(env.legalUrl(page, i18n.language === 'tr' ? 'tr' : 'en')).catch(() => undefined);
  return { openPrivacy: open('privacy'), openTerms: open('terms') };
}
