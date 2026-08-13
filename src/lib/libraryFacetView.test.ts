import { facetSummary, facetTitle, isLibraryFacet, selectFacetMovies } from './libraryFacetView';
import type { Movie } from '@/types/movie';

const movie = (id: string, overrides: Partial<Movie> = {}): Movie =>
  ({
    id,
    title: `Title ${id}`,
    type: 'movie',
    releaseDate: '1999-03-31',
    genres: [],
    director: [],
    timesWatched: 0,
    runtime: 120,
    // Flags explicit: with all three undefined the status helpers fall back to
    // the legacy "no status means Watchlist" reading, which no real row hits.
    inWatchlist: false,
    inProgress: false,
    watched: false,
    ...overrides,
  }) as Movie;

const matrix = movie('matrix', {
  genres: [{ name: 'Sci-Fi' }, { name: 'Action' }] as never,
  director: [{ name: 'Lana Wachowski' }] as never,
  releaseDate: '1999-03-31',
  watched: true,
  timesWatched: 1,
  ratings: { overall: 5 } as never,
});
const dune = movie('dune', {
  genres: [{ name: 'Sci-Fi' }] as never,
  director: [{ name: 'Denis Villeneuve' }] as never,
  releaseDate: '2021-10-22',
  inWatchlist: true,
  ratings: { overall: 4 } as never,
});
const show = movie('breaking-bad', {
  type: 'tv',
  genres: [{ name: 'Drama' }] as never,
  releaseDate: '2008-01-20',
  inProgress: true,
});
const undated = movie('undated', { releaseDate: null as never });
const library = [matrix, dune, show, undated];

const ids = (movies: Movie[]) => movies.map((m) => m.id).sort();

describe('isLibraryFacet', () => {
  it('accepts the known facets and rejects anything else', () => {
    expect(isLibraryFacet('director')).toBe(true);
    expect(isLibraryFacet('all')).toBe(true);
    expect(isLibraryFacet('service')).toBe(false);
    expect(isLibraryFacet(undefined)).toBe(false);
  });
});

describe('facetTitle', () => {
  it('names each facet the way its header reads', () => {
    expect(facetTitle('director', 'Denis Villeneuve')).toBe('Denis Villeneuve');
    expect(facetTitle('genre', 'Sci-Fi')).toBe('Sci-Fi');
    expect(facetTitle('year', '1999')).toBe('1999');
    expect(facetTitle('decade', '1990s')).toBe('1990s');
    expect(facetTitle('type', 'movie')).toBe('Movies');
    expect(facetTitle('type', 'tv')).toBe('TV Shows');
    expect(facetTitle('status', 'watchlist')).toBe('Watchlist');
    expect(facetTitle('status', 'watching')).toBe('Watching');
    expect(facetTitle('status', 'completed')).toBe('Completed');
    expect(facetTitle('all', 'all')).toBe('Your library');
  });

  it('takes a bare decade year as its decade', () => {
    expect(facetTitle('decade', '1994')).toBe('1990s');
  });
});

describe('selectFacetMovies', () => {
  it('returns the whole library for the all facet', () => {
    expect(ids(selectFacetMovies(library, 'all', 'all'))).toEqual(ids(library));
  });

  it('matches a director by name, case-insensitively', () => {
    expect(ids(selectFacetMovies(library, 'director', 'denis villeneuve'))).toEqual(['dune']);
  });

  it('OR-matches a genre across a multi-genre title', () => {
    expect(ids(selectFacetMovies(library, 'genre', 'Sci-Fi'))).toEqual(['dune', 'matrix']);
    expect(ids(selectFacetMovies(library, 'genre', 'Action'))).toEqual(['matrix']);
  });

  it('matches an exact release year', () => {
    expect(ids(selectFacetMovies(library, 'year', '1999'))).toEqual(['matrix']);
    expect(selectFacetMovies(library, 'year', '2000')).toEqual([]);
  });

  it('buckets a decade over its ten years and excludes undated titles', () => {
    expect(ids(selectFacetMovies(library, 'decade', '1990s'))).toEqual(['matrix']);
    expect(ids(selectFacetMovies(library, 'decade', '2000s'))).toEqual(['breaking-bad']);
    expect(ids(selectFacetMovies(library, 'decade', '2020s'))).toEqual(['dune']);
    expect(selectFacetMovies(library, 'decade', 'nineties')).toEqual([]);
  });

  it('splits movies from shows, counting an untyped title as a movie', () => {
    expect(ids(selectFacetMovies(library, 'type', 'movie'))).toEqual(['dune', 'matrix', 'undated']);
    expect(ids(selectFacetMovies(library, 'type', 'tv'))).toEqual(['breaking-bad']);
    expect(selectFacetMovies(library, 'type', 'anime')).toEqual([]);
  });

  it('selects per status', () => {
    expect(ids(selectFacetMovies(library, 'status', 'watchlist'))).toEqual(['dune']);
    expect(ids(selectFacetMovies(library, 'status', 'watching'))).toEqual(['breaking-bad']);
    expect(ids(selectFacetMovies(library, 'status', 'completed'))).toEqual(['matrix']);
    expect(selectFacetMovies(library, 'status', 'abandoned')).toEqual([]);
  });
});

describe('facetSummary', () => {
  it('is empty for an empty selection', () => {
    expect(facetSummary([])).toEqual({ count: 0, avgRating: null, hours: 0, completed: 0 });
  });

  it('counts titles, averages the ratings that exist and sums the hours', () => {
    const summary = facetSummary([matrix, dune]);
    expect(summary.count).toBe(2);
    expect(summary.avgRating).toBe('4.5');
    // Only the watched title bills its runtime: 120 minutes, once.
    expect(summary.hours).toBe(2);
    expect(summary.completed).toBe(1);
  });

  it('has no average when nothing in the selection is rated', () => {
    expect(facetSummary([show]).avgRating).toBeNull();
  });
});
