import { useState } from 'react';
import { SPENDING_MONTHS } from '@/constants/domain';
import { utcOffset } from '@/store/bases/query';
import { useGetSpendingQuery } from '@/store/services/insightService';
import { useGetMeQuery } from '@/store/services/meService';
import { monthKey } from '@/utils/format';

export type Breakdown = 'categories' | 'markets';

/** Six months of spending; one month broken down by category or market. */
export function useSpending(initialMonth?: string) {
  const [month, setMonth] = useState(initialMonth ?? monthKey());
  const [view, setView] = useState<Breakdown>('categories');
  const query = useGetSpendingQuery({ month, months: SPENDING_MONTHS, utcOffset: utcOffset() });
  const currency = useGetMeQuery().data?.currency;
  const data = query.currentData ?? query.data;
  const peak = Math.max(1, ...(data?.months ?? []).map((m) => Number(m.total)));

  return {
    data,
    currency,
    month,
    isCurrent: month === monthKey(),
    setMonth,
    view,
    setView,
    peak,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
