import type { Movie } from '@/types/movie';

import { buildExportPayload, EXPORT_VERSION, isDuplicate, parseImport, serializeExport } from './dataTransfer';

function makeMovie(over: Partial<Movie> = {}): Movie {
  return {
    id: 'row-1',
    userId: 'user-1',
    tmdbId: 100,
    imdbId: null,
    type: 'movie',
    title: 'Inception',
    director: [],
    cast: [],
    genres: [],
    releaseDate: '2010-07-16',
    coverUrl: null,
    overview: '',
    runtime: 148,
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
    status: 'Watchlist',
    inWatchlist: true,
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
    ...over,
  };
}

describe('buildExportPayload', () => {
  it('versions the payload and drops per-user identity fields', () => {
    const payload = buildExportPayload([makeMovie()], '2026-07-23T00:00:00.000Z');
    expect(payload.version).toBe(EXPORT_VERSION);
    expect(payload.count).toBe(1);
    expect(payload.movies[0].title).toBe('Inception');
    expect('id' in payload.movies[0]).toBe(false);
    expect('userId' in payload.movies[0]).toBe(false);
  });

  it('round-trips through serialize -> parse', () => {
    const json = serializeExport([makeMovie(), makeMovie({ title: 'Dune', tmdbId: 200 })], '2026-07-23T00:00:00.000Z');
    const { movies, errors } = parseImport(json);
    expect(errors).toHaveLength(0);
    expect(movies.map((m) => m.title)).toEqual(['Inception', 'Dune']);
  });
});

describe('parseImport', () => {
  it('accepts a bare array', () => {
    const { movies, errors } = parseImport('[{"title":"Heat","type":"movie"}]');
    expect(errors).toHaveLength(0);
    expect(movies[0].title).toBe('Heat');
  });

  it('defaults an unknown type to movie', () => {
    const { movies } = parseImport('[{"title":"Show","type":"series"}]');
    expect(movies[0].type).toBe('movie');
  });

  it('preserves an explicit tv type', () => {
    const { movies } = parseImport('[{"title":"Severance","type":"tv"}]');
    expect(movies[0].type).toBe('tv');
  });

  it('skips items with no title but keeps the rest', () => {
    const { movies, errors } = parseImport('[{"title":""},{"title":"Kept"}]');
    expect(movies.map((m) => m.title)).toEqual(['Kept']);
    expect(errors).toHaveLength(1);
  });

  it('reports invalid JSON', () => {
    const { movies, errors } = parseImport('not json');
    expect(movies).toHaveLength(0);
    expect(errors[0]).toMatch(/Invalid JSON/);
  });

  it('reports an empty input', () => {
    const { errors } = parseImport('   ');
    expect(errors[0]).toMatch(/Nothing to import/);
  });

  it('rejects an object without a movies array', () => {
    const { movies, errors } = parseImport('{"foo":1}');
    expect(movies).toHaveLength(0);
    expect(errors[0]).toMatch(/Unrecognised/);
  });
});

describe('isDuplicate', () => {
  const existing = [makeMovie({ tmdbId: 100, title: 'Inception' })];

  it('matches on tmdbId', () => {
    expect(isDuplicate({ title: 'Different name', type: 'movie', tmdbId: 100 }, existing)).toBe(true);
  });

  it('matches on case-insensitive title when no tmdbId', () => {
    expect(isDuplicate({ title: 'inception', type: 'movie' }, existing)).toBe(true);
  });

  it('is not a duplicate when title and tmdbId both differ', () => {
    expect(isDuplicate({ title: 'Tenet', type: 'movie', tmdbId: 999 }, existing)).toBe(false);
  });
});
