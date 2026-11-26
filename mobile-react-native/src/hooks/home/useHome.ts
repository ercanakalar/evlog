import { useNavigation } from '@react-navigation/native';
import { useGetHomeInsightsQuery } from '@/store/services/insightService';
import { RECEIPT_POLL_MS } from '@/constants/domain';
import { useGetMeQuery } from '@/store/services/meService';
import { receiptService, useListUnsavedQuery } from '@/store/services/receiptService';

const isReading = (r: { status: string }) => r.status === 'PENDING' || r.status === 'PROCESSING';

export function useHome() {
  const navigation = useNavigation();
  const insights = useGetHomeInsightsQuery();
  const me = useGetMeQuery();
  // Poll only while a photo is being read.
  const cached = receiptService.endpoints.listUnsaved.useQueryState();
  const reading = cached.data?.some(isReading) ?? false;
  const unsaved = useListUnsavedQuery(undefined, { pollingInterval: reading ? RECEIPT_POLL_MS * 2 : 0 });
  const spent = Number(insights.data?.spent ?? 0);
  const before = Number(insights.data?.previousSameDay ?? 0);

  return {
    insights: insights.data,
    /** Receipts that were scanned but not saved yet. */
    unsaved: (unsaved.data ?? []).map((r) => ({ ...r, reading: isReading(r) })),
    openReview: (receiptId: string) => navigation.navigate('ReceiptReview', { receiptId }),
    me: me.data,
    isLoading: insights.isLoading,
    error: insights.error,
    isRefreshing: insights.isFetching && !insights.isLoading,
    refresh: () => {
      void insights.refetch();
      void me.refetch();
      void unsaved.refetch();
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
