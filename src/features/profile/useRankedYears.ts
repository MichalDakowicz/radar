import { useMemo } from 'react';

import { personalScore } from '@/lib/personalScore';
import { rankedYears, type RankedYear } from '@/lib/rankedYears';
import { useMovies } from '@/hooks/useMovies';

type UseRankedYears = {
  years: RankedYear[];
  /** The newest year with something ranked in it — what the Profile card shows. */
  latest: RankedYear | null;
  loading: boolean;
};

/**
 * Your library re-cut as one ranking per release year. Reads the same cached
 * useMovies list every other shelf surface does, so opening a year costs no
 * extra fetch.
 */
export function useRankedYears(): UseRankedYears {
  const { movies, loading } = useMovies();
  const years = useMemo(() => rankedYears(movies, (m) => personalScore(m.ratings)), [movies]);
  return { years, latest: years[0] ?? null, loading };
}

export function useRankedYear(year: number): { entry: RankedYear | null; loading: boolean } {
  const { years, loading } = useRankedYears();
  return { entry: years.find((y) => y.year === year) ?? null, loading };
}
