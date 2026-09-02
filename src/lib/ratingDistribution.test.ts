import { ratingBucketIndex, ratingDistribution } from './ratingDistribution';
import type { Movie, Ratings } from '@/types/movie';

// Only the field the distribution reads; the rest of Movie is irrelevant here.
function rated(ratings: Ratings): Movie {
  return { ratings } as Movie;
}

describe('ratingBucketIndex', () => {
  it('puts a score in the half-star bucket it rounds up into', () => {
    expect(ratingBucketIndex(0.5)).toBe(1);
    expect(ratingBucketIndex(0.1)).toBe(1);
    expect(ratingBucketIndex(3.1)).toBe(7); // 3.5 bucket
    expect(ratingBucketIndex(3.5)).toBe(7);
    expect(ratingBucketIndex(3.6)).toBe(8); // 4 bucket
    expect(ratingBucketIndex(5)).toBe(10);
  });

  it('has no bucket for an unrated title', () => {
    expect(ratingBucketIndex(null)).toBeNull();
    expect(ratingBucketIndex(undefined)).toBeNull();
    expect(ratingBucketIndex(0)).toBeNull();
  });

  it('clamps a score above the scale into the top bucket', () => {
    expect(ratingBucketIndex(7)).toBe(10);
  });
});

describe('ratingDistribution', () => {
  it('returns every bucket, empty ones included', () => {
    const { buckets } = ratingDistribution([]);
    expect(buckets).toHaveLength(10);
    expect(buckets.map((b) => b.value)).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('counts titles into their bucket', () => {
    const dist = ratingDistribution([
      rated({ overall: 4 }),
      rated({ overall: 4 }),
      rated({ overall: 5 }),
      rated({ overall: 1.5 }),
    ]);
    expect(dist.buckets.find((b) => b.value === 4)?.count).toBe(2);
    expect(dist.buckets.find((b) => b.value === 5)?.count).toBe(1);
    expect(dist.buckets.find((b) => b.value === 1.5)?.count).toBe(1);
    expect(dist.rated).toBe(4);
  });

  it('leaves unrated titles out of the curve and out of the average', () => {
    const dist = ratingDistribution([rated({ overall: 4 }), rated({}), rated({ overall: 0 })]);
    expect(dist.rated).toBe(1);
    expect(dist.average).toBe(4);
  });

  it('averages the scores it counted, to one decimal', () => {
    const dist = ratingDistribution([rated({ overall: 4 }), rated({ overall: 3 }), rated({ overall: 4.5 })]);
    expect(dist.average).toBe(3.8);
  });

  it('has no average with nothing rated', () => {
    expect(ratingDistribution([rated({})]).average).toBeNull();
  });

  it('falls back to the category average the same way a poster does', () => {
    // personalScore: no overall -> mean of the sub-ratings, so 4.5 lands in the
    // 4.5 bucket rather than being read as unrated.
    const dist = ratingDistribution([rated({ story: 4, acting: 5 })]);
    expect(dist.buckets.find((b) => b.value === 4.5)?.count).toBe(1);
  });
});
