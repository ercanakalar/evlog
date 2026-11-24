import { useMemo } from 'react';
import { receiptSelectors, normalizeReceiptPages } from '@/store/adapters/receiptAdapter';
import { useListReceiptsInfiniteQuery } from '@/store/services/receiptService';

/** All of the user's receipts, paged by cursor and merged without duplicates. */
export function useReceiptList() {
  const query = useListReceiptsInfiniteQuery({});
  const receipts = useMemo(
    () => receiptSelectors.selectAll(normalizeReceiptPages(query.data?.pages)),
    [query.data?.pages],
  );
  return {
    receipts,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isFetchingNextPage && !query.isLoading,
    error: query.error,
    refresh: query.refetch,
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
  };
}
