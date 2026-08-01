import { sharedCountLabel, sharedWatchlist } from './sharedWatchlist';
import type { Movie } from '@/types/movie';

const movie = (title: string, overrides: Partial<Movie> = {}): Movie =>
  ({
    id: `${title}-${overrides.userId ?? 'me'}`,
    userId: 'me',
    tmdbId: null,
    type: 'movie',
    title,
    coverUrl: `https://img/${title}`,
    releaseDate: '2024-03-01',
    runtime: 120,
    availability: [],
    inWatchlist: true,
    inProgress: false,
    watched: false,
    ...overrides,
  }) as Movie;

describe('sharedWatchlist', () => {
  it('keeps only titles on both watchlists', () => {
    const result = sharedWatchlist(
      [movie('Dune', { tmdbId: 1 }), movie('Flow', { tmdbId: 2 })],
      [movie('Dune', { tmdbId: 1 }), movie('Aftersun', { tmdbId: 3 })],
    );
    expect(result.map((t) => t.title)).toEqual(['Dune']);
  });

  it('ignores titles either side is not planning to watch', () => {
    const result = sharedWatchlist(
      [movie('Dune', { tmdbId: 1, inWatchlist: false, watched: true })],
      [movie('Dune', { tmdbId: 1 })],
    );
    expect(result).toEqual([]);
  });

  it('keeps a rewatch — watched but still on the list', () => {
    const result = sharedWatchlist(
      [movie('Dune', { tmdbId: 1, watched: true })],
      [movie('Dune', { tmdbId: 1 })],
    );
    expect(result).toHaveLength(1);
  });

  it('unions the streaming services from both libraries', () => {
    const result = sharedWatchlist(
      [movie('Dune', { tmdbId: 1, availability: ['Max', 'Netflix'] })],
      [movie('Dune', { tmdbId: 1, availability: ['Netflix', 'Prime Video'] })],
    );
    expect(result[0].services).toEqual(['Max', 'Netflix', 'Prime Video']);
  });

  it('matches manual entries on title and TMDB entries on id', () => {
    const byTitle = sharedWatchlist([movie('  dune  ')], [movie('Dune')]);
    expect(byTitle).toHaveLength(1);

    const differentIds = sharedWatchlist([movie('Dune', { tmdbId: 1 })], [movie('Dune', { tmdbId: 2 })]);
    expect(differentIds).toEqual([]);
  });

  it('pulls the release year out of the date', () => {
    const [first] = sharedWatchlist([movie('Dune', { tmdbId: 1 })], [movie('Dune', { tmdbId: 1 })]);
    expect(first.releaseYear).toBe('2024');
  });

  it('leaves the year null when the date is missing or malformed', () => {
    const [first] = sharedWatchlist(
      [movie('Dune', { tmdbId: 1, releaseDate: null })],
      [movie('Dune', { tmdbId: 1, releaseDate: null })],
    );
    expect(first.releaseYear).toBeNull();
  });

  it('falls back to the other side for a missing cover', () => {
    const [first] = sharedWatchlist(
      [movie('Dune', { tmdbId: 1 })],
      [movie('Dune', { tmdbId: 1, coverUrl: null })],
    );
    expect(first.coverUrl).toBe('https://img/Dune');
  });

  it('sorts by title and never repeats one', () => {
    const result = sharedWatchlist(
      [movie('Zone', { tmdbId: 1 }), movie('Aftersun', { tmdbId: 2 })],
      [movie('Zone', { tmdbId: 1 }), movie('Zone', { tmdbId: 1 }), movie('Aftersun', { tmdbId: 2 })],
    );
    expect(result.map((t) => t.title)).toEqual(['Aftersun', 'Zone']);
  });
});

describe('sharedCountLabel', () => {
  it('covers none, one and many', () => {
    expect(sharedCountLabel(0)).toBe('Nothing on both your watchlists yet.');
    expect(sharedCountLabel(1)).toBe('1 title on both your watchlists.');
    expect(sharedCountLabel(7)).toBe('7 titles on both your watchlists.');
  });
});
