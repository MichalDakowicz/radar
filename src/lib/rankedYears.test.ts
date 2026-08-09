import { rankedYears, releaseYear } from '@/lib/rankedYears';
import type { Movie } from '@/types/movie';

function movie(partial: Partial<Movie> & { id: string }): Movie {
  return {
    userId: 'u1',
    tmdbId: 1,
    imdbId: null,
    type: 'movie',
    title: partial.id,
    director: [],
    cast: [],
    genres: [],
    releaseDate: '2026-01-01',
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
    watched: true,
    timesWatched: 1,
    completedAt: null,
    lastWatchedPosition: null,
    ratings: { overall: 4 },
    notes: '',
    url: '',
    addedAt: '',
    updatedAt: '',
    episodesWatched: {},
    episodeWatchDates: {},
    seasonEpisodeCounts: {},
    ...partial,
  } as Movie;
}

const score = (m: Movie) => m.ratings.overall ?? null;

describe('releaseYear', () => {
  it('reads the year off the release date', () => {
    expect(releaseYear(movie({ id: 'a', releaseDate: '2019-07-04' }))).toBe(2019);
  });

  it('rejects a missing or unusable date', () => {
    expect(releaseYear(movie({ id: 'a', releaseDate: null }))).toBeNull();
    expect(releaseYear(movie({ id: 'a', releaseDate: 'soon' }))).toBeNull();
  });
});

describe('rankedYears', () => {
  it('buckets by release year, newest year first', () => {
    const result = rankedYears(
      [
        movie({ id: 'a', releaseDate: '2024-05-01' }),
        movie({ id: 'b', releaseDate: '2026-02-01' }),
      ],
      score,
    );
    expect(result.map((y) => y.year)).toEqual([2026, 2024]);
  });

  it('orders a year best first and numbers the ranks', () => {
    const result = rankedYears(
      [
        movie({ id: 'mid', ratings: { overall: 3 } }),
        movie({ id: 'best', ratings: { overall: 5 } }),
        movie({ id: 'worst', ratings: { overall: 1 } }),
      ],
      score,
    );
    expect(result[0].entries.map((e) => [e.rank, e.movie.id])).toEqual([
      [1, 'best'],
      [2, 'mid'],
      [3, 'worst'],
    ]);
  });

  it('puts the more rewatched title first when the scores tie', () => {
    const result = rankedYears(
      [
        movie({ id: 'once', title: 'Arrival', ratings: { overall: 4 }, timesWatched: 1 }),
        movie({ id: 'thrice', title: 'Zodiac', ratings: { overall: 4 }, timesWatched: 3 }),
      ],
      score,
    );
    expect(result[0].entries.map((e) => e.movie.id)).toEqual(['thrice', 'once']);
  });

  it('counts a finished show as watched once even with no watch count on it', () => {
    const result = rankedYears(
      [
        movie({ id: 'film', title: 'Obsession', ratings: { overall: 5 }, timesWatched: 1, voteAverage: 8.2 }),
        // Episode-tracked series: times_watched never leaves 0.
        movie({ id: 'show', title: 'Spider-Noir', type: 'tv', ratings: { overall: 5 }, timesWatched: 0, voteAverage: 8.4 }),
      ],
      score,
    );
    expect(result[0].entries.map((e) => e.movie.id)).toEqual(['show', 'film']);
  });

  it('falls back to the TMDB average when score and rewatches both tie', () => {
    const result = rankedYears(
      [
        movie({ id: 'lower', title: 'Arrival', ratings: { overall: 4 }, timesWatched: 2, voteAverage: 6.9 }),
        movie({ id: 'higher', title: 'Zodiac', ratings: { overall: 4 }, timesWatched: 2, voteAverage: 8.1 }),
      ],
      score,
    );
    expect(result[0].entries.map((e) => e.movie.id)).toEqual(['higher', 'lower']);
  });

  it('puts the more recently finished title first when the stats tie', () => {
    const tie = { ratings: { overall: 4 }, timesWatched: 1, voteAverage: 7 };
    const result = rankedYears(
      [
        movie({ id: 'older', title: 'Arrival', ...tie, completedAt: '2026-01-02T00:00:00Z' }),
        movie({ id: 'newer', title: 'Zodiac', ...tie, completedAt: '2026-06-02T00:00:00Z' }),
      ],
      score,
    );
    expect(result[0].entries.map((e) => e.movie.id)).toEqual(['newer', 'older']);
  });

  it('falls back to the title only when every stat ties', () => {
    const result = rankedYears(
      [
        movie({ id: 'z', title: 'Zodiac', ratings: { overall: 4 }, timesWatched: 2, voteAverage: 7 }),
        movie({ id: 'a', title: 'Arrival', ratings: { overall: 4 }, timesWatched: 2, voteAverage: 7 }),
      ],
      score,
    );
    expect(result[0].entries.map((e) => e.movie.title)).toEqual(['Arrival', 'Zodiac']);
  });

  it('drops unwatched, unrated and undated titles', () => {
    const result = rankedYears(
      [
        movie({ id: 'unwatched', watched: false }),
        movie({ id: 'unrated', ratings: {} }),
        movie({ id: 'zero', ratings: { overall: 0 } }),
        movie({ id: 'undated', releaseDate: null }),
        movie({ id: 'kept' }),
      ],
      score,
    );
    expect(result).toHaveLength(1);
    expect(result[0].entries.map((e) => e.movie.id)).toEqual(['kept']);
  });

  it('returns nothing when there is nothing to rank', () => {
    expect(rankedYears([], score)).toEqual([]);
  });
});
