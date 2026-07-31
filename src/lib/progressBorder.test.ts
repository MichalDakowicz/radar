import { progressDash, roundedRectPathReverse, roundedRectPerimeter, scoreToProgress } from './progressBorder';

describe('roundedRectPerimeter', () => {
  it('is the plain perimeter when there is no corner radius', () => {
    expect(roundedRectPerimeter(100, 50, 0)).toBe(300);
  });

  it('becomes a circle when the radius eats the whole shorter side', () => {
    expect(roundedRectPerimeter(80, 80, 40)).toBeCloseTo(2 * Math.PI * 40, 5);
  });

  it('clamps a radius larger than the shape allows', () => {
    expect(roundedRectPerimeter(80, 80, 999)).toBeCloseTo(roundedRectPerimeter(80, 80, 40), 5);
  });

  it('trades straight edge for arc as the radius grows', () => {
    // Corners replace 2r of straight edge per side with a quarter arc, so a
    // rounded card is always slightly shorter around than a sharp one.
    expect(roundedRectPerimeter(100, 50, 12)).toBeLessThan(roundedRectPerimeter(100, 50, 0));
  });

  it('returns 0 for a shape with no area', () => {
    expect(roundedRectPerimeter(0, 50, 8)).toBe(0);
    expect(roundedRectPerimeter(100, 0, 8)).toBe(0);
  });
});

describe('roundedRectPathReverse', () => {
  it('starts at the top-left corner and heads left, not right', () => {
    const d = roundedRectPathReverse(1, 1, 100, 50, 12);
    // Start sits r along the top edge; the first arc lands on the left edge, so
    // the stroke travels anticlockwise instead of along the top to the right.
    expect(d.startsWith('M 13 1 A 12 12 0 0 0 1 13')).toBe(true);
  });

  it('turns every corner the anticlockwise way', () => {
    const d = roundedRectPathReverse(0, 0, 100, 50, 10);
    // Four corners, every one with the sweep flag clear.
    expect(d.match(/A 10 10 0 0 0 /g)).toHaveLength(4);
    expect(d.match(/A 10 10 0 0 1 /g)).toBeNull();
  });

  it('visits the left edge before the right one', () => {
    const d = roundedRectPathReverse(0, 0, 100, 50, 10);
    expect(d.indexOf('L 0 40')).toBeLessThan(d.indexOf('L 100 10'));
  });

  it('closes the loop', () => {
    expect(roundedRectPathReverse(0, 0, 100, 50, 10).endsWith('Z')).toBe(true);
  });

  it('clamps a radius larger than the shape allows', () => {
    expect(roundedRectPathReverse(0, 0, 80, 80, 999)).toBe(roundedRectPathReverse(0, 0, 80, 80, 40));
  });

  it('returns nothing for a shape with no area', () => {
    expect(roundedRectPathReverse(0, 0, 0, 50, 8)).toBe('');
    expect(roundedRectPathReverse(0, 0, 100, 0, 8)).toBe('');
  });
});

describe('progressDash', () => {
  it('splits the perimeter at the progress point', () => {
    expect(progressDash(200, 0.79)).toEqual([158, 42]);
  });

  it('draws nothing at 0 and the whole way round at 1', () => {
    expect(progressDash(200, 0)).toEqual([0, 200]);
    expect(progressDash(200, 1)).toEqual([200, 0]);
  });

  it('clamps out-of-range and non-finite progress', () => {
    expect(progressDash(200, 1.5)).toEqual([200, 0]);
    expect(progressDash(200, -2)).toEqual([0, 200]);
    expect(progressDash(200, NaN)).toEqual([0, 200]);
  });
});

describe('scoreToProgress', () => {
  it('turns a TMDB score into a fraction', () => {
    expect(scoreToProgress(7.9)).toBeCloseTo(0.79, 5);
    expect(scoreToProgress(10)).toBe(1);
    expect(scoreToProgress(0)).toBe(0);
  });

  it('clamps scores outside the scale', () => {
    expect(scoreToProgress(12)).toBe(1);
    expect(scoreToProgress(-3)).toBe(0);
  });

  it('guards against a bad scale or score', () => {
    expect(scoreToProgress(NaN)).toBe(0);
    expect(scoreToProgress(5, 0)).toBe(0);
  });
});
