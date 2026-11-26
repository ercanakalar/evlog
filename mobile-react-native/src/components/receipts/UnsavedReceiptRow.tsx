import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Receipt } from '@/types/api/models';

/** A scanned receipt that is not a trip yet: being read, waiting for review, or unreadable. */
export function UnsavedReceiptRow({
  receipt,
  reading,
  onPress,
}: {
  receipt: Receipt;
  reading: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const failed = receipt.status === 'FAILED';
  const title = reading
    ? t('home.reading')
    : failed
      ? t('review.failedTitle')
      : (receipt.merchantName ?? t('trips.unknownMarket'));
  const detail = reading
    ? t('home.scannedOn', { day: f.day(receipt.createdAt) })
    : failed
      ? t('home.tapToFix')
      : t('home.tapToReview');
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${detail}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {reading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Feather
            name={failed ? 'alert-circle' : 'edit-3'}
            size={20}
            color={failed ? colors.urgentText : colors.text}
          />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="small" muted>
            {detail}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </View>
    </Card>
  );
}
