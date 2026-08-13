import { periodShortLabel, periodStart, scopeMoviesToPeriod } from './statsPeriod';
import type { Movie } from '@/types/movie';

const NOW = new Date(2026, 6, 15, 13, 30); // 15 Jul 2026, local

const iso = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).toISOString();

const movie = (over: Partial<Movie> = {}): Movie =>
  ({
    id: 'm1',
    type: 'movie',
    title: 'A film',
    runtime: 120,
    timesWatched: 3,
    watched: true,
    completedAt: iso(2026, 7, 10),
    episodesWatched: {},
    episodeWatchDates: {},
    ...over,
  }) as Movie;

const show = (over: Partial<Movie> = {}): Movie =>
  movie({
    id: 's1',
    type: 'tv',
    title: 'A show',
    runtime: 45,
    completedAt: null,
    watched: false,
    ...over,
  });

describe('periodStart', () => {
  it('has no bound for all time', () => {
    expect(periodStart('all', NOW)).toBeNull();
  });

  it('counts today as one of the last 30 days', () => {
    expect(periodStart('30d', NOW)).toEqual(new Date(2026, 5, 16, 0, 0, 0, 0));
  });

  it('counts today as one of the last 90 days', () => {
    expect(periodStart('90d', NOW)).toEqual(new Date(2026, 3, 17, 0, 0, 0, 0));
  });

  it('anchors this year to 1 January', () => {
    expect(periodStart('year', NOW)).toEqual(new Date(2026, 0, 1));
  });
});

describe('periodShortLabel', () => {
  it('names every period', () => {
    expect(periodShortLabel('90d')).toBe('90 days');
  });
});

describe('scopeMoviesToPeriod', () => {
  it('returns the same list untouched for all time', () => {
    const movies = [movie()];
    expect(scopeMoviesToPeriod(movies, null)).toBe(movies);
  });

  it('drops a movie completed before the window', () => {
    const movies = [movie({ completedAt: iso(2026, 1, 5) })];
    expect(scopeMoviesToPeriod(movies, periodStart('30d', NOW))).toEqual([]);
  });

  it('drops a movie that was never completed', () => {
    const movies = [movie({ completedAt: null, watched: false })];
    expect(scopeMoviesToPeriod(movies, periodStart('year', NOW))).toEqual([]);
  });

  it('counts a movie completed in the window once, not once per rewatch', () => {
    const [scoped] = scopeMoviesToPeriod([movie()], periodStart('30d', NOW));
    expect(scoped.timesWatched).toBe(1);
  });

  it('keeps only the episodes watched inside the window', () => {
    const scoped = scopeMoviesToPeriod(
      [
        show({
          episodesWatched: { 's1e1': true, 's1e2': true, 's1e3': true },
          episodeWatchDates: { 's1e1': [iso(2025, 12, 1)], 's1e2': [iso(2026, 7, 1)], 's1e3': [iso(2026, 7, 12)] },
        }),
      ],
      periodStart('30d', NOW),
    );

    expect(scoped).toHaveLength(1);
    expect(Object.keys(scoped[0].episodeWatchDates)).toEqual(['s1e2', 's1e3']);
    expect(scoped[0].episodesWatched).toEqual({ 's1e2': true, 's1e3': true });
  });

  it('drops a show with no episode watched in the window', () => {
    const scoped = scopeMoviesToPeriod(
      [show({ episodesWatched: { 's1e1': true }, episodeWatchDates: { 's1e1': [iso(2025, 3, 4)] } })],
      periodStart('year', NOW),
    );
    expect(scoped).toEqual([]);
  });

  it('drops undated full-series rewatches, which cannot be placed in a window', () => {
    const [scoped] = scopeMoviesToPeriod(
      [
        show({
          timesWatched: 4,
          episodesWatched: { 's1e1': true },
          episodeWatchDates: { 's1e1': [iso(2026, 7, 2)] },
        }),
      ],
      periodStart('30d', NOW),
    );
    expect(scoped.timesWatched).toBe(0);
  });

  it('keeps a show completed in the window even with no dated episodes', () => {
    const [scoped] = scopeMoviesToPeriod(
      [show({ watched: true, completedAt: iso(2026, 7, 9) })],
      periodStart('30d', NOW),
    );
    expect(scoped.watched).toBe(true);
  });

  it('clears a completion that happened before the window', () => {
    const [scoped] = scopeMoviesToPeriod(
      [
        show({
          watched: true,
          completedAt: iso(2025, 8, 1),
          episodesWatched: { 's2e1': true },
          episodeWatchDates: { 's2e1': [iso(2026, 7, 5)] },
        }),
      ],
      periodStart('30d', NOW),
    );
    expect(scoped.completedAt).toBeNull();
    expect(scoped.watched).toBe(false);
  });

  it('does not mutate the input rows', () => {
    const original = show({
      episodesWatched: { 's1e1': true, 's1e2': true },
      episodeWatchDates: { 's1e1': [iso(2020, 1, 1)], 's1e2': [iso(2026, 7, 5)] },
    });
    scopeMoviesToPeriod([original], periodStart('30d', NOW));
    expect(Object.keys(original.episodeWatchDates)).toEqual(['s1e1', 's1e2']);
  });
});
