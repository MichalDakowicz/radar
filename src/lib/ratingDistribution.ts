// The shape of how you rate, in ten half-star buckets.
//
// A mean says almost nothing about a rater: 3.6 is the average of a generous
// shelf and of a harsh one alike. The distribution is the habit - where the mass
// sits, whether 5s get handed out, whether the bottom half is ever used.
//
// Scores are 0.1-precision on a 0-5 scale (edit/RatingSlider), so a bucket is
// half a star wide and holds everything from its own value up: 3.5-3.9 is the 3.5
// bucket. Rounding down is what a reader assumes off a star axis - 3.9 sits under
// the four-star mark, not on it. Anything below half a star still lands in the
// bottom bucket, because a rated title has to be somewhere on the curve.
//
// Pure (doc 10) - the component only draws the numbers this returns.

import { personalScore } from '@/lib/personalScore';
import type { Movie } from '@/types/movie';

/** Half-star buckets across the 0-5 scale. */
export const RATING_BUCKET_COUNT = 10;

export type RatingBucket = {
  /** Top of the bucket, and the score it is drawn under: 0.5 … 5. */
  value: number;
  count: number;
};

export type RatingDistribution = {
  buckets: RatingBucket[];
  /** Titles carrying a score at all - the rest are not in the curve. */
  rated: number;
  average: number | null;
};

type ScoreFn = (movie: Movie) => number | null;

const defaultScore: ScoreFn = (movie) => personalScore(movie.ratings);

/** Which half-star bucket a score falls in, 1…10, or null when it is unrated. */
export function ratingBucketIndex(score: number | null | undefined): number | null {
  if (score == null || score <= 0) return null;
  return Math.min(RATING_BUCKET_COUNT, Math.max(1, Math.floor(score * 2)));
}

/**
 * Every bucket is returned, empty ones included: the gaps are the point, and a
 * histogram that dropped them would compress the axis and lie about the shape.
 */
export function ratingDistribution(movies: Movie[], score: ScoreFn = defaultScore): RatingDistribution {
  const counts = new Array<number>(RATING_BUCKET_COUNT).fill(0);
  let sum = 0;
  let rated = 0;

  for (const movie of movies) {
    const value = score(movie);
    const index = ratingBucketIndex(value);
    if (index == null || value == null) continue;
    counts[index - 1] += 1;
    sum += value;
    rated += 1;
  }

  return {
    buckets: counts.map((count, i) => ({ value: (i + 1) / 2, count })),
    rated,
    average: rated === 0 ? null : Math.round((sum / rated) * 10) / 10,
  };
}
