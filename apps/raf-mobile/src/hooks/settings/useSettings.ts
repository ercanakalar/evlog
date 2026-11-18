import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { signOut } from '@/store/actions/sessionActions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDeleteAccountMutation, useGetMeQuery, useUpdateSettingsMutation } from '@/store/services/meService';
import { selectUsageReportingConsent, usageReportingDecided } from '@/store/slices/consentSlice';
import { languageChanged, selectLanguagePreference, selectThemePreference, themeChanged } from '@/store/slices/settingsSlice';
import { signedOut } from '@/store/slices/authSlice';
import type { UpdateSettingsRequest } from '@/types/api/requests';
import type { LanguagePreference, ThemePreference } from '@/types/store/state';

const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const;

/** Account, countdown and at-home settings (server) plus app preferences (device). */
export function useSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showError = useErrorAlert();
  const me = useGetMeQuery();
  const [update] = useUpdateSettingsMutation();
  const [deleteAccount, deleteState] = useDeleteAccountMutation();
  const language = useAppSelector(selectLanguagePreference);
  const theme = useAppSelector(selectThemePreference);
  const usage = useAppSelector(selectUsageReportingConsent);

  const set = (changes: UpdateSettingsRequest) =>
    void update(changes).unwrap().catch((error: unknown) => showError(t('settings.saveFailed'), error));

  const pick = <T extends string>(title: string, options: readonly T[], label: (v: T) => string, onPick: (v: T) => void) =>
    Alert.alert(title, undefined, [
      ...options.map((o) => ({ text: label(o), onPress: () => onPick(o) })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);

  return {
    me: me.data,
    isLoading: me.isLoading,
    error: me.error,
    refetch: me.refetch,
    set,
    language,
    theme,
    usageReporting: usage === 'granted',
    setUsageReporting: (on: boolean) => dispatch(usageReportingDecided(on ? 'granted' : 'denied')),
    pickCurrency: () =>
      pick(t('settings.currency'), CURRENCIES, (c) => t(`currencies.${c}`), (currency) => set({ currency })),
    pickLanguage: () =>
      pick<LanguagePreference>(t('settings.language'), ['system', 'en', 'tr'], (l) => t(`settings.languages.${l}`), (l) =>
        dispatch(languageChanged(l)),
      ),
    pickTheme: () =>
      pick<ThemePreference>(t('settings.theme'), ['system', 'light', 'dark'], (v) => t(`settings.themes.${v}`), (v) =>
        dispatch(themeChanged(v)),
      ),
    logOut: () => void dispatch(signOut()),
    deleting: deleteState.isLoading,
    deleteAccount: () =>
      Alert.alert(t('settings.deleteTitle'), t('settings.deleteBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () =>
            void deleteAccount()
              .unwrap()
              .then(() => dispatch(signedOut()))
              .catch((error: unknown) => showError(t('common.somethingWrong'), error)),
        },
      ]),
  };
}
