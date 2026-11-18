import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { RECEIPT_POLL_MS } from '@/constants/domain';
import {
  useConfirmReceiptMutation,
  useGetReceiptQuery,
  useUpdateReceiptMutation,
} from '@/store/services/receiptService';
import type { Receipt } from '@/types/api/models';
import { receiptFieldsSchema, type ReceiptFieldsValues } from '@/utils/validation';
import { useErrorAlert } from '../common/useErrorAlert';

const isWaiting = (r: Receipt | undefined) => r?.status === 'PENDING' || r?.status === 'PROCESSING';

/** Loads the receipt and polls while the reader is still working. */
export function useReceipt(receiptId: string) {
  const first = useGetReceiptQuery(receiptId);
  const polling = useGetReceiptQuery(receiptId, {
    pollingInterval: isWaiting(first.data) ? RECEIPT_POLL_MS : 0,
    skipPollingIfUnfocused: true,
  });
  return polling;
}

/** Review form: pre-filled with what the reader found; saves then confirms. */
export function useReceiptForm(receipt: Receipt) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const [update, { isLoading: saving }] = useUpdateReceiptMutation();
  const [confirm, { isLoading: confirming }] = useConfirmReceiptMutation();
  const form = useForm<ReceiptFieldsValues>({
    resolver: zodResolver(receiptFieldsSchema),
    mode: 'onChange',
    defaultValues: {
      merchantName: receipt.merchantName ?? '',
      issuedOn: receipt.issuedAt?.slice(0, 10) ?? '',
      total: receipt.totalAmount ?? '',
    },
  });

  const submit = form.handleSubmit(async ({ merchantName, issuedOn, total }) => {
    try {
      await update({
        id: receipt.id,
        merchantName: merchantName || undefined,
        issuedAt: new Date(`${issuedOn}T12:00:00`).toISOString(),
        totalAmount: Number(total.replace(',', '.')),
      }).unwrap();
      await confirm(receipt.id).unwrap();
      navigation.goBack();
    } catch (error) {
      showError(t('receipts.confirmFailed'), error);
    }
  });

  return {
    control: form.control,
    submit,
    isValid: form.formState.isValid,
    isSubmitting: saving || confirming,
    editable: receipt.status === 'PARSED' || receipt.status === 'FAILED',
  };
}
