import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDeleteAccountMutation } from '@/store/services/homeService';
import { selectAuthStatus, signedOut } from '@/store/slices/authSlice';
import { selectUsageReportingConsent, usageReportingDecided } from '@/store/slices/consentSlice';
import {
  languageChanged,
  selectLanguagePreference,
  selectThemePreference,
  themeChanged,
} from '@/store/slices/settingsSlice';
import type { LanguagePreference, ThemePreference } from '@/types/store/state';
import { useErrorAlert } from '../common/useErrorAlert';

export function useSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showError = useErrorAlert();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();

  const removeAccount = () =>
    deleteAccount()
      .unwrap()
      .then(() => dispatch(signedOut()))
      .catch((error: unknown) => showError(t('settings.deleteFailed'), error));

  return {
    signedIn: useAppSelector(selectAuthStatus) === 'signedIn',
    deleting,
    deleteAccount: () =>
      Alert.alert(t('settings.deleteTitle'), t('settings.deleteBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.deleteConfirm'), style: 'destructive', onPress: () => void removeAccount() },
      ]),
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
