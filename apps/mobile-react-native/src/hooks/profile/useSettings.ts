import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { env } from '@/config/env';
import { selectAuthStatus as selectGroceriesStatus } from '@/store/groceries/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUsageReportingConsent, usageReportingDecided } from '@/store/slices/consentSlice';
import {
  fontChanged,
  languageChanged,
  paletteChanged,
  selectFontPreference,
  selectLanguagePreference,
  selectPalettePreference,
  selectThemePreference,
  themeChanged,
} from '@/store/slices/settingsSlice';
import type { FontPreference, LanguagePreference, PalettePreference, ThemePreference } from '@/types/store/state';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGES: LanguagePreference[] = ['system', 'en', 'tr'];

/** Device preferences that apply to the whole app, plus a way into the groceries account. */
export function useSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const modal = useModal();
  const navigation = useNavigation();
  const theme = useAppSelector(selectThemePreference);
  const language = useAppSelector(selectLanguagePreference);
  const groceries = useAppSelector(selectGroceriesStatus);

  const pick = <T extends string>(title: string, options: T[], current: T, label: (v: T) => string, onPick: (v: T) => void) =>
    modal.choose({
      title,
      choices: options.map((o) => ({ label: label(o), selected: o === current, onPress: () => onPick(o) })),
    });

  return {
    theme,
    language,
    palette: useAppSelector(selectPalettePreference),
    font: useAppSelector(selectFontPreference),
    usageReporting: useAppSelector(selectUsageReportingConsent) === 'granted',
    setPalette: (value: PalettePreference) => dispatch(paletteChanged(value)),
    setFont: (value: FontPreference) => dispatch(fontChanged(value)),
    setUsageReporting: (granted: boolean) => dispatch(usageReportingDecided(granted ? 'granted' : 'denied')),
    pickTheme: () =>
      pick(t('settings.mode'), THEMES, theme, (v) => t(`settings.theme.${v}`), (v) => dispatch(themeChanged(v))),
    pickLanguage: () =>
      pick(t('settings.language'), LANGUAGES, language, (v) => t(`settings.languages.${v}`), (v) => dispatch(languageChanged(v))),
    /** Hidden when the app is built without a Raf API address. */
    groceriesAvailable: env.groceriesEnabled,
    groceriesConnected: groceries === 'signedIn',
    openGroceries: () =>
      groceries === 'signedIn'
        ? navigation.navigate('GrocerySettings')
        : navigation.navigate('HomeTabs', { screen: 'Groceries' }),
  };
}
