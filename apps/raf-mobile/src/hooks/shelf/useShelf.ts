import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { HOME_STEP } from '@/constants/domain';
import {
  useAddHomeItemMutation,
  useListHomeItemsQuery,
  useRemoveHomeItemMutation,
  useSetHomeItemCountMutation,
  useSetHomeItemUnitMutation,
} from '@/store/services/homeItemService';
import { useListShelfQuery } from '@/store/services/itemService';
import { useGetMeQuery } from '@/store/services/meService';
import type { Category, HomeItem, HomeUnit } from '@/types/api/models';

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

/** Products kept at home, counted in pieces or kilograms. */
export function useAtHome() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const me = useGetMeQuery();
  const items = useListHomeItemsQuery(undefined, { skip: me.data?.trackHomeItems === false });
  const [add] = useAddHomeItemMutation();
  const [setCount] = useSetHomeItemCountMutation();
  const [setUnit] = useSetHomeItemUnitMutation();
  const [remove] = useRemoveHomeItemMutation();
  // Unit for the next product added; remembered while the screen is open.
  const [newUnit, setNewUnit] = useState<HomeUnit>('PIECE');
  const fail = (error: unknown) => showError(t('common.somethingWrong'), error);
  return {
    enabled: me.data?.trackHomeItems !== false,
    items: items.data ?? [],
    isLoading: items.isLoading,
    error: items.error,
    isRefreshing: items.isFetching && !items.isLoading,
    refresh: items.refetch,
    newUnit,
    setNewUnit,
    add: (name: string) =>
      add({ name, unit: newUnit }).unwrap().catch((error: unknown) => showError(t('atHome.addFailed'), error)),
    /** One step up or down: 1 piece, or 0.1 kg. */
    step: (item: HomeItem, direction: 1 | -1) => {
      const next = Math.round((item.count + direction * HOME_STEP[item.unit]) * 1000) / 1000;
      void setCount({ id: item.id, count: Math.max(0, next) });
    },
    changeUnit: (id: string, unit: HomeUnit) => void setUnit({ id, unit }).unwrap().catch(fail),
    remove: (id: string) => void remove(id).unwrap().catch(fail),
    open: (homeItemId: string) => navigation.navigate('HomeItem', { homeItemId }),
  };
}
