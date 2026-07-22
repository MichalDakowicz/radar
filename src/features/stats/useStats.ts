import { useMemo } from 'react';

import { computeStats, type Stats } from '@/lib/stats';
import type { Movie } from '@/types/movie';

// Thin memo wrapper. Streak thresholds are hardcoded to the legacy defaults
// for now; the user-configurable values live in user_settings and get wired
// in Phase 9 (doc 03 Settings).
export function useStats(movies: Movie[]): Stats | null {
  return useMemo(() => computeStats(movies), [movies]);
}
