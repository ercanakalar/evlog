import { useTranslation } from 'react-i18next';
import { inviteLink, shareText } from '@/services/linking';
import { env } from '@/config/env';
import { selectAuthStatus as selectGroceriesStatus } from '@/store/groceries/authSlice';
import { useGetHomeInsightsQuery } from '@/store/groceries/services/insightService';
import { useAppSelector } from '@/store/hooks';
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
  const groceriesConnected = useAppSelector(selectGroceriesStatus) === 'signedIn';
  const groceries = useGetHomeInsightsQuery(undefined, { skip: !env.groceriesEnabled || !groceriesConnected });

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
    refresh: () => {
      void dashboard.refetch();
      if (groceriesConnected) void groceries.refetch();
    },
    /** Null: Groceries is not part of this build. */
    groceries: env.groceriesEnabled
      ? { connected: groceriesConnected, useSoon: groceries.data?.useSoonCount }
      : null,
    canInvite: role === 'OWNER' && dashboard.data !== undefined && !dashboard.data.activeTenancy,
    inviteTenant,
    inviting,
  };
}
