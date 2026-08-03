import {
  availablePeriods,
  isValidPeriodKey,
  monthKey,
  periodDisplayName,
  periodLabel,
  periodRange,
  periodShortName,
  previousPeriodKey,
  retainedMonthKeys,
} from '@/lib/recapPeriod';
import type { Movie } from '@/types/movie';

function movie(overrides: Partial<Movie>): Movie {
  return {
    id: 'm',
    userId: 'u',
    tmdbId: 1,
    imdbId: null,
    type: 'movie',
    title: 'Title',
    director: [],
    cast: [],
    genres: [],
    releaseDate: null,
    coverUrl: null,
    overview: '',
    runtime: 100,
    voteAverage: 0,
    voteCount: 0,
    tagline: '',
    budget: 0,
    revenue: 0,
    productionCompanies: [],
    numberOfSeasons: null,
    numberOfEpisodes: null,
    tmdbStatus: null,
    availability: [],
    status: null,
    inWatchlist: false,
    inProgress: false,
    watched: true,
    timesWatched: 1,
    completedAt: null,
    lastWatchedPosition: null,
    ratings: {},
    notes: '',
    url: '',
    addedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    episodesWatched: {},
    episodeWatchDates: {},
    seasonEpisodeCounts: {},
    ...overrides,
  };
}

describe('period keys', () => {
  it('pads the month', () => {
    expect(monthKey(new Date(2026, 6, 15))).toBe('2026-07');
    expect(monthKey(new Date(2026, 0, 1))).toBe('2026-01');
  });

  it('validates per kind', () => {
    expect(isValidPeriodKey('year', '2026')).toBe(true);
    expect(isValidPeriodKey('year', '2026-07')).toBe(false);
    expect(isValidPeriodKey('month', '2026-07')).toBe(true);
    expect(isValidPeriodKey('month', '2026-13')).toBe(false);
    expect(isValidPeriodKey('month', '')).toBe(false);
  });

  it('ranges are half-open', () => {
    const { start, end } = periodRange('month', '2026-07');
    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 7, 1));
  });

  it('steps back across the year boundary', () => {
    expect(previousPeriodKey('month', '2026-01')).toBe('2025-12');
    expect(previousPeriodKey('month', '2026-07')).toBe('2026-06');
    expect(previousPeriodKey('year', '2026')).toBe('2025');
  });

  it('labels for humans', () => {
    expect(periodLabel('month', '2026-07')).toBe('July 2026');
    expect(periodLabel('year', '2026')).toBe('2026');
    expect(periodDisplayName('month', '2026-07')).toBe('JULY');
    expect(periodShortName('month', '2026-07')).toBe('JUL');
  });
});

describe('availablePeriods', () => {
  it('reads both completion dates and episode dates, newest first', () => {
    const movies = [
      movie({ completedAt: '2026-07-10T12:00:00.000Z' }),
      movie({ completedAt: '2025-02-02T12:00:00.000Z' }),
      movie({ type: 'tv', completedAt: null, episodeWatchDates: { 's1e1': '2026-03-04T12:00:00.000Z' } }),
    ];
    expect(availablePeriods(movies, 'month')).toEqual(['2026-07', '2026-03', '2025-02']);
    expect(availablePeriods(movies, 'year')).toEqual(['2026', '2025']);
  });

  it('ignores titles with no watch activity', () => {
    expect(availablePeriods([movie({ watched: false, completedAt: null })], 'month')).toEqual([]);
  });
});

describe('retainedMonthKeys', () => {
  it('is this month and last', () => {
    expect(retainedMonthKeys(new Date(2026, 0, 20))).toEqual(['2026-01', '2025-12']);
  });
});
