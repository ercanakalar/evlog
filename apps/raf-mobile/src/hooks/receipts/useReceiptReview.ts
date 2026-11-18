import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { RECEIPT_POLL_MS } from '@/constants/domain';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { useListHomeItemsQuery } from '@/store/services/homeItemService';
import { useGetMeQuery } from '@/store/services/meService';
import {
  receiptService,
  useConfirmReceiptMutation,
  useDeleteReceiptMutation,
  useGetReceiptQuery,
  useRescanReceiptMutation,
  useUpdateReceiptMutation,
} from '@/store/services/receiptService';
import type { Category, HomeUnit, Receipt, ReceiptItem } from '@/types/api/models';
import type { ReceiptLineInput } from '@/types/api/requests';
import { amountBought, namesMatch } from '@/utils/match';

const toLine = (item: ReceiptItem, patch: Partial<ReceiptLineInput> = {}): ReceiptLineInput => ({
  name: item.name,
  rawName: item.rawName,
  quantity: Number(item.quantity),
  unit: item.unit ?? undefined,
  totalPrice: Number(item.totalPrice),
  category: item.category,
  shelfLifeDays: item.shelfLifeDays,
  checked: !item.needsReview,
  ...patch,
});

const itemsTotal = (receipt: Receipt) =>
  Math.round((receipt.items ?? []).reduce((sum, i) => sum + Number(i.totalPrice), 0) * 100) / 100;

/** Review what the reader found, fix lines, then save the receipt as a trip. */
export function useReceiptReview(receiptId: string) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  // Poll only while the reader is still working on the photo.
  const cached = receiptService.endpoints.getReceipt.useQueryState(receiptId);
  const status = cached.data?.status;
  const polling = !status || status === 'PENDING' || status === 'PROCESSING';
  const query = useGetReceiptQuery(receiptId, { pollingInterval: polling ? RECEIPT_POLL_MS : 0 });
  const receipt = query.data;
  const waiting = receipt?.status === 'PENDING' || receipt?.status === 'PROCESSING';

  const me = useGetMeQuery();
  const homeItems = useListHomeItemsQuery(undefined, { skip: !me.data?.trackHomeItems });
  const [update, updateState] = useUpdateReceiptMutation();
  const [confirm, confirmState] = useConfirmReceiptMutation();
  const [rescan, rescanState] = useRescanReceiptMutation();
  const [remove] = useDeleteReceiptMutation();

  const countsAtHome = me.data?.trackHomeItems && me.data.countFromReceipts;
  /** What each line will add to a matching at-home item when saved. */
  const homeMatches = useMemo(() => {
    const map = new Map<string, { amount: number; unit: HomeUnit }>();
    if (!countsAtHome) return map;
    for (const item of receipt?.items ?? []) {
      const home = (homeItems.data ?? []).find((h) => namesMatch(h.name, item.name) || namesMatch(h.name, item.rawName));
      const amount = home ? amountBought(item, home.unit) : 0;
      if (home && amount > 0) map.set(item.id, { amount, unit: home.unit });
    }
    return map;
  }, [countsAtHome, homeItems.data, receipt?.items]);

  const editLine = async (itemId: string, patch: Partial<ReceiptLineInput>) => {
    if (!receipt?.items) return;
    try {
      await update({
        id: receipt.id,
        items: receipt.items.map((i) => (i.id === itemId ? toLine(i, { ...patch, checked: true }) : toLine(i))),
      }).unwrap();
    } catch (error) {
      showError(t('review.saveFailed'), error);
    }
  };

  const toCheck = (receipt?.items ?? []).filter((i) => i.needsReview).length;
  const sum = receipt ? itemsTotal(receipt) : 0;
  const matchesTotal = receipt?.totalAmount !== null && receipt?.totalAmount !== undefined && Math.abs(sum - Number(receipt.totalAmount)) < 0.01;

  return {
    receipt,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    waiting,
    homeMatches,
    toCheck,
    matchesTotal,
    itemsSum: sum,
    saving: confirmState.isLoading,
    updating: updateState.isLoading,
    rescanning: rescanState.isLoading,
    confirmLine: (itemId: string) => void editLine(itemId, {}),
    fixLine: (itemId: string, name: string, category: Category) => void editLine(itemId, { name, category }),
    updateHeader: async (fields: { merchantName: string; issuedAt: string; totalAmount: number }) => {
      try {
        await update({ id: receiptId, ...fields }).unwrap();
        return true;
      } catch (error) {
        showError(t('review.saveFailed'), error);
        return false;
      }
    },
    save: async () => {
      try {
        await confirm(receiptId).unwrap();
        navigation.navigate('TripDetail', { receiptId });
      } catch (error) {
        showError(t('review.saveFailed'), error);
      }
    },
    rescan: () => void rescan(receiptId).unwrap().catch((error: unknown) => showError(t('scan.failed'), error)),
    discard: () =>
      Alert.alert(t('review.discardTitle'), t('review.discardBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('review.discard'),
          style: 'destructive',
          onPress: () =>
            void remove(receiptId)
              .unwrap()
              .then(() => navigation.goBack())
              .catch((error: unknown) => showError(t('common.somethingWrong'), error)),
        },
      ]),
  };
}
