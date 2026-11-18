import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui';
import { receiptImagePath, useAuthedImage } from '@/hooks/common/useAuthedImage';

/** The photo the receipt was read from, full screen. */
export function ReceiptPhoto({ receiptId, visible, onClose }: { receiptId: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const source = useAuthedImage(visible ? receiptImagePath(receiptId) : undefined);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#0E1011' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ alignItems: 'flex-end', paddingHorizontal: 8 }}>
            <IconButton icon="x" label={t('common.close')} color="#FCFCFA" onPress={onClose} />
          </View>
          <Image
            source={source}
            contentFit="contain"
            style={{ flex: 1 }}
            accessibilityLabel={t('trip.originalPhoto')}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
