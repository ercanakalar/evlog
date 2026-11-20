import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@/components/ui';
import { receiptImagePath, useAuthedImage } from '@/hooks/common/useAuthedImage';

/** The photo the receipt was read from, full screen. */
export function ReceiptPhoto({ receiptId, visible, onClose }: { receiptId: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const source = useAuthedImage(visible ? receiptImagePath(receiptId) : undefined);
  return (
    <AppModal visible={visible} onClose={onClose} presentation="fullscreen" title={t('trip.originalPhoto')}>
      <Image source={source} contentFit="contain" style={{ flex: 1 }} accessibilityLabel={t('trip.originalPhoto')} />
    </AppModal>
  );
}
