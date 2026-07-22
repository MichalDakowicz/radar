import { movieMatchesSearchQuery } from './librarySearch';

const base = {
  title: 'The Matrix',
  director: [{ id: 1, name: 'Lana Wachowski' }],
  genres: [{ id: 1, name: 'Science Fiction' }],
  releaseDate: '1999-03-31',
};

describe('movieMatchesSearchQuery', () => {
  it('matches everything on an empty query', () => {
    expect(movieMatchesSearchQuery(base, '')).toBe(true);
    expect(movieMatchesSearchQuery(base, '   ')).toBe(true);
  });

  it('matches on title, case-insensitively', () => {
    expect(movieMatchesSearchQuery(base, 'matrix')).toBe(true);
    expect(movieMatchesSearchQuery(base, 'MATRIX')).toBe(true);
  });

  it('matches on director name', () => {
    expect(movieMatchesSearchQuery(base, 'wachowski')).toBe(true);
  });

  it('matches on genre name', () => {
    expect(movieMatchesSearchQuery(base, 'science')).toBe(true);
  });

  it('matches on a release-year prefix', () => {
    expect(movieMatchesSearchQuery(base, '1999')).toBe(true);
    expect(movieMatchesSearchQuery(base, '2000')).toBe(false);
  });

  it('returns false when nothing matches', () => {
    expect(movieMatchesSearchQuery(base, 'inception')).toBe(false);
  });
});
