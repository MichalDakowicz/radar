import { shouldSyncStreak, SNAPSHOT_STALE_MS, weekShortfall, type StreakSnapshot } from '@/lib/streakSnapshot';

const NOW = Date.parse('2026-08-02T12:00:00Z');
const fresh = new Date(NOW - 60_000).toISOString();

// Wednesday 12 August 2026; its Monday is the 10th.
const WEDNESDAY = new Date(2026, 7, 12, 20, 0, 0);
const MONDAY = '2026-08-10';

describe('weekShortfall', () => {
  it('is zero once the week meets the threshold', () => {
    // Four films on the Monday: the rest of the week cannot break the streak.
    expect(weekShortfall({ '2026-08-10': 4 }, 2, WEDNESDAY)).toEqual({ weekStart: MONDAY, needed: 0 });
  });

  it('counts what the week still owes', () => {
    expect(weekShortfall({ '2026-08-10': 1 }, 3, WEDNESDAY)).toEqual({ weekStart: MONDAY, needed: 2 });
    expect(weekShortfall({}, 2, WEDNESDAY)).toEqual({ weekStart: MONDAY, needed: 2 });
  });

  it('ignores activity in a neighbouring week', () => {
    // The Sunday before and the Monday after both fall outside this week.
    expect(weekShortfall({ '2026-08-09': 5, '2026-08-17': 5 }, 2, WEDNESDAY)).toEqual({ weekStart: MONDAY, needed: 2 });
  });

  it('anchors the week to Monday from a Sunday too', () => {
    const sunday = new Date(2026, 7, 16, 20, 0, 0);
    expect(weekShortfall({ '2026-08-10': 1 }, 2, sunday)).toEqual({ weekStart: MONDAY, needed: 1 });
  });
});

describe('shouldSyncStreak', () => {
  const snapshot = (over: Partial<StreakSnapshot> = {}): StreakSnapshot => ({
    currentStreak: 5,
    streakUpdatedAt: fresh,
    streakWeekStart: MONDAY,
    streakWeekNeeded: 1,
    ...over,
  });
  const state = { currentStreak: 5, weekStart: MONDAY, needed: 1 };

  it('stays quiet when the figures match and the snapshot is fresh', () => {
    expect(shouldSyncStreak(state, snapshot(), NOW)).toBe(false);
  });

  it('syncs when the streak has moved', () => {
    expect(shouldSyncStreak({ ...state, currentStreak: 6 }, snapshot(), NOW)).toBe(true);
    expect(shouldSyncStreak({ ...state, currentStreak: 0 }, snapshot(), NOW)).toBe(true);
  });

  // A snapshot describing last week would have the generator warning on a week
  // it knows nothing about, or staying silent through a week that is at risk.
  it('syncs when the week has rolled over', () => {
    expect(shouldSyncStreak({ ...state, weekStart: '2026-08-17' }, snapshot(), NOW)).toBe(true);
  });

  it('syncs when the shortfall changes', () => {
    expect(shouldSyncStreak({ ...state, needed: 0 }, snapshot(), NOW)).toBe(true);
    expect(shouldSyncStreak({ ...state, needed: 2 }, snapshot(), NOW)).toBe(true);
  });

  it('syncs when there is no snapshot at all', () => {
    expect(shouldSyncStreak(state, snapshot({ streakUpdatedAt: null }), NOW)).toBe(true);
  });

  // The generator discards anything older than 36h, so an unchanged streak still
  // has to re-announce itself or the warning silently stops arriving.
  it('re-sends an unchanged streak once the snapshot goes stale', () => {
    const stale = new Date(NOW - SNAPSHOT_STALE_MS - 1).toISOString();
    expect(shouldSyncStreak(state, snapshot({ streakUpdatedAt: stale }), NOW)).toBe(true);
  });

  it('does not trust an unparseable or future timestamp', () => {
    expect(shouldSyncStreak(state, snapshot({ streakUpdatedAt: 'whenever' }), NOW)).toBe(true);
    const future = new Date(NOW + 60_000).toISOString();
    expect(shouldSyncStreak(state, snapshot({ streakUpdatedAt: future }), NOW)).toBe(true);
  });
});
