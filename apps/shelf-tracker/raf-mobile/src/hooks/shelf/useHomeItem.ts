import { useGetHomeItemQuery } from '@/store/services/homeItemService';

/** One at-home product with what it is made of, by brand and pack size. */
export function useHomeItem(homeItemId: string) {
  const item = useGetHomeItemQuery(homeItemId);
  const fromReceipts = (item.data?.variants ?? []).reduce((sum, v) => sum + v.count, 0);
  return {
    item: item.data,
    isLoading: item.isLoading,
    error: item.error,
    refetch: item.refetch,
    isRefreshing: item.isFetching && !item.isLoading,
    /** The count no longer adds up to the receipts: it was changed with − and +. */
    changedByHand: item.data ? Math.abs(item.data.count - fromReceipts) > 0.0005 && item.data.variants.length > 0 : false,
  };
}
