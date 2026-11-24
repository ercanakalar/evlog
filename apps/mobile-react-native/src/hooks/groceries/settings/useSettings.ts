import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { useErrorAlert } from '@/hooks/groceries/common/useErrorAlert';
import { signOut } from '@/store/groceries/actions/sessionActions';
import { useAppDispatch } from '@/store/hooks';
import { useDeleteAccountMutation, useGetMeQuery, useUpdateSettingsMutation } from '@/store/groceries/services/meService';
import { signedOut } from '@/store/groceries/authSlice';
import type { UpdateSettingsRequest } from '@/types/api/groceries/requests';

const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const;

/** The groceries account: countdown, at-home and shopping settings (stored by the Raf API). */
export function useSettings() {
  const { t } = useTranslation('groceries');
  const dispatch = useAppDispatch();
  const showError = useErrorAlert();
  const modal = useModal();
  const me = useGetMeQuery();
  const [update] = useUpdateSettingsMutation();
  const [deleteAccount, deleteState] = useDeleteAccountMutation();

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
    pickCurrency: () =>
      pick(t('settings.currency'), CURRENCIES, me.data?.currency as (typeof CURRENCIES)[number] | undefined, (c) => t(`currencies.${c}`), (currency) => set({ currency })),
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
