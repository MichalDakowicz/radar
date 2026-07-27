import * as tmdb from '@/lib/tmdb';

import { toDiscoveryMovie } from './toDiscoveryMovie';

const HOUR_MS = 60 * 60 * 1000;

// Shared so both the Browse screen's live query and the preload (mounted in the
// tabs layout) build the exact same query - same key, same fetch, same
// staleTime - so a warmed entry is a cache hit when Browse actually mounts.
export function heroPopularOptions(feedTab: 'movies' | 'tv') {
  return {
    queryKey: ['hero-popular', feedTab],
    queryFn: async () => {
      const items = feedTab === 'tv' ? await tmdb.getTVShows('popular') : await tmdb.getMovies('popular');
      return items.map(toDiscoveryMovie);
    },
    staleTime: HOUR_MS,
  };
}
