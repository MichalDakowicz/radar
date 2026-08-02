import { shouldSyncStreak, SNAPSHOT_STALE_MS } from '@/lib/streakSnapshot';

const NOW = Date.parse('2026-08-02T12:00:00Z');
const fresh = new Date(NOW - 60_000).toISOString();

describe('shouldSyncStreak', () => {
  it('stays quiet when the figure matches and the snapshot is fresh', () => {
    expect(shouldSyncStreak(5, { currentStreak: 5, streakUpdatedAt: fresh }, NOW)).toBe(false);
  });

  it('syncs when the streak has moved', () => {
    expect(shouldSyncStreak(6, { currentStreak: 5, streakUpdatedAt: fresh }, NOW)).toBe(true);
    expect(shouldSyncStreak(0, { currentStreak: 5, streakUpdatedAt: fresh }, NOW)).toBe(true);
  });

  it('syncs when there is no snapshot at all', () => {
    expect(shouldSyncStreak(5, { currentStreak: 5, streakUpdatedAt: null }, NOW)).toBe(true);
  });

  // The generator discards anything older than 36h, so an unchanged streak still
  // has to re-announce itself or the warning silently stops arriving.
  it('re-sends an unchanged streak once the snapshot goes stale', () => {
    const stale = new Date(NOW - SNAPSHOT_STALE_MS - 1).toISOString();
    expect(shouldSyncStreak(5, { currentStreak: 5, streakUpdatedAt: stale }, NOW)).toBe(true);
  });

  it('does not trust an unparseable or future timestamp', () => {
    expect(shouldSyncStreak(5, { currentStreak: 5, streakUpdatedAt: 'whenever' }, NOW)).toBe(true);
    const future = new Date(NOW + 60_000).toISOString();
    expect(shouldSyncStreak(5, { currentStreak: 5, streakUpdatedAt: future }, NOW)).toBe(true);
  });
});
