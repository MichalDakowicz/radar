import { RATING_POINT_COUNT, ratingDistribution, ratingPointIndex } from './ratingDistribution';
import type { Movie, Ratings } from '@/types/movie';

// Only the field the distribution reads; the rest of Movie is irrelevant here.
function rated(ratings: Ratings): Movie {
  return { ratings } as Movie;
}

function pointAt(movies: Movie[], value: number) {
  return ratingDistribution(movies).points.find((p) => p.value === value);
}

describe('ratingPointIndex', () => {
  it('puts a score on the tenth-of-a-star step below it, unless it is on one', () => {
    expect(ratingPointIndex(0.1)).toBe(1);
    expect(ratingPointIndex(3.5)).toBe(35);
    expect(ratingPointIndex(3.9)).toBe(39);
    expect(ratingPointIndex(4)).toBe(40);
    expect(ratingPointIndex(5)).toBe(RATING_POINT_COUNT);
  });

  it('reads a score between steps down to the step below', () => {
    // A category average lands anywhere: 4.333 is not four and a third stars on
    // a curve drawn every tenth.
    expect(ratingPointIndex(4.333)).toBe(43);
    expect(ratingPointIndex(4.29)).toBe(42);
  });

  it('survives the float error in scaling a decimal score', () => {
    // 4.3 * 10 is 42.99999999999999 in binary floating point.
    expect(ratingPointIndex(4.3)).toBe(43);
    expect(ratingPointIndex(2.9)).toBe(29);
  });

  it('keeps a score below the first step on it', () => {
    expect(ratingPointIndex(0.05)).toBe(1);
  });

  it('has no step for an unrated title', () => {
    expect(ratingPointIndex(null)).toBeNull();
    expect(ratingPointIndex(undefined)).toBeNull();
    expect(ratingPointIndex(0)).toBeNull();
  });

  it('clamps a score above the scale onto the top step', () => {
    expect(ratingPointIndex(7)).toBe(RATING_POINT_COUNT);
  });
});

describe('ratingDistribution', () => {
  it('returns a point every tenth of a star, empty ones included', () => {
    const { points } = ratingDistribution([]);
    expect(points).toHaveLength(50);
    expect(points[0].value).toBe(0.1);
    expect(points[49].value).toBe(5);
    expect(points.every((p) => p.count === 0 && p.density === 0)).toBe(true);
  });

  it('counts titles onto their own step', () => {
    const movies = [rated({ overall: 4 }), rated({ overall: 4 }), rated({ overall: 4.5 })];
    expect(pointAt(movies, 4)?.count).toBe(2);
    expect(pointAt(movies, 4.5)?.count).toBe(1);
    expect(ratingDistribution(movies).rated).toBe(3);
  });

  it('spreads a rating into the steps around it so the curve is not a comb', () => {
    const movies = [rated({ overall: 3 })];
    const peak = pointAt(movies, 3)!;
    const beside = pointAt(movies, 3.1)!;
    const away = pointAt(movies, 4)!;

    expect(beside.count).toBe(0);
    expect(beside.density).toBeGreaterThan(0);
    expect(peak.density).toBeGreaterThan(beside.density);
    // Ten steps out is a different rating, not a shoulder of this one.
    expect(away.density).toBeLessThan(peak.density / 100);
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
    // personalScore: no overall -> mean of the sub-ratings.
    expect(pointAt([rated({ story: 4, acting: 5 })], 4.5)?.count).toBe(1);
  });
});
