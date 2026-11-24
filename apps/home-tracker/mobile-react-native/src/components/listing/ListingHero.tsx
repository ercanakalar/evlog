import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Row } from '@/components/ui';
import { radius } from '@/constants/layout';
import { conditionPhotoPath, useAuthedImage } from '@/hooks/common/useAuthedImage';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';

export function ListingHero({
  coverPhotoId,
  recordDate,
  score,
}: {
  coverPhotoId?: string;
  recordDate?: string;
  score: number | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const source = useAuthedImage(coverPhotoId ? conditionPhotoPath(coverPhotoId) : undefined);
  return (
    <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cardMuted, height: 170 }}>
      {source ? <Image source={source} style={{ flex: 1 }} contentFit="cover" /> : null}
      <Row style={{ position: 'absolute', left: 12, bottom: 12 }}>
        {recordDate ? <Badge tone="success" icon="check" label={t('listing.record', { date: f.shortDate(recordDate) })} /> : null}
        {score ? <Badge tone="ink" label={t('listing.score', { score: score.toFixed(1) })} /> : null}
      </Row>
    </View>
  );
}
