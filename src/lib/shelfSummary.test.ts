import { inProgressTitles, recentlyLogged, shelfStats } from './shelfSummary';
import type { Movie } from '@/types/movie';

const NOW = new Date('2026-08-01T12:00:00Z');

const movie = (title: string, overrides: Partial<Movie> = {}): Movie =>
  ({
    id: title,
    title,
    type: 'movie',
    watched: false,
    inWatchlist: false,
    inProgress: false,
    ratings: {},
    completedAt: null,
    updatedAt: '2026-01-01T00:00:00Z',
    addedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as Movie;

const overall = (m: Movie) => m.ratings?.overall ?? null;

describe('shelfStats', () => {
  it('counts finished titles and the slice of them from this year', () => {
    const stats = shelfStats(
      [
        movie('a', { watched: true, completedAt: '2026-03-02T00:00:00Z' }),
        movie('b', { watched: true, completedAt: '2025-12-31T00:00:00Z' }),
        movie('c', { watched: true, completedAt: null }),
        movie('d'),
      ],
      overall,
      NOW,
    );
    expect(stats.films).toBe(3);
    expect(stats.thisYear).toBe(1);
  });

  it('averages every score, watched or not, to one decimal', () => {
    const stats = shelfStats(
      [movie('a', { ratings: { overall: 5 } }), movie('b', { ratings: { overall: 4 } }), movie('c')],
      overall,
      NOW,
    );
    expect(stats.average).toBe(4.5);
  });

  it('reports no average rather than zero when nothing is rated', () => {
    expect(shelfStats([movie('a', { watched: true })], overall, NOW).average).toBeNull();
  });

  it('ignores a zero score instead of dragging the mean down', () => {
    const stats = shelfStats([movie('a', { ratings: { overall: 4 } }), movie('b', { ratings: { overall: 0 } })], overall, NOW);
    expect(stats.average).toBe(4);
  });

  it('is all zeroes on an empty library', () => {
    expect(shelfStats([], overall, NOW)).toEqual({ films: 0, thisYear: 0, average: null });
  });
});

describe('recentlyLogged', () => {
  it('keeps only watched titles, newest completion first', () => {
    const result = recentlyLogged([
      movie('old', { watched: true, completedAt: '2026-01-01T00:00:00Z' }),
      movie('new', { watched: true, completedAt: '2026-07-30T00:00:00Z' }),
      movie('unwatched'),
    ]);
    expect(result.map((m) => m.title)).toEqual(['new', 'old']);
  });

  it('falls back to updatedAt when a row has no completion date', () => {
    const result = recentlyLogged([
      movie('dated', { watched: true, completedAt: '2026-01-01T00:00:00Z' }),
      movie('undated', { watched: true, completedAt: null, updatedAt: '2026-07-01T00:00:00Z' }),
    ]);
    expect(result.map((m) => m.title)).toEqual(['undated', 'dated']);
  });

  it('caps the rail', () => {
    const many = Array.from({ length: 20 }, (_, i) => movie(`m${i}`, { watched: true }));
    expect(recentlyLogged(many, 4)).toHaveLength(4);
  });
});

describe('inProgressTitles', () => {
  it('keeps only what is underway', () => {
    const result = inProgressTitles([
      movie('watching', { inProgress: true }),
      movie('done', { watched: true }),
      movie('queued', { inWatchlist: true }),
    ]);
    expect(result.map((m) => m.title)).toEqual(['watching']);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 9 }, (_, i) => movie(`m${i}`, { inProgress: true }));
    expect(inProgressTitles(many, 2)).toHaveLength(2);
  });
});
