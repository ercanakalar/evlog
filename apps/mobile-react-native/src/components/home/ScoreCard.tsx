import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, IconButton, SpaceBetween, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { HomeScore } from '@/types/api/models';

export function ScoreCard({ score, onOpen }: { score: HomeScore; onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card tone="ink">
      <Text variant="caption" color={colors.onInk}>
        {t('home.score')}
      </Text>
      <SpaceBetween style={{ alignItems: 'flex-end' }}>
        <View>
          <Text variant="display" color={colors.onInk}>
            {score.score?.toFixed(1) ?? '—'}
          </Text>
          <Text variant="caption" color={colors.onInk}>
            {score.ratingCount === 0 ? t('home.noRatings') : t('home.ratingsSummary', { count: score.ratingCount })}
          </Text>
        </View>
        <IconButton icon="arrow-up-right" tone="accent" label={t('home.openRatings')} onPress={onOpen} />
      </SpaceBetween>
    </Card>
  );
}
