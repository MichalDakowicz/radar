import type { Ratings } from '@/types/movie';

/**
 * The one overall-or-average score rule (was inline `ratingScore` in legacy
 * MovieCard.jsx). Lives here rather than beside the stars component so anything
 * that is not a React tree — the recap builders, a node script — can read a
 * score without importing react-native.
 *
 * components/media/RatingStars re-exports it, so the existing call sites that
 * import it from there keep working.
 */
export function personalScore(ratings: Ratings | null | undefined): number | null {
  if (!ratings) return null;
  if (ratings.overall && ratings.overall > 0) return ratings.overall;

  const { overall, seasons, ...subRatings } = ratings;
  const subVals = Object.values(subRatings).filter((v): v is number => typeof v === 'number' && v > 0);
  if (subVals.length === 0) return null;
  return subVals.reduce((a, b) => a + b, 0) / subVals.length;
}
