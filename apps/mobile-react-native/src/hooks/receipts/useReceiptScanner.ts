import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { scanReceipt } from '@/store/actions/receiptActions';
import { describeError } from '@/store/bases/errorMapping';
import { useAppDispatch } from '@/store/hooks';
import type { ReceiptKind } from '@/types/api/models';

/** Asks camera vs. library, uploads, then opens the review screen. */
export function useReceiptScanner(homeId?: string) {
  const { t } = useTranslation();
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
    Alert.alert(
      t('receipts.scanFailed'),
      error?.message === 'cameraDenied' ? t('receipts.cameraDenied') : describeError(error, t),
    );
  };

  const start = (kind: ReceiptKind) =>
    Alert.alert(t('receipts.scanTitle', { kind: t(`receipts.kind.${kind}`) }), undefined, [
      { text: t('receipts.takePhoto'), onPress: () => void run(kind, 'camera') },
      { text: t('receipts.fromLibrary'), onPress: () => void run(kind, 'library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return { start, scanning };
}
