import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { CATEGORIES } from '@/constants/domain';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import { useDeleteReceiptMutation, useGetReceiptQuery } from '@/store/services/receiptService';
import type { Category, ReceiptItem } from '@/types/api/models';

const DAY = 86_400_000;

/** Whole days from today until a date (local calendar), never below 0. */
export const daysUntil = (iso: string | null) => {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((new Date(iso).getTime() - today.getTime()) / DAY));
};

/** A saved receipt, its lines grouped by category. */
export function useTripDetail(receiptId: string) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const modal = useModal();
  const query = useGetReceiptQuery(receiptId);
  const [remove] = useDeleteReceiptMutation();
  const [photoOpen, setPhotoOpen] = useState(false);

  const groups = useMemo(() => {
    const byCategory = new Map<Category, ReceiptItem[]>();
    for (const item of query.data?.items ?? []) {
      byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
    }
    return CATEGORIES.flatMap((category) => {
      const items = byCategory.get(category);
      return items ? [{ category, items }] : [];
    });
  }, [query.data?.items]);

  return {
    receipt: query.data,
    groups,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    photoOpen,
    setPhotoOpen,
    openProduct: (itemId: string) => navigation.navigate('Product', { itemId }),
    remove: () =>
      modal.confirm({
        title: t('trip.deleteTitle'),
        message: t('trip.deleteBody'),
        confirmLabel: t('trip.delete'),
        destructive: true,
        onConfirm: () =>
          remove(receiptId)
            .unwrap()
            .then(() => navigation.goBack())
            .catch((error: unknown) => showError(t('common.somethingWrong'), error)),
      }),
  };
}
