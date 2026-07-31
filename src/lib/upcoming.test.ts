import { COMING_SOON_LIMIT, isUpcomingRelease, releaseTimestamp, selectComingSoon } from './upcoming';
import type { Movie } from '@/types/movie';

const NOW = new Date(2026, 6, 31, 14, 30).getTime(); // 31 Jul 2026, local afternoon

const movie = (id: string, releaseDate: string | null, overrides: Partial<Movie> = {}): Movie =>
  ({
    id,
    title: `Title ${id}`,
    type: 'movie',
    releaseDate,
    inWatchlist: true,
    inProgress: false,
    watched: false,
    ...overrides,
  }) as Movie;

describe('releaseTimestamp', () => {
  it('parses a full TMDB date', () => {
    expect(releaseTimestamp('2027-05-14')).toBe(new Date('2027-05-14').getTime());
  });

  it('parses a bare year as its first day', () => {
    expect(releaseTimestamp('2027')).toBe(new Date(2027, 0, 1).getTime());
  });

  it('returns NaN for a missing or blank date', () => {
    expect(releaseTimestamp(null)).toBeNaN();
    expect(releaseTimestamp('')).toBeNaN();
    expect(releaseTimestamp('   ')).toBeNaN();
    expect(releaseTimestamp('not a date')).toBeNaN();
  });
});

describe('isUpcomingRelease', () => {
  it('keeps a release next year', () => {
    expect(isUpcomingRelease(movie('a', '2027-05-14'), NOW)).toBe(true);
  });

  it('keeps a release years out', () => {
    expect(isUpcomingRelease(movie('a', '2031-01-01'), NOW)).toBe(true);
  });

  it('keeps a title releasing today', () => {
    expect(isUpcomingRelease(movie('a', '2026-07-31'), NOW)).toBe(true);
  });

  it('drops a title already released', () => {
    expect(isUpcomingRelease(movie('a', '2026-07-30'), NOW)).toBe(false);
  });

  it('drops a title with no release date', () => {
    expect(isUpcomingRelease(movie('a', null), NOW)).toBe(false);
  });

  it('drops a title that is neither in the watchlist nor in progress', () => {
    const watched = movie('a', '2027-05-14', { inWatchlist: false, inProgress: false, watched: true });
    expect(isUpcomingRelease(watched, NOW)).toBe(false);
  });

  it('keeps an in-progress show with an upcoming season date', () => {
    const airing = movie('a', '2027-01-02', { type: 'tv', inWatchlist: false, inProgress: true });
    expect(isUpcomingRelease(airing, NOW)).toBe(true);
  });
});

describe('selectComingSoon', () => {
  it('orders soonest first regardless of how far out', () => {
    const picked = selectComingSoon(
      [movie('far', '2029-03-01'), movie('soon', '2026-08-02'), movie('mid', '2027-12-25')],
      NOW,
    );
    expect(picked.map((m) => m.id)).toEqual(['soon', 'mid', 'far']);
  });

  it('excludes past releases', () => {
    const picked = selectComingSoon([movie('old', '2020-01-01'), movie('new', '2027-01-01')], NOW);
    expect(picked.map((m) => m.id)).toEqual(['new']);
  });

  it('caps the carousel', () => {
    const many = Array.from({ length: COMING_SOON_LIMIT + 5 }, (_, i) =>
      movie(`m${i}`, `2027-01-${String((i % 28) + 1).padStart(2, '0')}`),
    );
    expect(selectComingSoon(many, NOW)).toHaveLength(COMING_SOON_LIMIT);
  });
});
