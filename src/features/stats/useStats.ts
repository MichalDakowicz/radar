import { useMemo } from 'react';

import { useToday } from '@/hooks/useToday';
import { computeStats, type Stats } from '@/lib/stats';
import type { ThresholdHistory } from '@/lib/streakThresholds';
import type { Movie } from '@/types/movie';

type ThresholdOpts = {
  streakThreshold?: number;
  tvStreakThreshold?: number;
  thresholdHistory?: ThresholdHistory;
};

// Thin memo wrapper. Streak thresholds come from user_settings on the own-stats
// screen (Phase 9); the public shelf omits them and computeStats falls back to
// the legacy defaults (2 movies / 5 episodes per week).
//
// The streak is measured as of today, so the memo also depends on the day: left
// alone it would only recompute when the library changed, and a streak read at
// 23:50 would still be showing yesterday's week at breakfast.
export function useStats(movies: Movie[], opts: ThresholdOpts = {}): Stats | null {
  const { streakThreshold, tvStreakThreshold, thresholdHistory } = opts;
  const today = useToday();
  return useMemo(
    () => computeStats(movies, { streakThreshold, tvStreakThreshold, thresholdHistory }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` is a trigger, not an input
    [movies, streakThreshold, tvStreakThreshold, thresholdHistory, today],
  );
}
