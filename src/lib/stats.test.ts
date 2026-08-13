import {
  computeCurrentStreak,
  computeLongestStreak,
  computeStats,
  dateKey,
  weekStart,
} from './stats';
import type { Movie } from '@/types/movie';

const ISO = '2024-03-05T12:00:00.000Z';
const ISO_LATER = '2024-03-06T12:00:00.000Z';
const ISO_LATEST = '2024-03-07T12:00:00.000Z';

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

  it('bills a series by every episode watch its log holds', () => {
    const once = { s1e1: [ISO], s1e2: [ISO], s1e3: [ISO], s1e4: [ISO] };
    const show = movie({
      type: 'tv',
      watched: true,
      timesWatched: 1,
      runtime: 30,
      numberOfEpisodes: 4,
      episodeWatchDates: once,
      episodesWatched: { s1e1: true, s1e2: true, s1e3: true, s1e4: true },
    });

    expect(computeStats([show])!.totalHours).toBe(2);
    // A rewatch of every episode is a second pass through the series.
    const twice = Object.fromEntries(Object.keys(once).map((key) => [key, [ISO, ISO_LATER]]));
    expect(computeStats([{ ...show, episodeWatchDates: twice }])!.totalHours).toBe(4);
    // Part-watched still counts only the episodes actually watched.
    expect(
      computeStats([{ ...show, watched: false, timesWatched: 0, episodeWatchDates: { s1e1: [ISO], s1e2: [ISO] }, episodesWatched: {} }])!
        .totalHours,
    ).toBe(1);
    // One episode watched three times is three episodes' worth of runtime, and
    // timesWatched cannot double-bill it - it is derived from the same log.
    expect(
      computeStats([
        { ...show, watched: false, timesWatched: 0, episodeWatchDates: { s1e1: [ISO, ISO_LATER, ISO_LATEST] }, episodesWatched: {} },
      ])!.totalHours,
    ).toBe(2);
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

  it('counts only the top billing of each title towards the actor ranking', () => {
    const lead = { id: 10, name: 'Lead', profileUrl: 'https://img/lead.jpg' };
    const bitPart = { id: 99, name: 'Bit Part' };
    const filler = (n: number) => ({ id: 100 + n, name: `Filler ${n}` });
    const movies = [
      movie({ cast: [lead, filler(1), filler(2), filler(3), filler(4), bitPart] }),
      movie({ cast: [filler(5), lead, filler(6), filler(7), filler(8), bitPart] }),
    ];

    const stats = computeStats(movies, { now: new Date(2024, 2, 6) })!;

    expect(stats.topActors[0]).toEqual({ name: 'Lead', count: 2, id: 10, image: 'https://img/lead.jpg' });
    // Sixth-billed in both, so it never counts however often it appears.
    expect(stats.topActors.find((a) => a.name === 'Bit Part')).toBeUndefined();
  });

  it('leaves the actor headshot null when nothing stored one', () => {
    const stats = computeStats([movie({ cast: [{ id: 7, name: 'Unphotographed' }] })], { now: new Date(2024, 2, 6) })!;
    expect(stats.topActors[0]).toEqual({ name: 'Unphotographed', count: 1, id: 7, image: null });
  });

  it('buckets completions and episode watches by day', () => {
    const movies = [
      movie({ watched: true, completedAt: ISO }),
      movie({
        type: 'tv',
        episodeWatchDates: { s1e1: [ISO], s1e2: ['2024-03-05T13:00:00.000Z'] },
      }),
    ];
    const stats = computeStats(movies, { now: new Date(2024, 2, 6) })!;
    expect(stats.dailyCompletions['2024-03-05']).toBe(1);
    expect(stats.dailyEpisodes['2024-03-05']).toBe(2);
  });

  // The point of the log: the second viewing marks the day it happened, so the
  // TV streak sees two days instead of one.
  it('marks the day a rewatched episode was watched again', () => {
    const show = movie({ type: 'tv', episodeWatchDates: { s1e1: [ISO, ISO_LATER] } });
    const stats = computeStats([show], { now: new Date(2024, 2, 6) })!;
    expect(stats.dailyEpisodes['2024-03-05']).toBe(1);
    expect(stats.dailyEpisodes['2024-03-06']).toBe(1);
  });
});
