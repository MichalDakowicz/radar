import { useEffect } from 'react';

import { useStats } from '@/features/stats/useStats';
import { useMovies } from '@/hooks/useMovies';
import { useUserSettings } from '@/hooks/useUserSettings';
import { shouldSyncStreak, weekShortfall } from '@/lib/streakSnapshot';

/**
 * Keeps user_settings.current_streak in step with what Stats actually shows, so
 * the 8pm streak-risk generator has a figure to warn about. Renders nothing;
 * mounted from the tabs layout, where the library is loaded anyway — putting it
 * in the root layout would pull the whole library down on the login screen.
 *
 * The maths is not repeated here: this is the same useStats the Stats screen
 * reads, so the number in the notification is the number on the page. The week's
 * shortfall rides along, because that — not "nothing logged today" — is what
 * decides whether the streak can actually break.
 */
export function StreakSnapshot() {
  const { movies, loading: moviesLoading } = useMovies();
  const { settings, loading: settingsLoading, updateSettings } = useUserSettings();

  const stats = useStats(movies, {
    streakThreshold: settings.streakThreshold,
    tvStreakThreshold: settings.tvStreakThreshold,
  });
  const streak = stats?.currentStreak ?? 0;
  const tvStreak = stats?.currentTVStreak ?? 0;
  const { weekStart, needed } = weekShortfall(stats?.dailyCompletions ?? {}, settings.streakThreshold);

  useEffect(() => {
    // An empty library computes a zero streak; writing that over a real one
    // before the first fetch lands would cancel tonight's warning.
    if (moviesLoading || settingsLoading || !settings.notifyStreaks) return;
    if (!shouldSyncStreak({ currentStreak: streak, tvStreak, weekStart, needed }, settings)) return;
    void updateSettings({
      currentStreak: streak,
      // The same figure under its own name, and the TV one beside it, for the
      // sibling apps to read. Written in this patch rather than a second one so
      // `movie_streak` and `current_streak` cannot end up describing different
      // days — see docs/shared-database.md in Lidar, Sonar and Pulsar.
      movieStreak: streak,
      tvStreak,
      streakUpdatedAt: new Date().toISOString(),
      streakWeekStart: weekStart,
      streakWeekNeeded: needed,
    });
  }, [streak, tvStreak, weekStart, needed, moviesLoading, settingsLoading, settings, updateSettings]);

  return null;
}
