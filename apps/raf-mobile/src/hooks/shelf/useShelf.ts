import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import {
  useAddHomeItemMutation,
  useListHomeItemsQuery,
  useRemoveHomeItemMutation,
  useSetHomeItemCountMutation,
} from '@/store/services/homeItemService';
import { useListShelfQuery } from '@/store/services/itemService';
import { useGetMeQuery } from '@/store/services/meService';
import type { Category } from '@/types/api/models';

export type ShelfView = 'countdown' | 'atHome';

/** Countdown of everything bought, filtered by category. */
export function useCountdown() {
  const navigation = useNavigation();
  const [category, setCategory] = useState<Category | 'ALL'>('ALL');
  const shelf = useListShelfQuery();
  const expiring = (shelf.data ?? []).filter((i) => i.daysLeft !== null);
  const categories = [...new Set(expiring.map((i) => i.category))];
  return {
    items: category === 'ALL' ? expiring : expiring.filter((i) => i.category === category),
    categories,
    category,
    setCategory,
    isLoading: shelf.isLoading,
    error: shelf.error,
    isRefreshing: shelf.isFetching && !shelf.isLoading,
    refresh: shelf.refetch,
    openProduct: (itemId: string) => navigation.navigate('Product', { itemId }),
  };
}

/** Products kept at home with their counts. */
export function useAtHome() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const me = useGetMeQuery();
  const items = useListHomeItemsQuery(undefined, { skip: me.data?.trackHomeItems === false });
  const [add] = useAddHomeItemMutation();
  const [setCount] = useSetHomeItemCountMutation();
  const [remove] = useRemoveHomeItemMutation();
  return {
    enabled: me.data?.trackHomeItems !== false,
    items: items.data ?? [],
    isLoading: items.isLoading,
    error: items.error,
    isRefreshing: items.isFetching && !items.isLoading,
    refresh: items.refetch,
    add: (name: string) => add({ name }).unwrap().catch((error: unknown) => showError(t('atHome.addFailed'), error)),
    change: (id: string, count: number) => void setCount({ id, count: Math.max(0, count) }),
    remove: (id: string) => void remove(id).unwrap().catch((error: unknown) => showError(t('common.somethingWrong'), error)),
  };
}
