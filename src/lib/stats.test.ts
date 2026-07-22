import {
  computeCurrentStreak,
  computeLongestStreak,
  computeStats,
  dateKey,
  weekStart,
} from './stats';
import type { Movie } from '@/types/movie';

// Minimal Movie factory - only the fields computeStats reads.
function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'u',
    tmdbId: null,
    imdbId: null,
    type: 'movie',
    title: 'X',
    director: [],
    cast: [],
    genres: [],
    releaseDate: null,
    coverUrl: null,
    overview: '',
    runtime: 0,
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
    watched: false,
    timesWatched: 0,
    completedAt: null,
    lastWatchedPosition: null,
    ratings: {},
    notes: '',
    url: '',
    customOrder: null,
    addedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    episodesWatched: {},
    episodeWatchDates: {},
    seasonEpisodeCounts: {},
    ...overrides,
  };
}

describe('dateKey / weekStart', () => {
  it('formats a local date key', () => {
    expect(dateKey(new Date(2024, 2, 5))).toBe('2024-03-05');
  });

  it('anchors week to Monday', () => {
    // 2024-03-06 is a Wednesday -> Monday is 2024-03-04
    expect(dateKey(weekStart(new Date(2024, 2, 6)))).toBe('2024-03-04');
  });

  it('treats Sunday as end of the Monday-anchored week', () => {
    // 2024-03-10 is a Sunday -> Monday is still 2024-03-04
    expect(dateKey(weekStart(new Date(2024, 2, 10)))).toBe('2024-03-04');
  });
});

describe('computeCurrentStreak', () => {
  it('is zero with no data', () => {
    expect(computeCurrentStreak({}, 2, new Date(2024, 2, 6))).toBe(0);
  });

  it('counts consecutive qualifying days back from now', () => {
    // Week Mon 2024-03-04 .. Sun 2024-03-10, threshold 2.
    const daily = { '2024-03-04': 1, '2024-03-05': 1, '2024-03-06': 1 };
    // now = Wed 2024-03-06; week total = 3 >= 2 -> all three days count.
    expect(computeCurrentStreak(daily, 2, new Date(2024, 2, 6))).toBe(3);
  });

  it('current week counts with any activity even below threshold', () => {
    const daily = { '2024-03-06': 1 };
    expect(computeCurrentStreak(daily, 5, new Date(2024, 2, 6))).toBe(1);
  });
});

describe('computeLongestStreak', () => {
  it('finds the longest qualifying run', () => {
    const daily = {
      '2024-03-04': 1,
      '2024-03-05': 1,
      '2024-03-06': 1,
      // gap week with only 1 (below threshold 2) resets
      '2024-03-13': 1,
    };
    expect(computeLongestStreak(daily, 2)).toBe(3);
  });
});

describe('computeStats', () => {
  it('returns null for an empty library', () => {
    expect(computeStats([])).toBeNull();
  });

  it('aggregates status, type, genres, decades and ratings', () => {
    const movies = [
      movie({
        type: 'movie',
        watched: true,
        timesWatched: 1,
        runtime: 120,
        ratings: { overall: 5 },
        genres: [{ id: 28, name: 'Action' }],
        releaseDate: '1995-06-01',
        director: [{ id: 1, name: 'Jane Doe' }],
      }),
      movie({
        type: 'tv',
        inWatchlist: true,
        ratings: { overall: 3 },
        genres: [{ id: 28, name: 'Action' }],
        releaseDate: '2021-01-01',
      }),
    ];
    const stats = computeStats(movies, { now: new Date(2024, 2, 6) })!;

    expect(stats.totalMovies).toBe(2);
    expect(stats.typeCounts).toEqual({ movie: 1, tv: 1 });
    expect(stats.watchedCount).toBe(1);
    expect(stats.completionRate).toBe(50);
    expect(stats.totalHours).toBe(2); // 120 min * 1 watch
    expect(stats.avgRating).toBe('4.0'); // (5 + 3) / 2
    expect(stats.topGenres[0]).toMatchObject({ name: 'Action', count: 2, id: 28 });
    expect(stats.topDirectors[0]).toEqual({ name: 'Jane Doe', count: 1, id: 1 });
    expect(stats.sortedDecades).toEqual([
      { decade: '1990s', count: 1 },
      { decade: '2020s', count: 1 },
    ]);
  });

  it('buckets completions and episode watches by day', () => {
    const movies = [
      movie({ watched: true, completedAt: '2024-03-05T12:00:00.000Z' }),
      movie({
        type: 'tv',
        episodeWatchDates: { s1e1: '2024-03-05T12:00:00.000Z', s1e2: '2024-03-05T13:00:00.000Z' },
      }),
    ];
    const stats = computeStats(movies, { now: new Date(2024, 2, 6) })!;
    expect(stats.dailyCompletions['2024-03-05']).toBe(1);
    expect(stats.dailyEpisodes['2024-03-05']).toBe(2);
  });
});
