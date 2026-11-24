import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { useListMarketsQuery, useListReceiptsInfiniteQuery } from '@/store/groceries/services/receiptService';
import type { Receipt } from '@/types/api/groceries/models';
import { monthKey } from '@/utils/groceries/format';

export interface TripMonth {
  month: string;
  trips: Receipt[];
  total: number;
}

/** Saved receipts, newest first, grouped by month and filtered by market. */
export function useTrips() {
  const navigation = useNavigation();
  const [market, setMarket] = useState<string | null>(null);
  const markets = useListMarketsQuery();
  const query = useListReceiptsInfiniteQuery({ status: 'CONFIRMED', market: market ?? undefined });

  const months = useMemo(() => {
    const groups: TripMonth[] = [];
    for (const trip of query.data?.pages.flat() ?? []) {
      const key = trip.issuedAt ? monthKey(new Date(trip.issuedAt)) : '';
      let group = groups[groups.length - 1];
      if (!group || group.month !== key) {
        group = { month: key, trips: [], total: 0 };
        groups.push(group);
      }
      group.trips.push(trip);
      group.total += Number(trip.totalAmount ?? 0);
    }
    return groups;
  }, [query.data]);

  const thisMonth = months.find((m) => m.month === monthKey());

  return {
    months,
    thisMonth: { month: monthKey(), trips: thisMonth?.trips.length ?? 0, total: thisMonth?.total ?? 0 },
    markets: markets.data ?? [],
    market,
    setMarket,
    isLoading: query.isLoading,
    error: query.error,
    isRefreshing: query.isFetching && !query.isFetchingNextPage && !query.isLoading,
    refresh: () => {
      void query.refetch();
      void markets.refetch();
    },
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
    openTrip: (receiptId: string) => navigation.navigate('GroceryTrip', { receiptId }),
  };
}
