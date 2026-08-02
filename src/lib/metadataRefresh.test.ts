import {
  isVolatile,
  maxAgeMs,
  metadataPatch,
  selectRefreshQueue,
  stalenessScore,
  toRefreshCandidate,
  STABLE_MAX_AGE_MS,
  VOLATILE_MAX_AGE_MS,
  type RefreshCandidate,
} from './metadataRefresh';
import type { MediaMetadata } from './tmdb';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-02T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function candidate(overrides: Partial<RefreshCandidate> = {}): RefreshCandidate {
  return {
    id: 'id-1',
    tmdbId: 1,
    type: 'movie',
    title: 'Title',
    tmdbStatus: 'Released',
    releaseDate: '2001-01-01',
    metadataSyncedAt: ago(DAY),
    ...overrides,
  };
}

describe('isVolatile', () => {
  it('treats airing and unreleased titles as volatile', () => {
    expect(isVolatile(candidate({ tmdbStatus: 'Returning Series' }), NOW)).toBe(true);
    expect(isVolatile(candidate({ tmdbStatus: 'In Production' }), NOW)).toBe(true);
    expect(isVolatile(candidate({ releaseDate: null }), NOW)).toBe(true);
    expect(isVolatile(candidate({ releaseDate: '2027-01-01' }), NOW)).toBe(true);
  });

  it('treats a recent release as volatile and an old one as settled', () => {
    expect(isVolatile(candidate({ releaseDate: ago(30 * DAY).slice(0, 10) }), NOW)).toBe(true);
    expect(isVolatile(candidate({ releaseDate: '1999-03-31' }), NOW)).toBe(false);
  });

  it('falls back to volatile on an unparseable release date', () => {
    expect(isVolatile(candidate({ releaseDate: 'not-a-date' }), NOW)).toBe(true);
  });
});

describe('maxAgeMs', () => {
  it('gives volatile titles the short allowance', () => {
    expect(maxAgeMs(candidate({ tmdbStatus: 'Returning Series' }), NOW)).toBe(VOLATILE_MAX_AGE_MS);
    expect(maxAgeMs(candidate(), NOW)).toBe(STABLE_MAX_AGE_MS);
  });
});

describe('stalenessScore', () => {
  it('is Infinity for a never-synced title', () => {
    expect(stalenessScore(candidate({ metadataSyncedAt: null }), NOW)).toBe(Infinity);
  });

  it('scores overdue as a multiple of the title-specific allowance', () => {
    const airing = candidate({ tmdbStatus: 'Returning Series', metadataSyncedAt: ago(6 * DAY) });
    const settled = candidate({ metadataSyncedAt: ago(6 * DAY) });
    expect(stalenessScore(airing, NOW)).toBeCloseTo(2);
    expect(stalenessScore(settled, NOW)).toBeCloseTo(0.2);
  });
});

