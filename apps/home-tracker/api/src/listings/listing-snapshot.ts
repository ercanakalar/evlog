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

/** Ids in a snapshot that may still be shown; a moderator can hide any of them later. */
export interface Visible {
  ratings: ReadonlySet<string>;
  notes: ReadonlySet<string>;
  photos: ReadonlySet<string>;
}

/** What a broker may see today of a snapshot the owner sent earlier. */
export function visiblePart(
  snapshot: Record<string, unknown>,
  visible: Visible,
): Record<string, unknown> {
  let result = snapshot;
  if (snapshot.ratings) {
    const ratings = ratingsOf(snapshot)
      .filter((r) => visible.ratings.has(r.id))
      .map((r) => (visible.notes.has(r.id) ? r : { ...r, noteForNextTenant: null }));
    result =
      ratings.length === ratingsOf(snapshot).length
        ? { ...result, ratings }
        : withRatings(result, ratings);
  }
  if (snapshot.photos) {
    const photos = (snapshot.photos as { id: string }[]).filter((p) => visible.photos.has(p.id));
    const cover = snapshot.coverPhotoId as string | null;
    result = {
      ...result,
      photos,
      coverPhotoId: cover && visible.photos.has(cover) ? cover : (photos[0]?.id ?? null),
    };
  }
  return result;
}
