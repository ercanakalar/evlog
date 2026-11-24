import { useTranslation } from 'react-i18next';
import { CategoryRatingCard } from '@/components/ratings/CategoryRatingCard';
import { VerificationBanner } from '@/components/ratings/VerificationBanner';
import { Button, ErrorView, Field, Loading, Screen, ScreenHeader, SectionHeader } from '@/components/ui';
import { useRateHome } from '@/hooks/ratings/useRatings';
import { useReceiptScanner } from '@/hooks/receipts/useReceiptScanner';
import { PublishedRatingsScreen } from './PublishedRatingsScreen';

export function RateHomeScreen() {
  const { t } = useTranslation();
  const r = useRateHome();
  const scanner = useReceiptScanner(r.homeId);

  if (r.isLoading) return <Loading />;
  if (!r.eligibility) return <ErrorView error={r.error} onRetry={r.refresh} />;
  if (r.eligibility.alreadyRated) return <PublishedRatingsScreen banner={t('ratings.thanks')} />;

  return (
    <Screen refreshing={r.isRefreshing} onRefresh={r.refresh}>
      <ScreenHeader title={t('ratings.rateTitle')} />
      <VerificationBanner
        verified={r.eligibility.tenancyVerified}
        scanning={scanner.scanning}
        onScanRent={() => scanner.start('RENT')}
      />
      {r.categories.map((c) => (
        <CategoryRatingCard
          key={c.category}
          {...c}
          onScore={(score) => r.setScore(c.category, score)}
          onScan={scanner.start}
        />
      ))}
      <SectionHeader title={t('ratings.note')} />
      <Field
        placeholder={t('ratings.notePlaceholder')}
        multiline
        maxLength={1000}
        value={r.note}
        onChangeText={r.setNote}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <Button
        title={t('ratings.submit')}
        icon="arrow-right"
        disabled={!r.canSubmit}
        loading={r.submitting}
        onPress={() => void r.submit()}
      />
    </Screen>
  );
}
