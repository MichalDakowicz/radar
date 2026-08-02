import { useEffect } from 'react';

import { useStats } from '@/features/stats/useStats';
import { useMovies } from '@/hooks/useMovies';
import { useUserSettings } from '@/hooks/useUserSettings';
import { shouldSyncStreak } from '@/lib/streakSnapshot';

/**
 * Keeps user_settings.current_streak in step with what Stats actually shows, so
 * the 8pm streak-risk generator has a figure to warn about. Renders nothing;
 * mounted from the tabs layout, where the library is loaded anyway — putting it
 * in the root layout would pull the whole library down on the login screen.
 *
 * The maths is not repeated here: this is the same useStats the Stats screen
 * reads, so the number in the notification is the number on the page.
 */
export function StreakSnapshot() {
  const { movies, loading: moviesLoading } = useMovies();
  const { settings, loading: settingsLoading, updateSettings } = useUserSettings();

  const stats = useStats(movies, {
    streakThreshold: settings.streakThreshold,
    tvStreakThreshold: settings.tvStreakThreshold,
  });
  const streak = stats?.currentStreak ?? 0;

  useEffect(() => {
    // An empty library computes a zero streak; writing that over a real one
    // before the first fetch lands would cancel tonight's warning.
    if (moviesLoading || settingsLoading || !settings.notifyStreaks) return;
    if (!shouldSyncStreak(streak, settings)) return;
    void updateSettings({ currentStreak: streak, streakUpdatedAt: new Date().toISOString() });
  }, [streak, moviesLoading, settingsLoading, settings, updateSettings]);

  return null;
}
