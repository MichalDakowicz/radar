import {
  getDisplayStatus,
  getStatusIcon,
  isActivelyWatching,
  isInProgress,
  isInWatchlist,
  isWatched,
  migrateStatus,
  setToInProgress,
  setToUnwatched,
  setToWatched,
  setToWatchlist,
} from './movieStatus';

describe('isActivelyWatching', () => {
  it('is true only while a title is genuinely underway', () => {
    expect(isActivelyWatching({ inProgress: true, watched: false })).toBe(true);
    expect(isActivelyWatching({ inProgress: false, watched: false })).toBe(false);
  });

  it('is false once the title is finished, flag or no flag', () => {
    expect(isActivelyWatching({ inProgress: true, watched: true })).toBe(false);
    // Legacy shape: no boolean flags, so a rewatch count is what says "finished".
    expect(isActivelyWatching({ inProgress: true, timesWatched: 2 })).toBe(false);
  });

  it('is false for a series with every episode ticked', () => {
    const show = { type: 'tv', inProgress: true, watched: false, number_of_episodes: 2 };
    expect(isActivelyWatching({ ...show, episodesWatched: { s1e1: true, s1e2: true } })).toBe(false);
    expect(isActivelyWatching({ ...show, episodesWatched: { s1e1: true } })).toBe(true);
  });
});

describe('migrateStatus', () => {
  it('defaults a bare movie to watchlist', () => {
    expect(migrateStatus({})).toEqual({ inWatchlist: true, inProgress: false, watched: false });
  });

  it('maps legacy Completed/Watched to watched', () => {
    expect(migrateStatus({ status: 'Completed' })).toEqual({
      inWatchlist: false,
      inProgress: false,
      watched: true,
    });
    expect(migrateStatus({ status: 'Watched' })).toEqual({
      inWatchlist: false,
      inProgress: false,
      watched: true,
    });
  });

  it('maps legacy Watching to inProgress, carrying rewatch state from timesWatched', () => {
    expect(migrateStatus({ status: 'Watching' })).toEqual({
      inWatchlist: false,
      inProgress: true,
      watched: false,
    });
    expect(migrateStatus({ status: 'Watching', timesWatched: 2 })).toEqual({
      inWatchlist: false,
      inProgress: true,
      watched: true,
    });
  });

  it('marks a TV show watched via legacy Watchlist status when all episodes are watched', () => {
    const flags = migrateStatus({
      status: 'Watchlist',
      type: 'tv',
      number_of_episodes: 2,
      episodesWatched: { s1e1: true, s1e2: true },
    });
    expect(flags).toEqual({ inWatchlist: true, inProgress: false, watched: true });
  });

  it('is idempotent once boolean flags exist', () => {
    const flags = { inWatchlist: false, inProgress: false, watched: true };
    expect(migrateStatus(flags)).toEqual(flags);
  });

  it('resolves inProgress+inWatchlist conflicts by prioritizing inProgress', () => {
    expect(migrateStatus({ inWatchlist: true, inProgress: true, watched: false })).toEqual({
      inWatchlist: false,
      inProgress: true,
      watched: false,
    });
  });

  it('force re-migrates from status even when flags already exist', () => {
    expect(
      migrateStatus({ inWatchlist: false, inProgress: false, watched: false, status: 'Watching' }, true),
    ).toEqual({ inWatchlist: false, inProgress: true, watched: false });
  });
});

describe('getDisplayStatus priority', () => {
  it('inProgress beats inWatchlist and watched', () => {
    expect(getDisplayStatus({ inProgress: true, inWatchlist: true, watched: true })).toBe('Watching');
  });
  it('inWatchlist beats watched (the rewatch case still reads as Watchlist)', () => {
    expect(getDisplayStatus({ inProgress: false, inWatchlist: true, watched: true })).toBe('Watchlist');
  });
  it('falls back to Completed when only watched is set', () => {
    expect(getDisplayStatus({ inProgress: false, inWatchlist: false, watched: true })).toBe('Completed');
  });
  it('defaults to Watchlist when nothing is set', () => {
    expect(getDisplayStatus({ inProgress: false, inWatchlist: false, watched: false })).toBe('Watchlist');
  });
});

describe('setTo* transitions', () => {
  it('setToWatchlist clears inProgress and preserves watched', () => {
    expect(setToWatchlist({ watched: true })).toEqual({
      inWatchlist: true,
      inProgress: false,
      watched: true,
      status: 'Watchlist',
    });
  });

  it('setToInProgress clears inWatchlist and preserves watched', () => {
    expect(setToInProgress({ watched: true })).toEqual({
      inWatchlist: false,
      inProgress: true,
      watched: true,
      status: 'Watching',
    });
  });

  it('setToWatched is the rewatch case: preserves inWatchlist, bumps timesWatched', () => {
    expect(setToWatched({ inWatchlist: true }, 3)).toEqual({
      inWatchlist: true,
      inProgress: false,
      watched: true,
      timesWatched: 3,
      status: 'Completed',
    });
  });
});

describe('legacy string fallbacks (no boolean flags present)', () => {
  it('isInWatchlist/isInProgress/isWatched read from the legacy status string', () => {
    expect(isInWatchlist({ status: 'Plan to Watch' })).toBe(true);
    expect(isInProgress({ status: 'Watching' })).toBe(true);
    expect(isWatched({ status: 'Completed' })).toBe(true);
    expect(isWatched({ status: 'Watchlist', timesWatched: 1 })).toBe(true);
  });
});

describe('getStatusIcon', () => {
  it('follows the same inProgress > inWatchlist > watched priority', () => {
    expect(getStatusIcon({ inProgress: true, inWatchlist: true, watched: true })).toBe('watching');
    expect(getStatusIcon({ inProgress: false, inWatchlist: true, watched: true })).toBe('watchlist');
    expect(getStatusIcon({ inProgress: false, inWatchlist: false, watched: true })).toBe('completed');
    expect(getStatusIcon({ inProgress: false, inWatchlist: false, watched: false })).toBe('watchlist');
  });
});

describe('setToUnwatched', () => {
  // A row left "Completed, watched 0×" is what removing the last watch used to
  // leave behind.
  it('puts a film that lost its last watch back on the watchlist', () => {
    expect(setToUnwatched({ type: 'movie', watched: true, inWatchlist: false })).toEqual({
      inWatchlist: true,
      inProgress: false,
      watched: false,
      status: 'Watchlist',
    });
  });

  it('calls a series with episodes still ticked partway through, not unstarted', () => {
    expect(setToUnwatched({ type: 'tv', watched: true, numberOfEpisodes: 4, episodesWatched: { s1e1: true } })).toEqual({
      inWatchlist: false,
      inProgress: true,
      watched: false,
      status: 'Watching',
    });
  });

  it('never leaves the watched flag standing', () => {
    expect(setToUnwatched({ watched: true }).watched).toBe(false);
    expect(setToUnwatched({ type: 'tv', watched: true, episodesWatched: { s1e1: true } }).watched).toBe(false);
  });
});
