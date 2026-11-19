import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { useGetItemQuery, useUpdateItemMutation } from '@/store/services/itemService';
import type { UpdateItemRequest } from '@/types/api/requests';

/**
 * One product's countdown: open it, set the pack date, or mark it used up.
 * Using it up (after a confirmation) lowers its count at home; anything that
 * runs out goes on the market list, and a notice says so.
 */
export function useProduct(itemId: string) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const modal = useModal();
  const item = useGetItemQuery(itemId);
  const [update, updateState] = useUpdateItemMutation();

  const change = (patch: Omit<UpdateItemRequest, 'id'>) =>
    update({ id: itemId, ...patch })
      .unwrap()
      .catch((error: unknown) => {
        showError(t('product.updateFailed'), error);
        return null;
      });

  const markUsedUp = async () => {
    const updated = await change({ usedUp: true, newListName: t('lists.defaultName') });
    if (!updated) return;
    navigation.goBack();
    const list = updated.addedToList;
    if (list) {
      modal.alert(t('product.addedToList', { list: list.name }), t('product.ranOut', { names: list.added.join(', ') }));
    }
  };

  return {
    item: item.data,
    isLoading: item.isLoading,
    error: item.error,
    refetch: item.refetch,
    updating: updateState.isLoading,
    setOpened: (opened: boolean) => void change({ opened }),
    setPackDate: (isoDay: string | null) =>
      change({ packExpiresAt: isoDay === null ? null : new Date(`${isoDay}T12:00:00`).toISOString() }).then(Boolean),
    usedUp: () =>
      modal.confirm({
        title: t('product.usedUpTitle', { name: item.data?.name ?? '' }),
        message: t('product.usedUpBody'),
        confirmLabel: t('product.usedUpConfirm'),
        onConfirm: markUsedUp,
      }),
    openTrip: (receiptId: string) => navigation.navigate('TripDetail', { receiptId }),
    scanPack: () => navigation.navigate('PackScan', { itemId }),
  };
}
