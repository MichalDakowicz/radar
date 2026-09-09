import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useMovies } from '@/hooks/useMovies';
import { prefetchSeason } from '@/hooks/useSeasonDetails';
import { seasonsToPreload } from '@/lib/seasonPreload';

/** Enough to cover what anyone is actually watching without sweeping the library. */
const MAX_PRELOADED_SHOWS = 12;

// One failed fetch must not be retried on every library refetch, and the
// library query hands back a fresh array each time it settles - so a season
// attempted in this process is not attempted again. A successful one is
// skipped anyway: prefetchSeason reads the device cache first.
const attempted = new Set<string>();

/**
 * Warms the Episodes tab for the shows the user is part-way through, so
 * opening one renders its episode list from the device instead of waiting on
 * TMDB. Renders nothing - it is mounted once, above the navigator.
 */
export function SeasonPreload() {
  const { movies } = useMovies();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (movies.length === 0) return;
    for (const { tmdbId, season } of seasonsToPreload(movies, MAX_PRELOADED_SHOWS)) {
      const token = `${tmdbId}:${season}`;
      if (attempted.has(token)) continue;
      attempted.add(token);
      void prefetchSeason(queryClient, tmdbId, season);
    }
  }, [movies, queryClient]);

  return null;
}
