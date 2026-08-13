import {
  clearEpisodeWatches,
  episodeWatchCount,
  episodeWatchLog,
  episodesWatchedMirror,
  logEpisodeWatch,
  mergeEpisodeMirror,
  normalizeEpisodeWatchDates,
  showWatchCount,
  totalEpisodeWatches,
  unlogEpisodeWatch,
  watchedEpisodeCount,
} from '@/lib/episodes';

const AUG_1 = '2026-08-01T20:00:00.000Z';
const AUG_13 = '2026-08-13T21:00:00.000Z';

describe('normalizeEpisodeWatchDates', () => {
  it('wraps a pre-2.12.0 bare stamp in a log', () => {
    expect(normalizeEpisodeWatchDates({ s1e1: AUG_1 })).toEqual({ s1e1: [AUG_1] });
  });

  it('keeps an array as it is, oldest stamp first', () => {
    expect(normalizeEpisodeWatchDates({ s1e1: [AUG_13, AUG_1] })).toEqual({ s1e1: [AUG_1, AUG_13] });
  });

  it('coerces the oldest shape of all, epoch millis', () => {
    const ms = Date.parse(AUG_1);
    expect(normalizeEpisodeWatchDates({ s1e1: ms })).toEqual({ s1e1: [AUG_1] });
  });

  it('drops keys with nothing usable in them', () => {
    expect(normalizeEpisodeWatchDates({ s1e1: [], s1e2: 'whenever', s1e3: null })).toEqual({});
  });

  it('survives a missing or non-object column', () => {
    expect(normalizeEpisodeWatchDates(null)).toEqual({});
    expect(normalizeEpisodeWatchDates('nope')).toEqual({});
  });
});

describe('counting watches', () => {
  const show = { episodeWatchDates: { s1e1: [AUG_1, AUG_13], s1e2: [AUG_1] } };

  it('counts per episode and in total', () => {
    expect(episodeWatchCount(show, 's1e1')).toBe(2);
    expect(episodeWatchCount(show, 's1e2')).toBe(1);
    expect(episodeWatchCount(show, 's1e9')).toBe(0);
    expect(totalEpisodeWatches(show)).toBe(3);
    expect(watchedEpisodeCount(show)).toBe(2);
  });

  it('returns one episode log, oldest first', () => {
    expect(episodeWatchLog(show, 's1e1')).toEqual([AUG_1, AUG_13]);
    expect(episodeWatchLog(show, 's1e9')).toEqual([]);
  });

  // A legacy row can carry a tick that never had a date; reading it as zero
  // watches would unwatch the episode and take hours off the total.
  it('reads a dateless legacy tick as one watch', () => {
    const legacy = { episodesWatched: { s1e1: true }, episodeWatchDates: {} };
    expect(episodeWatchCount(legacy, 's1e1')).toBe(1);
    expect(watchedEpisodeCount(legacy)).toBe(1);
    expect(totalEpisodeWatches(legacy)).toBe(1);
  });
});

describe('showWatchCount', () => {
  it('is the minimum across every episode TMDB lists', () => {
    const twice = { numberOfEpisodes: 2, episodeWatchDates: { s1e1: [AUG_1, AUG_13], s1e2: [AUG_1, AUG_13] } };
    expect(showWatchCount(twice)).toBe(2);
  });

  it('drops to the lowest episode, so a partial rewatch does not inflate it', () => {
    const uneven = { numberOfEpisodes: 2, episodeWatchDates: { s1e1: [AUG_1, AUG_13], s1e2: [AUG_1] } };
    expect(showWatchCount(uneven)).toBe(1);
  });

  it('is zero while an episode is missing from the log', () => {
    const partial = { numberOfEpisodes: 3, episodeWatchDates: { s1e1: [AUG_1], s1e2: [AUG_1] } };
    expect(showWatchCount(partial)).toBe(0);
  });

  it('is zero for a show with nothing logged', () => {
    expect(showWatchCount({ numberOfEpisodes: 10, episodeWatchDates: {} })).toBe(0);
  });

  // Without a total there is nothing to be missing, so the log is all there is
  // to go on - better than reporting zero for a show TMDB has not counted.
  it('falls back to the logged episodes when the total is unknown', () => {
    expect(showWatchCount({ episodeWatchDates: { s1e1: [AUG_1, AUG_13], s1e2: [AUG_1] } })).toBe(1);
  });
});

describe('logging and unlogging', () => {
  it('appends a watch', () => {
    expect(logEpisodeWatch({}, 's1e1', AUG_1)).toEqual({ s1e1: [AUG_1] });
    expect(logEpisodeWatch({ s1e1: [AUG_1] }, 's1e1', AUG_13)).toEqual({ s1e1: [AUG_1, AUG_13] });
  });

  it('ignores a stamp it cannot read', () => {
    expect(logEpisodeWatch({}, 's1e1', 'whenever')).toEqual({});
  });

  it('drops the latest stamp by default', () => {
    expect(unlogEpisodeWatch({ s1e1: [AUG_1, AUG_13] }, 's1e1')).toEqual({ s1e1: [AUG_1] });
  });

  it('drops a named stamp', () => {
    expect(unlogEpisodeWatch({ s1e1: [AUG_1, AUG_13] }, 's1e1', AUG_1)).toEqual({ s1e1: [AUG_13] });
  });

  // The key going means the episode is unwatched, which is what the tick-box did.
  it('removes the key with its last stamp', () => {
    expect(unlogEpisodeWatch({ s1e1: [AUG_1] }, 's1e1')).toEqual({});
  });

  it('leaves an unknown key alone', () => {
    expect(unlogEpisodeWatch({ s1e1: [AUG_1] }, 's1e9')).toEqual({ s1e1: [AUG_1] });
  });

  it('clears every watch of one episode', () => {
    expect(clearEpisodeWatches({ s1e1: [AUG_1, AUG_13], s1e2: [AUG_1] }, 's1e1')).toEqual({ s1e2: [AUG_1] });
  });
});

describe('the derived mirror', () => {
  it('marks every key the log holds', () => {
    expect(episodesWatchedMirror({ s1e1: [AUG_1, AUG_13], s1e2: [AUG_1] })).toEqual({ s1e1: true, s1e2: true });
  });

  it('keeps a legacy tick that never had a date', () => {
    expect(mergeEpisodeMirror({ s1e1: true, s1e2: false }, { s1e3: [AUG_1] })).toEqual({ s1e1: true, s1e3: true });
  });
});
