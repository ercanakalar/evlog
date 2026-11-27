import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { AppModal } from '@/components/ui';
import { receiptImagePath, useAuthedImage } from '@/hooks/common/useAuthedImage';

/**
 * The photo the receipt was read from, full screen. A long receipt shows
 * every part, top first, to scroll through.
 */
export function ReceiptPhoto({
  receiptId,
  parts = 1,
  visible,
  onClose,
}: {
  receiptId: string;
  /** How many photos the receipt has (Receipt.partCount). */
  parts?: number;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AppModal visible={visible} onClose={onClose} presentation="fullscreen" title={t('trip.originalPhoto')}>
      {!visible ? null : parts > 1 ? (
        <ScrollView contentContainerStyle={{ gap: 4 }}>
          {Array.from({ length: parts }, (_, part) => (
            <PhotoPart key={part} receiptId={receiptId} part={part} label={t('trip.photoPart', { part: part + 1, count: parts })} />
          ))}
        </ScrollView>
      ) : (
        <SinglePhoto receiptId={receiptId} label={t('trip.originalPhoto')} />
      )}
    </AppModal>
  );
}

function SinglePhoto({ receiptId, label }: { receiptId: string; label: string }) {
  const source = useAuthedImage(receiptImagePath(receiptId));
  return <Image source={source} contentFit="contain" style={{ flex: 1 }} accessibilityLabel={label} />;
}

/** One part at full width, as tall as its photo. */
function PhotoPart({ receiptId, part, label }: { receiptId: string; part: number; label: string }) {
  const source = useAuthedImage(receiptImagePath(receiptId, part));
  const [ratio, setRatio] = useState(0.6);
  return (
    <Image
      source={source}
      contentFit="contain"
      onLoad={(e) => e.source.height > 0 && setRatio(e.source.width / e.source.height)}
      style={{ width: '100%', aspectRatio: ratio }}
      accessibilityLabel={label}
    />
  );
}