describe('selectRefreshQueue', () => {
  it('drops titles still inside their allowance', () => {
    const fresh = candidate({ id: 'fresh', metadataSyncedAt: ago(2 * DAY) });
    expect(selectRefreshQueue([fresh], { now: NOW, limit: 10 })).toEqual([]);
  });

  it('queues a never-synced title', () => {
    const never = candidate({ id: 'never', metadataSyncedAt: null });
    expect(selectRefreshQueue([never], { now: NOW, limit: 10 }).map((c) => c.id)).toEqual(['never']);
  });

  it('puts an overdue airing show ahead of a longer-untouched old film', () => {
    const airing = candidate({ id: 'airing', tmdbStatus: 'Returning Series', metadataSyncedAt: ago(10 * DAY) });
    const oldFilm = candidate({ id: 'old', metadataSyncedAt: ago(40 * DAY) });
    expect(selectRefreshQueue([oldFilm, airing], { now: NOW, limit: 10 }).map((c) => c.id)).toEqual(['airing', 'old']);
  });

  it('honours the limit', () => {
    const many = Array.from({ length: 5 }, (_, i) => candidate({ id: `m${i}`, metadataSyncedAt: null, title: `T${i}` }));
    expect(selectRefreshQueue(many, { now: NOW, limit: 2 })).toHaveLength(2);
  });

  it('orders ties by title so a resumed run does not reshuffle', () => {
    const b = candidate({ id: 'b', title: 'Beta', metadataSyncedAt: null });
    const a = candidate({ id: 'a', title: 'Alpha', metadataSyncedAt: null });
    expect(selectRefreshQueue([b, a], { now: NOW, limit: 10 }).map((c) => c.id)).toEqual(['a', 'b']);
  });

  describe('with a full refresh in flight', () => {
    const since = ago(60 * 1000);

    it('queues even a title synced minutes ago, if it predates the sweep', () => {
      const recent = candidate({ id: 'recent', metadataSyncedAt: ago(5 * 60 * 1000) });
      expect(selectRefreshQueue([recent], { now: NOW, limit: 10, fullRefreshSince: since }).map((c) => c.id)).toEqual([
        'recent',
      ]);
    });

    it('drops titles the sweep already covered, which is what makes it resumable', () => {
      const done = candidate({ id: 'done', metadataSyncedAt: ago(10 * 1000) });
      const todo = candidate({ id: 'todo', metadataSyncedAt: ago(10 * DAY) });
      expect(selectRefreshQueue([done, todo], { now: NOW, limit: 10, fullRefreshSince: since }).map((c) => c.id)).toEqual(
        ['todo'],
      );
    });

    it('ignores an unparseable marker and falls back to staleness', () => {
      const fresh = candidate({ id: 'fresh', metadataSyncedAt: ago(2 * DAY) });
      expect(selectRefreshQueue([fresh], { now: NOW, limit: 10, fullRefreshSince: 'nonsense' })).toEqual([]);
    });
  });
});

describe('toRefreshCandidate', () => {
  it('rejects a row with no TMDB id', () => {
    expect(
      toRefreshCandidate({
        id: 'x',
        tmdb_id: null,
        type: 'movie',
        title: 'T',
        tmdb_status: null,
        release_date: null,
        metadata_synced_at: null,
      }),
    ).toBeNull();
  });
});

describe('metadataPatch', () => {
  const fresh: MediaMetadata = {
    tmdbId: 42,
    type: 'movie',
    title: 'Fresh Title',
    director: [{ id: 1, name: 'D' }],
    releaseDate: '2020-01-01',
    coverUrl: 'https://img/poster.jpg',
    overview: 'o',
    genres: [{ id: 2, name: 'Drama' }],
    runtime: 100,
    cast: [{ id: 3, name: 'A' }],
    availability: ['Netflix'],
    number_of_seasons: null,
    number_of_episodes: null,
    tmdbStatus: 'Released',
    voteAverage: 7.5,
    voteCount: 100,
    imdbId: 'tt1',
    budget: 10,
    revenue: 20,
    tagline: 'tag',
    productionCompanies: [{ id: 4, name: 'Studio', logo: null }],
  };

  it('carries every TMDB-sourced field and no user-owned one', () => {
    const patch = metadataPatch(fresh);
    expect(patch.title).toBe('Fresh Title');
    expect(patch.availability).toEqual(['Netflix']);
    expect(patch).not.toHaveProperty('ratings');
    expect(patch).not.toHaveProperty('watched');
    expect(patch).not.toHaveProperty('notes');
  });

  it('leaves empty fields undefined so the stored value survives the write', () => {
    const patch = metadataPatch({
      ...fresh,
      title: '',
      coverUrl: null,
      imdbId: null,
      tagline: '',
      availability: [],
      productionCompanies: [],
      number_of_seasons: null,
    });
    expect(patch.title).toBeUndefined();
    expect(patch.coverUrl).toBeUndefined();
    expect(patch.imdbId).toBeUndefined();
    expect(patch.tagline).toBeUndefined();
    expect(patch.availability).toBeUndefined();
    expect(patch.productionCompanies).toBeUndefined();
    expect(patch.numberOfSeasons).toBeUndefined();
  });
});
