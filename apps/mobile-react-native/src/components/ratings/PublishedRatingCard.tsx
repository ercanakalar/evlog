import { useTranslation } from 'react-i18next';
import { Card, SpaceBetween, Stars, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import type { PublishedRating } from '@/types/api/models';

export function PublishedRatingCard({ rating }: { rating: PublishedRating }) {
  const { t } = useTranslation();
  const f = useFormatters();
  return (
    <Card>
      <Text variant="caption" muted>
        {t('ratings.tenancyFrom', { date: f.monthYear(rating.submittedAt) })}
      </Text>
      {rating.scores.map((s) => (
        <SpaceBetween key={s.category}>
          <Text>{t(`ratings.category.${s.category}`)}</Text>
          <Stars value={s.score} size={15} />
        </SpaceBetween>
      ))}
      {rating.noteForNextTenant ? <Text muted>“{rating.noteForNextTenant}”</Text> : null}
    </Card>
  );
}
