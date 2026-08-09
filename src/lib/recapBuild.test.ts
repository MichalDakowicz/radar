import { buildMonthlyRecap, buildYearlyRecap, longDate, longestRun } from '@/lib/recapBuild';
import type { Movie, Ratings } from '@/types/movie';

const score = (ratings: Ratings | null | undefined) => ratings?.overall ?? null;

function movie(overrides: Partial<Movie>): Movie {
  return {
    id: Math.random().toString(36).slice(2),
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
    runtime: 120,
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
    status: 'Completed',
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

/** Local noon, so a test never straddles a timezone boundary. */
function at(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12).toISOString();
}

describe('longestRun', () => {
  it('finds the run and the dates it spans', () => {
    expect(longestRun(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-20'])).toEqual({
      length: 3,
      from: '2026-10-08',
      to: '2026-10-10',
    });
  });

  it('is null with no active days', () => {
    expect(longestRun([])).toBeNull();
  });

  it('counts a single day as a run of one', () => {
    expect(longestRun(['2026-05-05'])).toEqual({ length: 1, from: '2026-05-05', to: '2026-05-05' });
  });
});

describe('longDate', () => {
  it('reads as a date, not a key', () => {
    expect(longDate('2026-10-08')).toBe('8 October');
  });
});

describe('buildMonthlyRecap', () => {
  const movies = [
    movie({ title: 'July A', completedAt: at(2026, 7, 3), runtime: 120, ratings: { overall: 5 } }),
    movie({ title: 'July B', completedAt: at(2026, 7, 4), runtime: 60, genres: [{ id: 53, name: 'Thriller' }] }),
    movie({ title: 'June A', completedAt: at(2026, 6, 10), runtime: 120 }),
    movie({ title: 'Never', watched: false, inWatchlist: true, completedAt: null, addedAt: at(2026, 3, 1) }),
  ];

  it('counts only the month asked for', () => {
    const recap = buildMonthlyRecap('2026-07', { movies, score });
    expect(recap.titles).toBe(2);
    expect(recap.hours).toBe(3);
    expect(recap.activeDays).toBe(2);
    expect(recap.display).toBe('JULY');
    expect(recap.year).toBe('2026');
  });

  it('compares against the month before', () => {
    const recap = buildMonthlyRecap('2026-07', { movies, score });
    expect(recap.previous).toEqual({ short: 'JUN', hours: 2 });
    expect(recap.deltaPercent).toBe(50);
  });

  it('has no delta when the previous month was empty', () => {
    const recap = buildMonthlyRecap('2026-06', { movies, score });
    expect(recap.deltaPercent).toBeNull();
  });

  it('picks the best-rated finish as the film of the month', () => {
    expect(buildMonthlyRecap('2026-07', { movies, score }).film?.title).toBe('July A');
  });

  it('lists the month\'s other finishes as runners-up, best first', () => {
    const recap = buildMonthlyRecap('2026-07', { movies, score });
    expect(recap.film?.title).toBe('July A');
    // The film of the month is not repeated in its own runners-up row, and the
    // unwatched watchlist title never appears — the recap is about what was
    // actually watched.
    expect(recap.runnersUp.map((r) => r.title)).toEqual(['July B']);
    expect(recap.runnersUp[0].rating).toBeNull();
  });

  it('names up to three faces of the month', () => {
    const cast = [
      movie({
        title: 'July A',
        completedAt: at(2026, 7, 3),
        cast: [
          { id: 1, name: 'Lead One', profileUrl: 'https://img/1.jpg' },
          { id: 2, name: 'Lead Two' },
          { id: 3, name: 'Lead Three' },
          { id: 4, name: 'Lead Four' },
        ],
      }),
      movie({ title: 'July B', completedAt: at(2026, 7, 4), cast: [{ id: 2, name: 'Lead Two' }] }),
    ];
    const recap = buildMonthlyRecap('2026-07', { movies: cast, score });
    expect(recap.actors.map((a) => [a.name, a.count])).toEqual([
      ['Lead Two', 2],
      ['Lead Four', 1],
      ['Lead One', 1],
    ]);
    expect(recap.actors[2].image).toBe('https://img/1.jpg');
  });

  it('has no faces when nothing watched carried a cast', () => {
    expect(buildMonthlyRecap('2026-07', { movies, score }).actors).toEqual([]);
  });

  it('snapshots the leaderboard it is handed', () => {
    const rows = [{ name: 'You', initials: 'YO', hours: 3, ratio: 1, isYou: true }];
    expect(buildMonthlyRecap('2026-07', { movies, score, leaderboard: rows }).leaderboard).toEqual(rows);
    expect(buildMonthlyRecap('2026-07', { movies, score }).leaderboard).toEqual([]);
  });
});

describe('buildYearlyRecap', () => {
  const movies = [
    movie({
      title: 'Dune',
      completedAt: at(2026, 10, 8),
      runtime: 155,
      releaseDate: '2021-10-22',
      ratings: { overall: 5 },
      director: [{ id: 1, name: 'Denis Villeneuve' }],
      genres: [{ id: 18, name: 'Drama' }],
    }),
    movie({
      title: 'Dune Two',
      completedAt: at(2026, 10, 9),
      runtime: 166,
      releaseDate: '2024-03-01',
      director: [{ id: 1, name: 'Denis Villeneuve' }],
      genres: [{ id: 18, name: 'Drama' }],
      timesWatched: 3,
    }),
    movie({
      title: 'Parasite',
      completedAt: at(2026, 2, 2),
      runtime: 132,
      releaseDate: '2019-05-30',
      director: [{ id: 2, name: 'Bong Joon-ho' }],
      genres: [{ id: 53, name: 'Thriller' }],
    }),
    movie({ title: 'Last year', completedAt: at(2025, 5, 5), runtime: 90 }),
  ];

  const recap = buildYearlyRecap('2026', { movies, score });

  it('numbers the edition by tracked years', () => {
    expect(recap.edition).toBe(2);
    expect(buildYearlyRecap('2025', { movies, score }).edition).toBe(1);
  });

  it('excludes other years', () => {
    expect(recap.titles).toBe(3);
    expect(recap.activeDays).toBe(3);
  });

  it('finds the streak and names the months', () => {
    expect(recap.longestStreak).toBe(2);
    expect(recap.streakRange).toEqual({ from: '8 October', to: '9 October' });
    expect(recap.busiestMonth).toEqual({ name: 'October', count: 2 });
    expect(recap.quietestMonth).toEqual({ name: 'February', count: 1 });
  });

  it('builds a wall and a podium with true ratios', () => {
    expect(recap.genres[0].name).toBe('Drama');
    expect(recap.genres[1].ratio).toBeCloseTo(0.5, 5);
    expect(recap.directors.map((d) => d.place)).toEqual([2, 1, 3].slice(0, recap.directors.length));
    expect(recap.directors.find((d) => d.place === 1)?.name).toBe('Denis Villeneuve');
  });

  it('keeps decades in time order', () => {
    expect(recap.decades.map((d) => d.name)).toEqual(['2010s', '2020s']);
  });

  it('reports the perfect scores and the rewatch', () => {
    expect(recap.masterpieces.map((m) => m.title)).toEqual(['Dune']);
    expect(recap.masterpiecePercent).toBeCloseTo(33.3, 1);
    expect(recap.rewatch?.title).toBe('Dune Two');
    expect(recap.rewatch?.times).toBe(3);
  });

  it('offers no stand-in when a five exists', () => {
    expect(recap.topRated).toEqual([]);
  });

  it('falls back to the real ceiling when nothing reached five', () => {
    const noFives = [
      movie({ title: 'Good', completedAt: at(2026, 4, 1), ratings: { overall: 4 } }),
      movie({ title: 'Fine', completedAt: at(2026, 4, 2), ratings: { overall: 3 } }),
      movie({ title: 'Unrated', completedAt: at(2026, 4, 3) }),
    ];
    const built = buildYearlyRecap('2026', { movies: noFives, score });
    expect(built.masterpieces).toEqual([]);
    // Ordered by score, and an unrated title is never promoted to fill a slot.
    expect(built.topRated.map((t) => [t.title, t.rating])).toEqual([
      ['Good', 4],
      ['Fine', 3],
    ]);
  });

  it('finds the oldest release and the median year', () => {
    expect(recap.oldest).toEqual({ title: 'Parasite', year: '2019' });
    expect(recap.medianYear).toBe('2021');
  });

  it('classifies the year', () => {
    expect(recap.classification.name).toBe('The Slow-Burn Completionist');
  });

  it('ranks five faces from each title\'s top billing', () => {
    const billed = (n: number) => ({ id: n, name: `Actor ${n}` });
    const withCast = [
      movie({ title: 'One', completedAt: at(2026, 3, 1), cast: [billed(1), billed(2), billed(3), billed(4), billed(5), billed(6)] }),
      movie({ title: 'Two', completedAt: at(2026, 3, 2), cast: [billed(2), billed(3), billed(7), billed(8), billed(9), billed(6)] }),
      movie({ title: 'Three', completedAt: at(2026, 3, 3), cast: [billed(2)] }),
    ];
    const built = buildYearlyRecap('2026', { movies: withCast, score });

    expect(built.actors.length).toBe(5);
    expect(built.actors[0]).toMatchObject({ name: 'Actor 2', count: 3, ratio: 1, initials: 'A2' });
    expect(built.actors[1]).toMatchObject({ name: 'Actor 3', count: 2 });
    expect(built.actors[1].ratio).toBeCloseTo(2 / 3, 5);
    // Sixth-billed in both films, so it never reaches the ranking.
    expect(built.actors.some((a) => a.name === 'Actor 6')).toBe(false);
  });

  it('does not fall over on an empty year', () => {
    const empty = buildYearlyRecap('2020', { movies, score });
    expect(empty.titles).toBe(0);
    expect(empty.longestStreak).toBe(0);
    expect(empty.weeks.length).toBeGreaterThan(50);
    expect(empty.classification.name).toBeTruthy();
  });
});
