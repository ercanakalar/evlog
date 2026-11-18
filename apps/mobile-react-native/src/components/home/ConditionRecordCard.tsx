import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Card, Row, SpaceBetween, Text } from '@/components/ui';
import { radius } from '@/constants/layout';
import { conditionPhotoPath, useAuthedImage } from '@/hooks/common/useAuthedImage';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Dashboard } from '@/types/api/models';

type Record = NonNullable<Dashboard['conditionRecord']>;

function Thumb({ photoId }: { photoId: string }) {
  const { colors } = useTheme();
  const source = useAuthedImage(conditionPhotoPath(photoId));
  return (
    <Image
      source={source}
      contentFit="cover"
      style={{ flex: 1, height: 56, borderRadius: radius.sm, backgroundColor: colors.cardMuted }}
    />
  );
}

export function ConditionRecordCard({ record, onPress }: { record: Record | null; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  return (
    <Card onPress={onPress} accessibilityLabel={t('record.title')}>
      <SpaceBetween>
        <Text variant="heading">{t('record.title')}</Text>
        {record ? (
          <Badge
            label={t(`record.status.${record.status}`)}
            tone={record.status === 'CONFIRMED' ? 'success' : 'neutral'}
            icon={record.status === 'CONFIRMED' ? 'check' : undefined}
          />
        ) : null}
      </SpaceBetween>
      {record ? (
        <>
          <Row>
            {record.previewPhotoIds.map((id) => (
              <Thumb key={id} photoId={id} />
            ))}
            {record.photoCount > record.previewPhotoIds.length ? (
              <View
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: radius.sm,
                  backgroundColor: colors.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text variant="label" color={colors.onInk}>
                  +{record.photoCount - record.previewPhotoIds.length}
                </Text>
              </View>
            ) : null}
          </Row>
          <Text variant="caption" muted>
            {t(`record.type.${record.type}`)} · {f.dateTime(record.startedAt)}
          </Text>
        </>
      ) : (
        <Text muted>{t('record.empty')}</Text>
      )}
    </Card>
  );
}
