import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { scanReceipt } from '@/store/actions/receiptActions';
import { describeError } from '@/store/bases/errorMapping';
import { useAppDispatch } from '@/store/hooks';
import type { ReceiptKind } from '@/types/api/models';

/** Asks camera vs. library, uploads, then opens the review screen. */
export function useReceiptScanner(homeId?: string) {
  const { t } = useTranslation();
  const modal = useModal();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(false);

  const run = async (kind: ReceiptKind, source: 'camera' | 'library') => {
    setScanning(true);
    const result = await dispatch(scanReceipt({ kind, homeId, source }));
    setScanning(false);
    if (scanReceipt.fulfilled.match(result)) {
      if (result.payload) navigation.navigate('ReceiptReview', { receiptId: result.payload });
      return;
    }
    const error = result.payload;
    modal.alert(
      t('receipts.scanFailed'),
      error?.message === 'cameraDenied' ? t('receipts.cameraDenied') : describeError(error, t),
    );
  };

  const start = (kind: ReceiptKind) =>
    modal.choose({
      title: t('receipts.scanTitle', { kind: t(`receipts.kind.${kind}`) }),
      choices: [
        { label: t('receipts.takePhoto'), onPress: () => void run(kind, 'camera') },
        { label: t('receipts.fromLibrary'), onPress: () => void run(kind, 'library') },
      ],
    });

  return { start, scanning };
}
