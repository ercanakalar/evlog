import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, IconButton, SpaceBetween, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export function ScanReceiptCard({ onScan, scanning }: { onScan: () => void; scanning: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card tone="primary" onPress={onScan} accessibilityLabel={t('kitchen.scan')}>
      <SpaceBetween>
        <View style={{ flex: 1 }}>
          <Text variant="heading" color={colors.onPrimary} style={{ fontSize: 20 }}>
            {t('kitchen.scan')}
          </Text>
          <Text variant="caption" color={colors.onPrimary}>
            {scanning ? t('kitchen.scanning') : t('kitchen.scanHint')}
          </Text>
        </View>
        <IconButton icon="maximize" tone="light" size={44} label={t('kitchen.scan')} onPress={onScan} />
      </SpaceBetween>
    </Card>
  );
}
