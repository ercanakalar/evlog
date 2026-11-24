import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, SpaceBetween, Stars, Text } from '@/components/ui';
import { CATEGORY_UNLOCKED_BY } from '@/constants/domain';
import { useTheme } from '@/theme';
import type { RatingCategory, ReceiptKind } from '@/types/api/models';

interface Props {
  category: RatingCategory;
  eligible: boolean;
  evidenceCount: number;
  score: number;
  canRate: boolean;
  onScore: (score: number) => void;
  onScan: (kind: ReceiptKind) => void;
}

export function CategoryRatingCard({ category, eligible, evidenceCount, score, canRate, onScore, onScan }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unlock = CATEGORY_UNLOCKED_BY[category];
  const evidence =
    category === 'HOME_CONDITION' || category === 'NEIGHBORHOOD'
      ? t(`ratings.evidence.${category}`)
      : t(`ratings.evidence.${category}`, { count: evidenceCount });

  return (
    <Card>
      <SpaceBetween>
        <Text variant="label">{t(`ratings.category.${category}`)}</Text>
        <Stars value={score} onChange={canRate ? onScore : undefined} />
      </SpaceBetween>
      <SpaceBetween>
        <Text variant="caption" muted style={{ flex: 1 }}>
          {t(`ratings.hint.${category}`)}
        </Text>
        {eligible ? <Badge tone="success" icon="check" label={evidence} /> : null}
      </SpaceBetween>
      {!eligible ? (
        <Card tone="warm" style={{ padding: 10 }}>
          <SpaceBetween>
            <Text variant="caption" color={colors.warmText} style={{ flex: 1 }}>
              {t('ratings.needs', { requirement: t(`ratings.requirement.${category}`) })}
            </Text>
            {unlock ? (
              <Button
                title={t('ratings.scanReceipt')}
                style={{ minHeight: 34, paddingHorizontal: 14 }}
                onPress={() => onScan(unlock)}
              />
            ) : null}
          </SpaceBetween>
        </Card>
      ) : null}
    </Card>
  );
}
