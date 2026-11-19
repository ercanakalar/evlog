import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { signOut } from '@/store/actions/sessionActions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDeleteAccountMutation, useGetMeQuery, useUpdateSettingsMutation } from '@/store/services/meService';
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
import { signedOut } from '@/store/slices/authSlice';
import type { UpdateSettingsRequest } from '@/types/api/requests';
import type { FontPreference, LanguagePreference, PalettePreference, ThemePreference } from '@/types/store/state';

const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const;

/** Account, countdown and at-home settings (server) plus app preferences (device). */
export function useSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const showError = useErrorAlert();
  const modal = useModal();
  const me = useGetMeQuery();
  const [update] = useUpdateSettingsMutation();
  const [deleteAccount, deleteState] = useDeleteAccountMutation();
  const language = useAppSelector(selectLanguagePreference);
  const theme = useAppSelector(selectThemePreference);
  const palette = useAppSelector(selectPalettePreference);
  const font = useAppSelector(selectFontPreference);
  const usage = useAppSelector(selectUsageReportingConsent);

  const set = (changes: UpdateSettingsRequest) =>
    void update(changes).unwrap().catch((error: unknown) => showError(t('settings.saveFailed'), error));

  const pick = <T extends string>(
    title: string,
    options: readonly T[],
    current: T | undefined,
    label: (v: T) => string,
    onPick: (v: T) => void,
  ) =>
    modal.choose({
      title,
      choices: options.map((o) => ({ label: label(o), selected: o === current, onPress: () => onPick(o) })),
    });

  return {
    me: me.data,
    isLoading: me.isLoading,
    error: me.error,
    refetch: me.refetch,
    set,
    language,
    theme,
    palette,
    setPalette: (p: PalettePreference) => dispatch(paletteChanged(p)),
    font,
    setFont: (f: FontPreference) => dispatch(fontChanged(f)),
    usageReporting: usage === 'granted',
    setUsageReporting: (on: boolean) => dispatch(usageReportingDecided(on ? 'granted' : 'denied')),
    pickCurrency: () =>
      pick(t('settings.currency'), CURRENCIES, me.data?.currency as (typeof CURRENCIES)[number] | undefined, (c) => t(`currencies.${c}`), (currency) => set({ currency })),
    pickLanguage: () =>
      pick<LanguagePreference>(t('settings.language'), ['system', 'en', 'tr'], language, (l) => t(`settings.languages.${l}`), (l) =>
        dispatch(languageChanged(l)),
      ),
    pickTheme: () =>
      pick<ThemePreference>(t('settings.theme'), ['system', 'light', 'dark'], theme, (v) => t(`settings.themes.${v}`), (v) =>
        dispatch(themeChanged(v)),
      ),
    logOut: () => void dispatch(signOut()),
    deleting: deleteState.isLoading,
    deleteAccount: () =>
      modal.confirm({
        title: t('settings.deleteTitle'),
        message: t('settings.deleteBody'),
        confirmLabel: t('settings.deleteAccount'),
        destructive: true,
        onConfirm: () =>
          deleteAccount()
            .unwrap()
            .then(() => dispatch(signedOut()))
            .catch((error: unknown) => showError(t('common.somethingWrong'), error)),
      }),
  };
}
