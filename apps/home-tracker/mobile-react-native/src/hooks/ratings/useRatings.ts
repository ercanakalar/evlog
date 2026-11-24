import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RATING_CATEGORIES } from '@/constants/domain';
import {
  useGetEligibilityQuery,
  useListRatingsQuery,
  useSubmitRatingMutation,
} from '@/store/services/ratingService';
import type { RatingCategory } from '@/types/api/models';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';

export function usePublishedRatings() {
  const { home } = useCurrentHome();
  const ratings = useListRatingsQuery(home.id);
  return {
    ratings: ratings.data,
    isLoading: ratings.isLoading,
    isRefreshing: ratings.isFetching && !ratings.isLoading,
    error: ratings.error,
    refresh: ratings.refetch,
  };
}

/** Tenant flow: which categories have evidence, stars per category, submit. */
export function useRateHome() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const { home } = useCurrentHome();
  const eligibility = useGetEligibilityQuery(home.id);
  const [submitRating, { isLoading: submitting }] = useSubmitRatingMutation();
  const [scores, setScores] = useState<Partial<Record<RatingCategory, number>>>({});
  const [note, setNote] = useState('');

  const e = eligibility.data;
  const categories = RATING_CATEGORIES.map((category) => {
    const info = e?.categories.find((c) => c.category === category);
    return {
      category,
      eligible: info?.eligible ?? false,
      evidenceCount: info?.receiptIds.length ?? 0,
      score: scores[category] ?? 0,
      canRate: Boolean(info?.eligible && e?.tenancyVerified),
    };
  });
  const rated = categories.filter((c) => c.score > 0);

  const setScore = (category: RatingCategory, score: number) => setScores((s) => ({ ...s, [category]: score }));

  const submit = () =>
    submitRating({
      homeId: home.id,
      scores: rated.map(({ category, score }) => ({ category, score })),
      noteForNextTenant: note.trim() || undefined,
    })
      .unwrap()
      .catch((error: unknown) => showError(t('ratings.submitFailed'), error));

  return {
    homeId: home.id,
    eligibility: e,
    isLoading: eligibility.isLoading,
    isRefreshing: eligibility.isFetching && !eligibility.isLoading,
    error: eligibility.error,
    refresh: eligibility.refetch,
    categories,
    setScore,
    note,
    setNote,
    canSubmit: Boolean(e?.tenancyVerified) && rated.length > 0,
    submit,
    submitting,
  };
}
