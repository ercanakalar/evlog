import { useNavigation } from '@react-navigation/native';
import { useGetHomeInsightsQuery } from '@/store/services/insightService';
import { useGetMeQuery } from '@/store/services/meService';

export function useHome() {
  const navigation = useNavigation();
  const insights = useGetHomeInsightsQuery();
  const me = useGetMeQuery();
  const spent = Number(insights.data?.spent ?? 0);
  const before = Number(insights.data?.previousSameDay ?? 0);

  return {
    insights: insights.data,
    me: me.data,
    isLoading: insights.isLoading,
    error: insights.error,
    isRefreshing: insights.isFetching && !insights.isLoading,
    refresh: () => {
      void insights.refetch();
      void me.refetch();
    },
    /** Positive: spent more than by this day last month. */
    difference: spent - before,
    openSettings: () => navigation.navigate('Settings'),
    openSpending: () => navigation.navigate('Spending'),
    openShelf: () => navigation.navigate('Tabs', { screen: 'Shelf', params: { view: 'countdown' } }),
    openProduct: (itemId: string) => navigation.navigate('Product', { itemId }),
    openTrip: (receiptId: string) => navigation.navigate('TripDetail', { receiptId }),
    scan: () => navigation.navigate('Scan'),
  };
}
