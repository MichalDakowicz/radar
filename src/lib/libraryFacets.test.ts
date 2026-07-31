import {
  filterFacets,
  libraryFacets,
  matchesDirectorFilter,
  matchesGenreFilter,
  matchesYearFilter,
  movieDirectors,
  movieGenres,
  movieYear,
} from './libraryFacets';
import type { Movie } from '@/types/movie';

const movie = (id: string, overrides: Partial<Movie> = {}): Movie =>
  ({
    id,
    title: `Title ${id}`,
    type: 'movie',
    releaseDate: '2024-05-01',
    genres: [],
    director: [],
    ...overrides,
  }) as Movie;

describe('movieGenres', () => {
  it('lists genre names', () => {
    expect(movieGenres(movie('a', { genres: [{ name: 'Drama' }, { name: 'Sci-Fi' }] }))).toEqual(['Drama', 'Sci-Fi']);
  });

  it('is empty when a title has no genres', () => {
    expect(movieGenres(movie('a'))).toEqual([]);
  });
});

describe('movieDirectors', () => {
  it('splits a multi-credit list', () => {
    expect(movieDirectors(movie('a', { director: [{ name: 'Coen' }, { name: 'Coen J' }] }))).toEqual(['Coen', 'Coen J']);
  });

  it('reads the legacy plain-string credit', () => {
    expect(movieDirectors(movie('a', { director: 'Kubrick' as never }))).toEqual(['Kubrick']);
  });

  it('is empty for an uncredited title', () => {
    expect(movieDirectors(movie('a', { director: null as never }))).toEqual([]);
  });
});

describe('movieYear', () => {
  it('takes the year off the release date', () => {
    expect(movieYear(movie('a', { releaseDate: '1999-03-31' }))).toBe('1999');
  });

  it('is null without a usable date', () => {
    expect(movieYear(movie('a', { releaseDate: null }))).toBeNull();
    expect(movieYear(movie('a', { releaseDate: 'unknown' }))).toBeNull();
  });
});

describe('libraryFacets', () => {
  const movies = [
    movie('a', { genres: [{ name: 'Drama' }], director: [{ name: 'Villeneuve' }], releaseDate: '2021-10-22' }),
    movie('b', { genres: [{ name: 'Drama' }, { name: 'Sci-Fi' }], director: [{ name: 'Villeneuve' }], releaseDate: '2024-03-01' }),
    movie('c', { genres: [{ name: 'Sci-Fi' }], director: [{ name: 'Nolan' }], releaseDate: '2024-07-21' }),
  ];

  it('counts genres and leads with the most used', () => {
    expect(libraryFacets(movies).genres).toEqual([
      { value: 'Drama', count: 2 },
      { value: 'Sci-Fi', count: 2 },
    ]);
  });

  it('counts directors by titles, most prolific first', () => {
    expect(libraryFacets(movies).directors).toEqual([
      { value: 'Villeneuve', count: 2 },
      { value: 'Nolan', count: 1 },
    ]);
  });

  it('lists years newest first', () => {
    expect(libraryFacets(movies).years.map((f) => f.value)).toEqual(['2024', '2021']);
    expect(libraryFacets(movies).years[0].count).toBe(2);
  });

  it('counts a title once per facet value even when credited twice', () => {
    const twice = [movie('a', { genres: [{ name: 'Drama' }, { name: 'Drama' }] })];
    expect(libraryFacets(twice).genres).toEqual([{ value: 'Drama', count: 1 }]);
  });

  it('offers nothing for an empty library', () => {
    expect(libraryFacets([])).toEqual({ genres: [], directors: [], years: [] });
  });
});

describe('facet matching', () => {
  const dune = movie('dune', {
    genres: [{ name: 'Sci-Fi' }, { name: 'Adventure' }],
    director: [{ name: 'Villeneuve' }],
    releaseDate: '2021-10-22',
  });

  it('passes everything when nothing is selected', () => {
    expect(matchesGenreFilter(dune, [])).toBe(true);
    expect(matchesDirectorFilter(dune, [])).toBe(true);
    expect(matchesYearFilter(dune, [])).toBe(true);
  });

  it('matches any selected genre, not all of them', () => {
    expect(matchesGenreFilter(dune, ['Sci-Fi'])).toBe(true);
    expect(matchesGenreFilter(dune, ['Comedy', 'Adventure'])).toBe(true);
    expect(matchesGenreFilter(dune, ['Comedy'])).toBe(false);
  });

  it('matches a selected director', () => {
    expect(matchesDirectorFilter(dune, ['Villeneuve'])).toBe(true);
    expect(matchesDirectorFilter(dune, ['Nolan'])).toBe(false);
  });

  it('matches a selected year', () => {
    expect(matchesYearFilter(dune, ['2021'])).toBe(true);
    expect(matchesYearFilter(dune, ['2024'])).toBe(false);
  });

  it('excludes a title with no value for the facet being filtered', () => {
    const undated = movie('x', { releaseDate: null });
    expect(matchesYearFilter(undated, ['2024'])).toBe(false);
    expect(matchesYearFilter(undated, [])).toBe(true);
  });
});

describe('filterFacets', () => {
  const facets = [
    { value: 'Villeneuve', count: 3 },
    { value: 'Nolan', count: 2 },
  ];

  it('returns everything for a blank query', () => {
    expect(filterFacets(facets, '  ')).toEqual(facets);
  });

  it('matches case-insensitively on a substring', () => {
    expect(filterFacets(facets, 'nol')).toEqual([{ value: 'Nolan', count: 2 }]);
  });
});
