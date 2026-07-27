import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useMovies } from '@/hooks/useMovies';

import { heroPopularOptions } from './heroQuery';
import { prefetchDiscoveryFeed } from './useDiscoveryFeed';

// Browse is slow on its first mount: the discovery feed fans out a dozen TMDB
// calls. Mounted once in the tabs layout, this warms that feed + hero in the
// background right after login, so tapping Browse the first time is a cache hit
// instead of a spinner. A later refresh (pull-to-refresh / double-tap reload)
// still refetches normally - only the very first load is preloaded.
//
// Waits for the library to load first: the feed personalizes on the user's own
// genres, and since `movies` isn't in the query key, whatever is warmed is what
// the live query reuses. Preloading with an empty library would cache a
// non-personalized feed. Runs once - the ref guards against realtime library
// updates re-triggering it.
export function useBrowsePreload() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { movies, loading } = useMovies();
  const done = useRef(false);

  useEffect(() => {
    // Without a user the library query is disabled (loading=false, movies=[]),
    // so gate on `user` too - otherwise we'd cache an empty, non-personalized feed.
    if (done.current || !user || loading) return;
    done.current = true;
    void prefetchDiscoveryFeed(queryClient, 'movies', movies);
    void queryClient.prefetchQuery(heroPopularOptions('movies'));
  }, [user, loading, movies, queryClient]);
}
