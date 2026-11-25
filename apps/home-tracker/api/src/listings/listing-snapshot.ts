import { averageScores, type HomeScore } from '../ratings/home-score';

interface SnapshotRating {
  id: string;
  noteForNextTenant: string | null;
  scores: { category: string; score: number }[];
}

const ratingsOf = (snapshot: Record<string, unknown>) =>
  (snapshot.ratings as SnapshotRating[] | undefined) ?? [];

const withRatings = (snapshot: Record<string, unknown>, ratings: SnapshotRating[]) => ({
  ...snapshot,
  ratings,
  score: averageScores(ratings) satisfies HomeScore,
});

/**
 * The snapshot without what came from one person: their ratings (and scores)
 * and, when they added gas bills, the monthly totals those are part of.
 */
export function withoutPerson(
  snapshot: Record<string, unknown>,
  person: { ratingIds: ReadonlySet<string>; hasGasBills: boolean },
): Record<string, unknown> {
  const ratings = ratingsOf(snapshot);
  const kept = ratings.filter((r) => !person.ratingIds.has(r.id));
  const result: Record<string, unknown> =
    kept.length === ratings.length ? { ...snapshot } : withRatings(snapshot, kept);
  if (person.hasGasBills) delete result.heatingBills;
  return result;
}
