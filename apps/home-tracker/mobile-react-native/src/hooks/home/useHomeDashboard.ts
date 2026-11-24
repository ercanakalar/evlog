import { useTranslation } from 'react-i18next';
import { inviteLink, shareText } from '@/services/linking';
import { useGetDashboardQuery, useInviteTenantMutation } from '@/store/services/homeService';
import { todayIsoDate } from '@/utils/format';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';

export function useHomeDashboard() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const { home, role, memberships, select } = useCurrentHome();
  const dashboard = useGetDashboardQuery(home.id);
  const [invite, { isLoading: inviting }] = useInviteTenantMutation();

  /** Owner shares a deep link that opens the join screen with the code filled in. */
  const inviteTenant = async () => {
    try {
      const { inviteCode } = await invite({ homeId: home.id, startDate: todayIsoDate() }).unwrap();
      await shareText(t('home.inviteMessage', { code: inviteCode, link: inviteLink(inviteCode) }));
    } catch (error) {
      showError(t('home.inviteFailed'), error);
    }
  };

  return {
    home,
    role,
    roles: memberships.filter((m) => m.home.id === home.id),
    selectRole: select,
    dashboard: dashboard.data,
    isLoading: dashboard.isLoading,
    isRefreshing: dashboard.isFetching && !dashboard.isLoading,
    error: dashboard.error,
    refresh: dashboard.refetch,
    canInvite: role === 'OWNER' && dashboard.data !== undefined && !dashboard.data.activeTenancy,
    inviteTenant,
    inviting,
  };
}
