import { datedPasses, totalWatches, undatedWatches, watchedMinutes } from '@/lib/watchCounts';

const ISO = '2026-03-03T20:00:00.000Z';
const LATER = '2026-08-13T20:00:00.000Z';

describe('datedPasses', () => {
  it('is 0 or 1 for a film, from its one completion date', () => {
    expect(datedPasses({ type: 'movie', completedAt: ISO, timesWatched: 3 })).toBe(1);
    expect(datedPasses({ type: 'movie', completedAt: null, timesWatched: 3 })).toBe(0);
  });

  it('is the episode log minimum for a series', () => {
    const show = { type: 'tv', numberOfEpisodes: 2, episodeWatchDates: { s1e1: [ISO, LATER], s1e2: [ISO, LATER] } };
    expect(datedPasses(show)).toBe(2);
    expect(datedPasses({ ...show, episodeWatchDates: { s1e1: [ISO, LATER], s1e2: [ISO] } })).toBe(1);
  });

  it('is zero for a series with nothing tracked, however high the count', () => {
    expect(datedPasses({ type: 'tv', numberOfEpisodes: 10, timesWatched: 5 })).toBe(0);
  });
});

describe('undatedWatches', () => {
  // The case this exists for: five viewings recorded before per-episode tracking,
  // with no dates anywhere to convert into a log.
  it('is the whole count when nothing is dated', () => {
    expect(undatedWatches({ type: 'tv', numberOfEpisodes: 10, timesWatched: 5 })).toBe(5);
    expect(undatedWatches({ type: 'movie', timesWatched: 2, completedAt: null })).toBe(2);
  });

  it('subtracts the passes a calendar can already show', () => {
    expect(undatedWatches({ type: 'movie', timesWatched: 3, completedAt: ISO })).toBe(2);
    expect(
      undatedWatches({
        type: 'tv',
        numberOfEpisodes: 2,
        timesWatched: 3,
        episodeWatchDates: { s1e1: [ISO, LATER], s1e2: [ISO, LATER] },
      }),
    ).toBe(1);
  });

  it('never goes negative when the log outgrows the stored count', () => {
    expect(
      undatedWatches({
        type: 'tv',
        numberOfEpisodes: 2,
        timesWatched: 1,
        episodeWatchDates: { s1e1: [ISO, LATER], s1e2: [ISO, LATER] },
      }),
    ).toBe(0);
  });
});

describe('totalWatches', () => {
  it('adds the two halves and floors them at zero', () => {
    expect(totalWatches(1, 2)).toBe(3);
    expect(totalWatches(0, 0)).toBe(0);
    expect(totalWatches(-4, 2)).toBe(2);
  });
});

describe('watchedMinutes', () => {
  it('scales a film by its total watches, dated or not', () => {
    expect(watchedMinutes({ type: 'movie', runtime: 100, timesWatched: 3, completedAt: ISO })).toBe(300);
    expect(watchedMinutes({ type: 'movie', runtime: 100, timesWatched: 0 })).toBe(0);
  });

  it('bills a series by its episode log', () => {
    const show = { type: 'tv', runtime: 30, numberOfEpisodes: 2, timesWatched: 1 };
    expect(watchedMinutes({ ...show, episodeWatchDates: { s1e1: [ISO], s1e2: [ISO] } })).toBe(60);
  });

  it('adds a full pass of episodes for every undated watch', () => {
    // Five passes, none of them dated: 10 episodes * 12 min * 5.
    expect(watchedMinutes({ type: 'tv', runtime: 12, numberOfEpisodes: 10, timesWatched: 5 })).toBe(600);
  });

  it('guesses ten episodes a season when TMDB gives no count', () => {
    expect(watchedMinutes({ type: 'tv', runtime: 30, numberOfSeasons: 2, timesWatched: 1 })).toBe(600);
  });

  it('cannot bill a dated pass twice', () => {
    // One dated pass of two episodes plus one remembered: 4 episode-watches worth.
    const show = {
      type: 'tv',
      runtime: 30,
      numberOfEpisodes: 2,
      timesWatched: 2,
      episodeWatchDates: { s1e1: [ISO], s1e2: [ISO] },
    };
    expect(watchedMinutes(show)).toBe(120);
  });

  it('is nothing without a runtime to multiply', () => {
    expect(watchedMinutes({ type: 'tv', runtime: 0, numberOfEpisodes: 10, timesWatched: 5 })).toBe(0);
  });
});
