import { useTranslation } from 'react-i18next';
import { PublishedRatingCard } from '@/components/ratings/PublishedRatingCard';
import { Card, Empty, ErrorView, Loading, Screen, ScreenHeader, Text } from '@/components/ui';
import { usePublishedRatings } from '@/hooks/ratings/useRatings';

export function PublishedRatingsScreen({ banner }: { banner?: string }) {
  const { t } = useTranslation();
  const r = usePublishedRatings();

  if (r.isLoading) return <Loading />;
  if (!r.ratings) return <ErrorView error={r.error} onRetry={r.refresh} />;

  return (
    <Screen withTabBar refreshing={r.isRefreshing} onRefresh={r.refresh}>
      <ScreenHeader title={t('ratings.title')} />
      {banner ? (
        <Card tone="success">
          <Text variant="label">{banner}</Text>
        </Card>
      ) : null}
      {r.ratings.length === 0 ? <Empty text={t('ratings.empty')} /> : null}
      {r.ratings.map((rating) => (
        <PublishedRatingCard key={rating.id} rating={rating} />
      ))}
    </Screen>
  );
}
