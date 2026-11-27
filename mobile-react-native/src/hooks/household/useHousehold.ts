import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';
import { useModal } from '@/components/ui';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { useFormatters } from '@/hooks/common/useFormatters';
import {
  useCancelInviteMutation,
  useCreateInviteMutation,
  useGetHouseholdQuery,
  useJoinHouseholdMutation,
  useLeaveHouseholdMutation,
} from '@/store/services/householdService';

/** Who shares this Raf, inviting someone, joining someone else's household, leaving. */
export function useHousehold() {
  const { t } = useTranslation();
  const f = useFormatters();
  const modal = useModal();
  const showError = useErrorAlert();
  const query = useGetHouseholdQuery();
  const [createInvite, inviting] = useCreateInviteMutation();
  const [cancelInvite] = useCancelInviteMutation();
  const [join] = useJoinHouseholdMutation();
  const [leave, leaving] = useLeaveHouseholdMutation();
  const household = query.data;
  const others = (household?.members.length ?? 1) - 1;

  return {
    household,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    shared: others > 0,
    full: household ? household.members.length >= household.maxMembers : false,
    inviting: inviting.isLoading,
    leaving: leaving.isLoading,
    invite: () => void createInvite().unwrap().catch((error: unknown) => showError(t('household.failed'), error)),
    cancelInvite: () => void cancelInvite().unwrap().catch((error: unknown) => showError(t('household.failed'), error)),
    shareInvite: () => {
      const invite = household?.invite;
      if (!invite) return;
      void Share.share({ message: t('household.shareMessage', { code: invite.code, when: `${f.day(invite.expiresAt)} ${f.time(invite.expiresAt)}` }) });
    },
    join: () =>
      modal.prompt({
        title: t('household.joinTitle'),
        message: t('household.joinBody'),
        label: t('household.code'),
        placeholder: 'K7PM-4QXR',
        submitLabel: t('household.join'),
        onSubmit: async (code) => {
          try {
            await join(code.trim()).unwrap();
          } catch (error) {
            // Opens in place of the prompt, with why: a wrong code, a full household...
            showError(t('household.joinFailed'), error);
          }
        },
      }),
    leave: () =>
      modal.confirm({
        title: t('household.leaveTitle'),
        message: t('household.leaveBody'),
        confirmLabel: t('household.leave'),
        destructive: true,
        onConfirm: () => leave().unwrap().catch((error: unknown) => showError(t('household.failed'), error)),
      }),
  };
}
