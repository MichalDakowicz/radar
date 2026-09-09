import { useQuery, type QueryClient } from '@tanstack/react-query';

import { isSeasonStale, seasonTtl, toSeasonEntry, type SeasonEntry } from '@/lib/seasonCache';
import { readSeasonEntry, writeSeasonEntry } from '@/lib/seasonStore';
import * as tmdb from '@/lib/tmdb';

// The season endpoint, wrapped so its answer outlives the process. Episodes is
// the default tab of a series, so the common case - opening a show you are
// part-way through - has to render from the device cache and revalidate behind
// the screen instead of showing a spinner (lib/seasonCache for the two TTLs).

function seasonQueryKey(tmdbId: number | null, season: number | null) {
  return ['tmdb', 'season', tmdbId, season] as const;
}

export function seasonQueryOptions(tmdbId: number | null, season: number | null) {
  return {
    queryKey: seasonQueryKey(tmdbId, season),
    queryFn: async (): Promise<SeasonEntry> => {
      const payload = await tmdb.fetchSeasonDetails(tmdbId as number, season as number);
      const entry = toSeasonEntry(payload, Date.now());
      if (entry) {
        writeSeasonEntry(tmdbId, season, entry);
        return entry;
      }
      // A failed or empty response must not blank out a good cached season.
      return readSeasonEntry(tmdbId, season) ?? { episodes: [], fetchedAt: Date.now() };
    },
    // A finished season is trusted for weeks, one still airing for hours.
    staleTime: (query: { state: { data?: SeasonEntry } }) => seasonTtl(query.state.data, Date.now()),
  };
}

export function useSeasonDetails(tmdbId: number | null, season: number | null) {
  const cached = readSeasonEntry(tmdbId, season);

  return useQuery({
    ...seasonQueryOptions(tmdbId, season),
    enabled: !!tmdbId && season != null,
    // Hydrating from MMKV means `isLoading` is false on a season the device
    // already has: the list is on screen at once and only refetches when its
    // TTL has run out.
    initialData: cached ?? undefined,
    initialDataUpdatedAt: cached?.fetchedAt,
  });
}

/**
 * Warm one season into the device cache. Skips anything still fresh, so a
 * repeat pass over the same library costs nothing.
 */
export async function prefetchSeason(client: QueryClient, tmdbId: number, season: number): Promise<void> {
  if (!isSeasonStale(readSeasonEntry(tmdbId, season), Date.now())) return;
  await client.prefetchQuery(seasonQueryOptions(tmdbId, season));
}
