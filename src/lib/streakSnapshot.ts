// When to push the client's streak figure up to user_settings.
//
// The streak-risk generator in supabase/notifications.sql cannot compute this
// itself: lib/stats.ts applies a weekly threshold the user chooses, walks back
// over per-day completion buckets, and folds in episode watch dates — re-deriving
// that in SQL would be a second implementation to keep in step with the first.
// So the client snapshots the answer and the generator only decides whether to
// warn. That makes freshness the whole contract.

/** The generator ignores a snapshot older than this, so it has to be re-sent. */
export const SNAPSHOT_STALE_MS = 12 * 60 * 60 * 1000;

export type StreakSnapshot = {
  currentStreak: number;
  streakUpdatedAt: string | null;
};

/**
 * True when the server's copy no longer matches, or has aged far enough that
 * the generator would discard it. Deliberately not "on every app open": the
 * write is a round-trip and a realtime invalidation, and a streak that has not
 * moved has nothing to say.
 */
export function shouldSyncStreak(current: number, snapshot: StreakSnapshot, now: number = Date.now()): boolean {
  if (current !== snapshot.currentStreak) return true;
  if (!snapshot.streakUpdatedAt) return true;
  const at = Date.parse(snapshot.streakUpdatedAt);
  if (Number.isNaN(at)) return true;
  // A clock that has gone backwards (timezone change, manual set) reads as a
  // future timestamp; re-sending is cheaper than trusting it.
  return now - at >= SNAPSHOT_STALE_MS || at > now;
}
