import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUsageReportingConsent, usageReportingDecided } from '@/store/slices/consentSlice';
import {
  languageChanged,
  selectLanguagePreference,
  selectThemePreference,
  themeChanged,
} from '@/store/slices/settingsSlice';
import type { LanguagePreference, ThemePreference } from '@/types/store/state';

export function useSettings() {
  const dispatch = useAppDispatch();
  return {
    theme: useAppSelector(selectThemePreference),
    language: useAppSelector(selectLanguagePreference),
    usageReporting: useAppSelector(selectUsageReportingConsent) === 'granted',
    setTheme: (value: ThemePreference) => {
      dispatch(themeChanged(value));
    },
    setLanguage: (value: LanguagePreference) => {
      dispatch(languageChanged(value));
    },
    setUsageReporting: (granted: boolean) => {
      dispatch(usageReportingDecided(granted ? 'granted' : 'denied'));
    },
  };
}
