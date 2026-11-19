import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { useGetItemQuery, useUpdateItemMutation } from '@/store/services/itemService';
import type { UpdateItemRequest } from '@/types/api/requests';

/** One product's countdown: open it, set the pack date, or mark it used up. */
export function useProduct(itemId: string) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const item = useGetItemQuery(itemId);
  const [update, updateState] = useUpdateItemMutation();

  const change = (patch: Omit<UpdateItemRequest, 'id'>) =>
    update({ id: itemId, ...patch })
      .unwrap()
      .then(() => true)
      .catch((error: unknown) => {
        showError(t('product.updateFailed'), error);
        return false;
      });

  return {
    item: item.data,
    isLoading: item.isLoading,
    error: item.error,
    refetch: item.refetch,
    updating: updateState.isLoading,
    setOpened: (opened: boolean) => void change({ opened }),
    setPackDate: (isoDay: string | null) =>
      change({ packExpiresAt: isoDay === null ? null : new Date(`${isoDay}T12:00:00`).toISOString() }),
    usedUp: () => void change({ usedUp: true }).then((ok) => ok && navigation.goBack()),
    openTrip: (receiptId: string) => navigation.navigate('TripDetail', { receiptId }),
    scanPack: () => navigation.navigate('PackScan', { itemId }),
  };
}
