import {
  applyThresholdChanges,
  changeThreshold,
  EMPTY_THRESHOLD_HISTORY,
  normalizeThresholdHistory,
  thresholdForWeek,
  type ThresholdHistory,
} from './streakThresholds';

describe('thresholdForWeek', () => {
  it('is the current threshold when there is no history', () => {
    expect(thresholdForWeek('2026-09-28', 4, [])).toBe(4);
  });

  it('uses the recorded threshold for weeks before a step and the current one from it on', () => {
    const steps = [{ before: '2026-09-07', threshold: 2 }];
    expect(thresholdForWeek('2026-08-31', 4, steps)).toBe(2);
    expect(thresholdForWeek('2026-09-07', 4, steps)).toBe(4);
    expect(thresholdForWeek('2026-09-14', 4, steps)).toBe(4);
  });

  it('walks several steps in order', () => {
    const steps = [
      { before: '2026-06-01', threshold: 1 },
      { before: '2026-09-07', threshold: 2 },
    ];
    expect(thresholdForWeek('2026-05-25', 5, steps)).toBe(1);
    expect(thresholdForWeek('2026-06-01', 5, steps)).toBe(2);
    expect(thresholdForWeek('2026-08-31', 5, steps)).toBe(2);
    expect(thresholdForWeek('2026-09-07', 5, steps)).toBe(5);
  });
});

describe('changeThreshold', () => {
  const now = '2026-09-28';

  it('files the old number against earlier weeks for "from now on"', () => {
    const next = changeThreshold(EMPTY_THRESHOLD_HISTORY, 'movie', 2, 'from-now', now);
    expect(next.movie).toEqual([{ before: now, threshold: 2 }]);
    expect(next.tv).toEqual([]);
  });

  it('does not touch the other kind', () => {
    const history: ThresholdHistory = { movie: [], tv: [{ before: '2026-08-03', threshold: 3 }] };
    const next = changeThreshold(history, 'movie', 2, 'from-now', now);
    expect(next.tv).toBe(history.tv);
  });

  it('stacks a second change made in a later week', () => {
    const first = changeThreshold(EMPTY_THRESHOLD_HISTORY, 'movie', 2, 'from-now', '2026-09-07');
    const second = changeThreshold(first, 'movie', 4, 'from-now', '2026-09-28');
    expect(second.movie).toEqual([
      { before: '2026-09-07', threshold: 2 },
      { before: '2026-09-28', threshold: 4 },
    ]);
    expect(thresholdForWeek('2026-09-14', 6, second.movie)).toBe(4);
  });

  it('adds nothing when the same week is changed twice', () => {
    const first = changeThreshold(EMPTY_THRESHOLD_HISTORY, 'movie', 2, 'from-now', now);
    const second = changeThreshold(first, 'movie', 4, 'from-now', now);
    expect(second).toBe(first);
    // Earlier weeks still read 2; this week onwards reads the current number.
    expect(thresholdForWeek('2026-09-21', 6, second.movie)).toBe(2);
    expect(thresholdForWeek(now, 6, second.movie)).toBe(6);
  });

  it('forgets that kind of history for "whole history"', () => {
    const history: ThresholdHistory = {
      movie: [{ before: '2026-09-07', threshold: 2 }],
      tv: [{ before: '2026-08-03', threshold: 3 }],
    };
    const next = changeThreshold(history, 'movie', 4, 'whole-history', now);
    expect(next.movie).toEqual([]);
    expect(next.tv).toBe(history.tv);
  });

  it('returns the same object when there is nothing to forget', () => {
    expect(changeThreshold(EMPTY_THRESHOLD_HISTORY, 'tv', 5, 'whole-history', now)).toBe(EMPTY_THRESHOLD_HISTORY);
  });
});

describe('normalizeThresholdHistory', () => {
  it('reads a missing or malformed column as no history', () => {
    expect(normalizeThresholdHistory(undefined)).toBe(EMPTY_THRESHOLD_HISTORY);
    expect(normalizeThresholdHistory(null)).toBe(EMPTY_THRESHOLD_HISTORY);
    expect(normalizeThresholdHistory('nope')).toBe(EMPTY_THRESHOLD_HISTORY);
    expect(normalizeThresholdHistory({})).toBe(EMPTY_THRESHOLD_HISTORY);
    expect(normalizeThresholdHistory([])).toBe(EMPTY_THRESHOLD_HISTORY);
  });

  it('keeps valid steps, sorted, and drops the broken ones', () => {
    const out = normalizeThresholdHistory({
      movie: [
        { before: '2026-09-07', threshold: 2 },
        { before: 'last tuesday', threshold: 2 },
        { before: '2026-06-01', threshold: 0 },
        { before: '2026-06-01', threshold: 1.5 },
        { before: '2026-06-01', threshold: 1 },
        null,
      ],
      tv: 'x',
    });
    expect(out.movie).toEqual([
      { before: '2026-06-01', threshold: 1 },
      { before: '2026-09-07', threshold: 2 },
    ]);
    expect(out.tv).toEqual([]);
  });
});

describe('applyThresholdChanges', () => {
  const now = '2026-09-28';

  it('records every kind that moved', () => {
    const next = applyThresholdChanges(
      EMPTY_THRESHOLD_HISTORY,
      { movie: { previous: 2, next: 3 }, tv: { previous: 5, next: 8 } },
      'from-now',
      now,
    );
    expect(next.movie).toEqual([{ before: now, threshold: 2 }]);
    expect(next.tv).toEqual([{ before: now, threshold: 5 }]);
  });

  it('skips a kind whose number did not change', () => {
    const next = applyThresholdChanges(
      EMPTY_THRESHOLD_HISTORY,
      { movie: { previous: 2, next: 2 }, tv: { previous: 5, next: 8 } },
      'from-now',
      now,
    );
    expect(next.movie).toEqual([]);
    expect(next.tv).toHaveLength(1);
  });

  it('hands back the same history when nothing changed', () => {
    expect(applyThresholdChanges(EMPTY_THRESHOLD_HISTORY, {}, 'from-now', now)).toBe(EMPTY_THRESHOLD_HISTORY);
  });

  it('clears the changed kinds for the whole history', () => {
    const history: ThresholdHistory = { movie: [{ before: '2026-09-07', threshold: 2 }], tv: [{ before: '2026-09-07', threshold: 5 }] };
    const next = applyThresholdChanges(history, { movie: { previous: 3, next: 4 } }, 'whole-history', now);
    expect(next.movie).toEqual([]);
    expect(next.tv).toBe(history.tv);
  });
});
