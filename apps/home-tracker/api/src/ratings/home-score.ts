export interface HomeScore {
  score: number | null;
  ratingCount: number;
  categories: Record<string, number>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** Average of every rating's mean score, plus per-category averages. */
export function averageScores(
  ratings: { scores: { category: string; score: number }[] }[],
): HomeScore {
  if (ratings.length === 0) return { score: null, ratingCount: 0, categories: {} };
  const byCategory: Record<string, number[]> = {};
  for (const { scores } of ratings) {
    for (const { category, score } of scores) (byCategory[category] ??= []).push(score);
  }
  return {
    score: round1(mean(ratings.map((r) => mean(r.scores.map((s) => s.score))))),
    ratingCount: ratings.length,
    categories: Object.fromEntries(
      Object.entries(byCategory).map(([category, scores]) => [category, round1(mean(scores))]),
    ),
  };
}
