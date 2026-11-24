import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { RECEIPT_POLL_MS } from '@/constants/groceries';
import { useErrorAlert } from '@/hooks/groceries/common/useErrorAlert';
import { useListHomeItemsQuery } from '@/store/groceries/services/homeItemService';
import { useGetMeQuery } from '@/store/groceries/services/meService';
import {
  receiptService,
  useConfirmReceiptMutation,
  useDeleteReceiptMutation,
  useGetReceiptQuery,
  useRescanReceiptMutation,
  useUpdateReceiptMutation,
} from '@/store/groceries/services/receiptService';
import type { Category, HomeUnit, Receipt, ReceiptItem } from '@/types/api/groceries/models';
import type { ReceiptLineInput } from '@/types/api/groceries/requests';
import { amountBought, homeName, namesMatch } from '@/utils/groceries/match';

const toLine = (item: ReceiptItem, patch: Partial<ReceiptLineInput> = {}): ReceiptLineInput => ({
  name: item.name,
  rawName: item.rawName,
  quantity: Number(item.quantity),
  unit: item.unit ?? undefined,
  totalPrice: Number(item.totalPrice),
  category: item.category,
  shelfLifeDays: item.shelfLifeDays,
  checked: !item.needsReview,
  barcode: item.barcode ?? undefined,
  onShelf: item.onShelf,
  countAtHome: item.countAtHome,
  ...patch,
});

/** What saving does with one line: if checked, a countdown and a count at home (to a match, or as a new product). */
export interface LineChoice {
  tracked: boolean;
  /** What it adds to a matching at-home product. */
  adds?: { amount: number; unit: HomeUnit };
  /** No at-home product matches: saving adds one with this name. */
  newAtHome?: string;
}

const itemsTotal = (receipt: Receipt) =>
  Math.round((receipt.items ?? []).reduce((sum, i) => sum + Number(i.totalPrice), 0) * 100) / 100;

/** Review what the reader found, fix lines, then save the receipt as a trip. */
export function useReceiptReview(receiptId: string) {
  const { t } = useTranslation('groceries');
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const modal = useModal();
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
  /**
   * What saving does with each line. Checked (the default) keeps a countdown
   * and counts it at home: on the matching at-home product, or as a new one
   * (same rules as the API: not for products the reader could not place).
   */
  const choices = useMemo(() => {
    const map = new Map<string, LineChoice>();
    for (const item of receipt?.items ?? []) {
      const tracked = item.onShelf;
      if (!countsAtHome || !tracked || item.countAtHome === false) {
        map.set(item.id, { tracked });
        continue;
      }
      const home = (homeItems.data ?? []).find((h) => namesMatch(h.name, item.name) || namesMatch(h.name, item.rawName));
      const amount = home ? amountBought(item, home.unit) : 0;
      map.set(item.id, {
        tracked,
        adds: home && amount > 0 ? { amount, unit: home.unit } : undefined,
        newAtHome: !home && item.countAtHome && !item.needsReview ? homeName(item.name) : undefined,
      });
    }
    return map;
  }, [countsAtHome, homeItems.data, receipt?.items]);

  const lines = receipt?.items ?? [];
  const tracked = lines.filter((i) => choices.get(i.id)?.tracked);
  const selection = {
    tracked: tracked.length,
    total: lines.length,
    /** What the checked products cost. */
    sum: Math.round(tracked.reduce((sum, i) => sum + Number(i.totalPrice), 0) * 100) / 100,
  };

  /** Saves a change to one line; `confirm` also marks an unsure match as checked. */
  const editLine = async (itemId: string, patch: Partial<ReceiptLineInput>, confirm = true) => {
    if (!receipt?.items) return;
    try {
      await update({
        id: receipt.id,
        items: receipt.items.map((i) => (i.id === itemId ? toLine(i, confirm ? { ...patch, checked: true } : patch) : toLine(i))),
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
    choices,
    selection,
    toCheck,
    matchesTotal,
    itemsSum: sum,
    saving: confirmState.isLoading,
    updating: updateState.isLoading,
    rescanning: rescanState.isLoading,
    confirmLine: (itemId: string) => void editLine(itemId, {}),
    /** Checks or unchecks a line: both its countdown and its count at home. */
    setTracked: (itemId: string, on: boolean) => void editLine(itemId, { onShelf: on, countAtHome: on }, false),
    fixLine: (itemId: string, name: string, category: Category, quantity: number) =>
      void editLine(itemId, { name, category, quantity }),
    /** Drops a line the reader got wrong (e.g. read twice where photos overlap). */
    removeLine: (itemId: string, name: string) =>
      modal.confirm({
        title: t('review.removeLineTitle', { name }),
        message: t('review.removeLineBody'),
        confirmLabel: t('review.removeLine'),
        destructive: true,
        onConfirm: async () => {
          if (!receipt?.items) return;
          try {
            await update({
              id: receipt.id,
              items: receipt.items.filter((i) => i.id !== itemId).map((i) => toLine(i)),
            }).unwrap();
          } catch (error) {
            showError(t('review.saveFailed'), error);
          }
        },
      }),
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
        navigation.navigate('GroceryTrip', { receiptId });
      } catch (error) {
        showError(t('review.saveFailed'), error);
      }
    },
    rescan: () => void rescan(receiptId).unwrap().catch((error: unknown) => showError(t('scan.failed'), error)),
    discard: () =>
      modal.confirm({
        title: t('review.discardTitle'),
        message: t('review.discardBody'),
        confirmLabel: t('review.discard'),
        destructive: true,
        onConfirm: () =>
          remove(receiptId)
            .unwrap()
            .then(() => navigation.goBack())
            .catch((error: unknown) => showError(t('common.somethingWrong'), error)),
      }),
  };
}
