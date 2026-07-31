import {
  SPIN_FRAMES,
  SPIN_START_SPEED_MS,
  buildSpinReel,
  frameDelayMs,
  pickWinner,
  reelPosterUrls,
} from './randomPick';
import type { Movie } from '@/types/movie';

const movie = (id: string, coverUrl: string | null = `https://img/${id}.jpg`): Movie =>
  ({ id, title: `Title ${id}`, type: 'movie', coverUrl }) as Movie;

/** Deterministic stand-in for Math.random, cycling the given values. */
const seeded = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('pickWinner', () => {
  it('returns null for an empty library', () => {
    expect(pickWinner([])).toBeNull();
  });

  it('never overflows the array when random returns 1', () => {
    const movies = [movie('a'), movie('b')];
    expect(pickWinner(movies, () => 1)).toBe(movies[1]);
  });
});

describe('buildSpinReel', () => {
  const movies = [movie('a'), movie('b'), movie('c'), movie('d')];

  it('builds exactly the requested number of frames', () => {
    expect(buildSpinReel(movies, movies[0], SPIN_FRAMES)).toHaveLength(SPIN_FRAMES);
  });

  it('lands on the winner', () => {
    const reel = buildSpinReel(movies, movies[2], 8);
    expect(reel[reel.length - 1]).toBe(movies[2]);
  });

  it('never shows the same title twice in a row, even on a degenerate draw', () => {
    // Always asks for the first candidate, which without an exclusion pool
    // would hand back the same title every frame.
    const reel = buildSpinReel(movies, movies[0], SPIN_FRAMES, () => 0);
    const repeats = reel.filter((m, i) => i > 0 && m.id === reel[i - 1].id);
    expect(repeats).toEqual([]);
  });

  it('keeps the frame before the winner different from the winner', () => {
    const reel = buildSpinReel(movies, movies[0], SPIN_FRAMES, seeded([0.1, 0.1, 0.9]));
    expect(reel[reel.length - 2].id).not.toBe(reel[reel.length - 1].id);
  });

  it('collapses to the winner alone for a single-title library', () => {
    expect(buildSpinReel([movies[0]], movies[0], SPIN_FRAMES)).toEqual([movies[0]]);
  });
});

describe('reelPosterUrls', () => {
  it('dedupes and drops titles with no poster', () => {
    const reel = [movie('a'), movie('a'), movie('b'), movie('c', null)];
    expect(reelPosterUrls(reel)).toEqual(['https://img/a.jpg', 'https://img/b.jpg']);
  });
});

describe('frameDelayMs', () => {
  it('runs at full speed through the early frames', () => {
    expect(frameDelayMs(1)).toBe(SPIN_START_SPEED_MS);
    expect(frameDelayMs(20)).toBe(SPIN_START_SPEED_MS);
  });

  it('eases out over the closing frames', () => {
    expect(frameDelayMs(21)).toBeCloseTo(60);
    expect(frameDelayMs(25)).toBeGreaterThan(frameDelayMs(22));
    expect(frameDelayMs(29)).toBeGreaterThan(frameDelayMs(25));
  });
});
