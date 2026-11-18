import { useCurrentHome } from '@/hooks/common/useCurrentHome';
import { PublishedRatingsScreen } from './PublishedRatingsScreen';
import { RateHomeScreen } from './RateHomeScreen';

/** Tenants rate their tenancy; owners read published ratings. */
export function RatingsScreen() {
  const { role } = useCurrentHome();
  return role === 'TENANT' ? <RateHomeScreen /> : <PublishedRatingsScreen />;
}
