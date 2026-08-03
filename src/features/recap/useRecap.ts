import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchRecap, listRecaps, saveRecap, type StoredRecap } from '@/features/recap/recapStore';
import { useRecapLeaderboard } from '@/features/recap/useRecapLeaderboard';
import { useMovies } from '@/hooks/useMovies';
import { personalScore } from '@/lib/personalScore';
import { buildMonthlyRecap, buildYearlyRecap } from '@/lib/recapBuild';
import { availablePeriods, isPeriodClosed, isValidPeriodKey, type RecapKind } from '@/lib/recapPeriod';
import type { Recap } from '@/lib/recap';
import type { Movie } from '@/types/movie';

// Load a recap: stored payload first, freshly built and cached on a miss. Every
// recap covers a period that has already ended, so there is no such thing as a
// stale one — only a schema version bump forces the work again.

const recapKey = (uid: string | undefined, kind: RecapKind, key: string) => ['recap', uid, kind, key] as const;
const indexKey = (uid: string | undefined) => ['recaps', uid] as const;

/**
 * Which recaps this account can open, and which of them are already cached. The
 * Profile rail and the archive both read this.
 */
export function useRecapIndex() {
  const { user } = useAuth();
  const { movies, loading } = useMovies();
  const stored = useQuery({
    queryKey: indexKey(user?.id),
    queryFn: () => listRecaps(user!.id),
    enabled: !!user?.id,
  });

  const rows = stored.data ?? ([] as StoredRecap[]);

  return {
    months: offered(movies, 'month', rows),
    years: offered(movies, 'year', rows),
    stored: rows,
    loading: loading || stored.isLoading,
  };
}

/**
 * Periods worth offering: the ones the library can build, plus any already
 * stored. A stored recap is a kept record — it stays openable even after the
 * titles behind it have been edited or removed, which is the whole reason the
 * payload is snapshotted rather than re-derived.
 */
function offered(movies: Movie[], kind: RecapKind, rows: StoredRecap[]): string[] {
  const keys = new Set(availablePeriods(movies, kind));
  for (const row of rows) {
    if (row.kind === kind && isPeriodClosed(kind, row.key)) keys.add(row.key);
  }
  return [...keys].sort().reverse();
}

export function useRecap(kind: RecapKind, key: string) {
  const { user } = useAuth();
  const uid = user?.id;
  const queryClient = useQueryClient();
  const { movies, loading: moviesLoading } = useMovies();
  const leaderboard = useRecapLeaderboard(kind === 'month' ? key : null);

  const query = useQuery({
    queryKey: recapKey(uid, kind, key),
    queryFn: async (): Promise<Recap> => {
      // Every recap covers a period that has already ended, so a stored payload
      // is always still true. Only a version bump or an explicit rebuild forces
      // the work again.
      const stored = await fetchRecap(uid!, kind, key);
      if (stored) return stored;
      const input = {
        movies,
        score: personalScore,
        leaderboard: leaderboard.data.rows,
        sharedTitle: leaderboard.data.sharedTitle,
      };
      const built = kind === 'month' ? buildMonthlyRecap(key, input) : buildYearlyRecap(key, input);
      await saveRecap(uid!, built);
      queryClient.invalidateQueries({ queryKey: indexKey(uid) });
      return built;
    },
    // The library and the leaderboard are inputs to the build, so waiting on them
    // is what stops a recap being cached with half a friend list in it. A key the
    // route could not parse never reaches the builder, which would otherwise
    // derive a period from NaN and store it — and neither does a period that has
    // not ended, whose numbers would still be moving.
    enabled: !!uid && isValidPeriodKey(kind, key) && isPeriodClosed(kind, key) && !moviesLoading && !leaderboard.loading,
    // A built recap is a snapshot; nothing about it goes stale while it is open.
    staleTime: Infinity,
  });

  const rebuild = useCallback(() => {
    queryClient.removeQueries({ queryKey: recapKey(uid, kind, key) });
  }, [queryClient, uid, kind, key]);

  return {
    recap: query.data ?? null,
    loading: query.isPending || moviesLoading || leaderboard.loading,
    error: query.error,
    rebuild,
  };
}
