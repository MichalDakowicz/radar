import { currentEpisodeSeason, parseEpisodeKey, seasonsToPreload } from './seasonPreload';

describe('parseEpisodeKey', () => {
  it('reads a season/episode key and rejects anything else', () => {
    expect(parseEpisodeKey('s2e14')).toEqual({ season: 2, episode: 14 });
    expect(parseEpisodeKey('s10e1')).toEqual({ season: 10, episode: 1 });
    expect(parseEpisodeKey('season2')).toBeNull();
    expect(parseEpisodeKey('e1')).toBeNull();
  });
});

describe('currentEpisodeSeason', () => {
  it('opens on the season holding the most recent watch, not the highest', () => {
    const season = currentEpisodeSeason(
      {
        episodeWatchDates: {
          s3e1: ['2026-01-04T20:00:00.000Z'],
          s2e8: ['2026-08-30T20:00:00.000Z'],
        },
      },
      4,
    );
    expect(season).toBe(2);
  });

  it('falls back to the highest watched season when nothing carries a date', () => {
    expect(currentEpisodeSeason({ episodesWatched: { s1e1: true, s4e2: true, s2e9: false } }, 5)).toBe(4);
  });

  it('opens on season 1 for a series never started', () => {
    expect(currentEpisodeSeason({}, 6)).toBe(1);
    expect(currentEpisodeSeason({ episodeWatchDates: {}, episodesWatched: {} }, 6)).toBe(1);
  });

  it('clamps to the seasons the show actually has', () => {
    expect(currentEpisodeSeason({ episodesWatched: { s9e1: true } }, 3)).toBe(3);
    expect(currentEpisodeSeason({ episodesWatched: { s2e1: true } }, 0)).toBe(1);
    expect(currentEpisodeSeason({ episodesWatched: { s2e1: true } }, null)).toBe(1);
  });
});

describe('seasonsToPreload', () => {
  const show = (over: Record<string, unknown>) => ({
    type: 'tv',
    inProgress: true,
    tmdbId: 1,
    numberOfSeasons: 3,
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  });

  it('takes in-progress shows only, most recently touched first', () => {
    const targets = seasonsToPreload(
      [
        show({ tmdbId: 10, updatedAt: '2026-08-01T00:00:00.000Z' }),
        show({ tmdbId: 20, updatedAt: '2026-09-08T00:00:00.000Z', episodesWatched: { s2e1: true } }),
        show({ tmdbId: 30, inProgress: false }),
        show({ tmdbId: 40, type: 'movie' }),
        show({ tmdbId: null }),
      ],
      5,
    );

    expect(targets).toEqual([
      { tmdbId: 20, season: 2 },
      { tmdbId: 10, season: 1 },
    ]);
  });

  it('stops at the limit', () => {
    const shows = [1, 2, 3, 4].map((tmdbId) => show({ tmdbId }));
    expect(seasonsToPreload(shows, 2)).toHaveLength(2);
    expect(seasonsToPreload(shows, 0)).toEqual([]);
  });

  it('survives rows with no updatedAt', () => {
    expect(seasonsToPreload([show({ tmdbId: 7, updatedAt: undefined })], 5)).toEqual([{ tmdbId: 7, season: 1 }]);
  });
});
