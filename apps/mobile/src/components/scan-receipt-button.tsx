import { router } from 'expo-router';
import { Alert } from 'react-native';
import { ApiError } from '@/lib/api';
import { captureImage } from '@/lib/images';
import { useScanReceipt } from '@/lib/queries';
import { RECEIPT_KIND_LABEL } from '@/lib/format';
import type { ReceiptKind } from '@/lib/types';

/**
 * Returns a function that photographs a receipt, uploads it, and opens the
 * review screen with whatever the receipt reader found.
 */
export function useReceiptScanner(homeId: string) {
  const scan = useScanReceipt();

  const start = (kind: ReceiptKind) => {
    Alert.alert(`Scan ${RECEIPT_KIND_LABEL[kind].toLowerCase()}`, undefined, [
      { text: 'Take photo', onPress: () => void run(kind, 'camera') },
      { text: 'Choose from library', onPress: () => void run(kind, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const run = async (kind: ReceiptKind, source: 'camera' | 'library') => {
    try {
      const file = await captureImage(source);
      if (!file) return;
      const receipt = await scan.mutateAsync({ file, kind, homeId });
      router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } });
    } catch (error) {
      const existing =
        error instanceof ApiError && error.status === 409
          ? (error.body as { receiptId?: string }).receiptId
          : undefined;
      if (existing) {
        router.push({ pathname: '/receipt/[id]', params: { id: existing } });
        return;
      }
      Alert.alert('Could not scan receipt', error instanceof Error ? error.message : undefined);
    }
  };

  return { start, scanning: scan.isPending };
}
