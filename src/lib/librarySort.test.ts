import { SORT_DEFAULT_DIR, averageRating, compareMovies } from './librarySort';
import type { Movie } from '@/types/movie';

const movie = (id: string, overrides: Partial<Movie> = {}): Movie =>
  ({
    id,
    title: `Title ${id}`,
    type: 'movie',
    addedAt: '2026-01-01T00:00:00.000Z',
    releaseDate: '2020-01-01',
    runtime: 100,
    director: [],
    ratings: null,
    ...overrides,
  }) as Movie;

const sorted = (movies: Movie[], sortBy: Parameters<typeof compareMovies>[2], dir: 'asc' | 'desc') =>
  [...movies].sort((a, b) => compareMovies(a, b, sortBy, dir)).map((m) => m.id);

describe('averageRating', () => {
  it('averages only the scores that are set', () => {
    expect(averageRating(movie('a', { ratings: { overall: 8, story: 6, acting: 0 } } as Partial<Movie>))).toBe(7);
  });

  it('is 0 with no ratings', () => {
    expect(averageRating(movie('a'))).toBe(0);
  });
});

describe('SORT_DEFAULT_DIR', () => {
  it('leads with newest, highest and soonest for the date and score sorts', () => {
    expect(SORT_DEFAULT_DIR.dateAdded).toBe('desc');
    expect(SORT_DEFAULT_DIR.rating).toBe('desc');
    expect(SORT_DEFAULT_DIR.releaseDate).toBe('desc');
  });

  it('leads with A-Z and shortest for the rest', () => {
    expect(SORT_DEFAULT_DIR.title).toBe('asc');
    expect(SORT_DEFAULT_DIR.director).toBe('asc');
    expect(SORT_DEFAULT_DIR.runtime).toBe('asc');
  });
});

describe('compareMovies', () => {
  it('sorts titles A-Z ascending and Z-A descending', () => {
    const movies = [movie('b', { title: 'Brazil' }), movie('a', { title: 'Alien' }), movie('c', { title: 'Cube' })];
    expect(sorted(movies, 'title', 'asc')).toEqual(['a', 'b', 'c']);
    expect(sorted(movies, 'title', 'desc')).toEqual(['c', 'b', 'a']);
  });

  it('sorts date added oldest first ascending, newest first descending', () => {
    const movies = [
      movie('mid', { addedAt: '2026-04-01T00:00:00.000Z' }),
      movie('new', { addedAt: '2026-07-01T00:00:00.000Z' }),
      movie('old', { addedAt: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(sorted(movies, 'dateAdded', 'asc')).toEqual(['old', 'mid', 'new']);
    expect(sorted(movies, 'dateAdded', 'desc')).toEqual(['new', 'mid', 'old']);
  });

  it('sorts rating lowest first ascending, highest first descending', () => {
    const movies = [
      movie('low', { ratings: { overall: 4 } } as Partial<Movie>),
      movie('high', { ratings: { overall: 9 } } as Partial<Movie>),
    ];
    expect(sorted(movies, 'rating', 'asc')).toEqual(['low', 'high']);
    expect(sorted(movies, 'rating', 'desc')).toEqual(['high', 'low']);
  });

  it('sorts release date oldest first ascending, newest first descending', () => {
    const movies = [movie('old', { releaseDate: '1999-03-31' }), movie('new', { releaseDate: '2026-05-01' })];
    expect(sorted(movies, 'releaseDate', 'asc')).toEqual(['old', 'new']);
    expect(sorted(movies, 'releaseDate', 'desc')).toEqual(['new', 'old']);
  });

  it('sorts runtime shortest first ascending', () => {
    const movies = [movie('long', { runtime: 180 }), movie('short', { runtime: 90 })];
    expect(sorted(movies, 'runtime', 'asc')).toEqual(['short', 'long']);
    expect(sorted(movies, 'runtime', 'desc')).toEqual(['long', 'short']);
  });

  it('sorts by the first credited director', () => {
    const movies = [movie('v', { director: [{ name: 'Villeneuve' }] }), movie('a', { director: [{ name: 'Aster' }] })];
    expect(sorted(movies, 'director', 'asc')).toEqual(['a', 'v']);
    expect(sorted(movies, 'director', 'desc')).toEqual(['v', 'a']);
  });

  it('falls back to title order for an unrecognised sort', () => {
    const movies = [movie('b', { title: 'Brazil' }), movie('a', { title: 'Alien' })];
    expect(sorted(movies, 'nope' as never, 'asc')).toEqual(['a', 'b']);
  });
});
