import { useMemo } from 'react';

import { computeStats, type Stats } from '@/lib/stats';
import type { Movie } from '@/types/movie';

type ThresholdOpts = { streakThreshold?: number; tvStreakThreshold?: number };

// Thin memo wrapper. Streak thresholds come from user_settings on the own-stats
// screen (Phase 9); the public shelf omits them and computeStats falls back to
// the legacy defaults (2 movies / 5 episodes per week).
export function useStats(movies: Movie[], opts: ThresholdOpts = {}): Stats | null {
  const { streakThreshold, tvStreakThreshold } = opts;
  return useMemo(
    () => computeStats(movies, { streakThreshold, tvStreakThreshold }),
    [movies, streakThreshold, tvStreakThreshold],
  );
}
