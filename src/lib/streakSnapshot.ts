// When to push the client's streak figure up to user_settings.
//
// The streak-risk generator in supabase/notifications.sql cannot compute this
// itself: lib/stats.ts applies a weekly threshold the user chooses, walks back
// over per-day completion buckets, and folds in episode watch dates — re-deriving
// that in SQL would be a second implementation to keep in step with the first.
// So the client snapshots the answer and the generator only decides whether to
// warn. That makes freshness the whole contract.

import { countInWeek, dateKey, weekStart } from '@/lib/stats';

/** The generator ignores a snapshot older than this, so it has to be re-sent. */
export const SNAPSHOT_STALE_MS = 12 * 60 * 60 * 1000;

export type StreakSnapshot = {
  currentStreak: number;
  streakUpdatedAt: string | null;
  /** Monday of the week the shortfall below was measured in, `YYYY-MM-DD`. */
  streakWeekStart: string | null;
  /** Completions still owed this week to keep the streak. 0 = safe. */
  streakWeekNeeded: number;
};

/** What the client has just computed, ready to compare against the snapshot. */
export type StreakState = {
  currentStreak: number;
  weekStart: string;
  needed: number;
};

/**
 * How far this week is from keeping the streak alive.
 *
 * A streak here is weekly-threshold based, not daily (lib/stats): an empty day
 * does not break it as long as its week meets `threshold`. So "nothing logged
 * today" is not risk — watching four films on Monday with a threshold of two
 * makes the rest of the week safe, and warning every evening anyway is the
 * daily-nag bug. `needed` is what actually puts the streak on the line.
 */
export function weekShortfall(
  dailyCompletions: Record<string, number>,
  threshold: number,
  now: Date = new Date(),
): { weekStart: string; needed: number } {
  const start = weekStart(now);
  const inWeek = countInWeek(dailyCompletions, start);
  return { weekStart: dateKey(start), needed: Math.max(0, threshold - inWeek) };
}

/**
 * True when the server's copy no longer matches, or has aged far enough that
 * the generator would discard it. Deliberately not "on every app open": the
 * write is a round-trip and a realtime invalidation, and a streak that has not
 * moved has nothing to say.
 */
export function shouldSyncStreak(current: StreakState, snapshot: StreakSnapshot, now: number = Date.now()): boolean {
  if (current.currentStreak !== snapshot.currentStreak) return true;
  // A snapshot describing last week is useless tonight, and one describing a
  // shortfall that has since been paid off would warn about nothing.
  if (current.weekStart !== snapshot.streakWeekStart) return true;
  if (current.needed !== snapshot.streakWeekNeeded) return true;
  if (!snapshot.streakUpdatedAt) return true;
  const at = Date.parse(snapshot.streakUpdatedAt);
  if (Number.isNaN(at)) return true;
  // A clock that has gone backwards (timezone change, manual set) reads as a
  // future timestamp; re-sending is cheaper than trusting it.
  return now - at >= SNAPSHOT_STALE_MS || at > now;
}
