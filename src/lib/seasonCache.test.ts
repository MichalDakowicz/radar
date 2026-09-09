import {
  AIRING_TTL_MS,
  SETTLED_TTL_MS,
  isSeasonStale,
  parseSeasonEntry,
  seasonTtl,
  toSeasonEntry,
  type SeasonEntry,
} from './seasonCache';

const NOW = Date.parse('2026-09-09T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function payload(episodes: unknown[]) {
  return { id: 1, name: 'Season 1', episodes };
}

describe('toSeasonEntry', () => {
  it('keeps only the fields the tracker renders', () => {
    const entry = toSeasonEntry(
      payload([
        {
          id: 9,
          episode_number: 1,
          name: 'Pilot',
          air_date: '2020-01-05',
          overview: 'It begins',
          still_path: '/big.jpg',
          crew: [{ id: 1 }],
          guest_stars: [{ id: 2 }],
        },
      ]),
      NOW,
    );

    expect(entry).toEqual({
      fetchedAt: NOW,
      episodes: [{ id: 9, episode_number: 1, name: 'Pilot', air_date: '2020-01-05', overview: 'It begins' }],
    });
  });

  it('normalises a blank air date to null and fills missing text', () => {
    const entry = toSeasonEntry(payload([{ id: 3, episode_number: 2, air_date: '' }]), NOW);
    expect(entry?.episodes[0]).toEqual({ id: 3, episode_number: 2, name: '', air_date: null, overview: '' });
  });

  it('rejects a failed fetch, a non-season payload and an empty season', () => {
    expect(toSeasonEntry(null, NOW)).toBeNull();
    expect(toSeasonEntry({ status_message: 'Not found' }, NOW)).toBeNull();
    expect(toSeasonEntry(payload([]), NOW)).toBeNull();
    expect(toSeasonEntry(payload([{ name: 'no number' }]), NOW)).toBeNull();
  });
});

describe('parseSeasonEntry', () => {
  it('round-trips what was written', () => {
    const entry = toSeasonEntry(payload([{ id: 1, episode_number: 1, name: 'A', air_date: '2020-01-05' }]), NOW);
    expect(parseSeasonEntry(JSON.stringify(entry))).toEqual(entry);
  });

  it('reads corrupt, empty and undated storage as a miss', () => {
    expect(parseSeasonEntry(null)).toBeNull();
    expect(parseSeasonEntry('')).toBeNull();
    expect(parseSeasonEntry('{ not json')).toBeNull();
    expect(parseSeasonEntry(JSON.stringify({ episodes: [{ episode_number: 1 }] }))).toBeNull();
  });
});

describe('seasonTtl', () => {
  const settled: SeasonEntry = {
    fetchedAt: NOW,
    episodes: [
      { id: 1, episode_number: 1, name: 'A', air_date: '2020-01-05', overview: '' },
      { id: 2, episode_number: 2, name: 'B', air_date: '2020-01-12', overview: '' },
    ],
  };

  it('trusts a season whose finale aired long ago for weeks', () => {
    expect(seasonTtl(settled, NOW)).toBe(SETTLED_TTL_MS);
  });

  it('revalidates a season still airing within hours', () => {
    const airing: SeasonEntry = {
      fetchedAt: NOW,
      episodes: [{ id: 1, episode_number: 1, name: 'A', air_date: '2026-09-08', overview: '' }],
    };
    expect(seasonTtl(airing, NOW)).toBe(AIRING_TTL_MS);
  });

  it('revalidates when an episode has no air date at all', () => {
    const unknown: SeasonEntry = {
      fetchedAt: NOW,
      episodes: [
        { id: 1, episode_number: 1, name: 'A', air_date: '2020-01-05', overview: '' },
        { id: 2, episode_number: 2, name: 'B', air_date: null, overview: '' },
      ],
    };
    expect(seasonTtl(unknown, NOW)).toBe(AIRING_TTL_MS);
  });

  it('is stale the moment its ttl has run out, and a miss is always stale', () => {
    expect(isSeasonStale(settled, NOW + DAY)).toBe(false);
    expect(isSeasonStale(settled, NOW + 31 * DAY)).toBe(true);
    expect(isSeasonStale(null, NOW)).toBe(true);
  });
});
