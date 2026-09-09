import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useUserSettings } from '@/hooks/useUserSettings';
import { useMovies } from '@/hooks/useMovies';
import {
  buildLeavingTitles,
  splitLeaving,
  todayKey,
  type Expiration,
  type LeavingTitle,
} from '@/lib/leaving';
import { supabase } from '@/lib/supabase';
import type { MediaType } from '@/types/movie';

// Reads public.streaming_expirations — the shared catalogue the sync-expirations
// edge function fills twice a week. Nothing here ever calls the upstream API;
// see supabase/expirations.sql for why that is not negotiable.

type ExpirationRow = {
  service_name: string;
  tmdb_id: number;
  media_type: MediaType;
  expires_on: string;
  title: string;
  poster_url: string | null;
  release_year: number | null;
  link: string | null;
};

/** The catalogue only ever holds ~31 days, but the query is explicit about it so
 *  a future change upstream cannot quietly turn this into an unbounded scan. */
const HORIZON_DAYS = 45;

/** The list is region-wide, not narrowed to the services you own, so this has to
 *  clear a whole country's month: measured at ~171 rows for Poland and ~790 for
 *  the US. Sized well above the larger of those rather than to it. */
const ROW_CAP = 1500;

function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

async function fetchExpirations(country: string, today: string): Promise<Expiration[]> {
  const request = supabase
    .from('streaming_expirations')
    .select('service_name,tmdb_id,media_type,expires_on,title,poster_url,release_year,link')
    .eq('country', country)
    .gte('expires_on', today)
    .lte('expires_on', addDays(today, HORIZON_DAYS))
    .order('expires_on', { ascending: true })
    .limit(ROW_CAP);

  const { data, error } = await request;
  // A project that has not had expirations.sql run against it has no table, and
  // PostgREST answers that with 42P01 or a schema-cache miss. That is the
  // documented "not set up yet" state, not a failure — the surfaces are supposed
  // to show their empty state, the same as a country with nothing leaving.
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) return [];
  if (error) throw error;

  return (data as ExpirationRow[]).map((row) => ({
    serviceName: row.service_name,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    expiresOn: row.expires_on,
    title: row.title,
    posterUrl: row.poster_url,
    releaseYear: row.release_year,
    link: row.link,
  }));
}

export type LeavingSoon = {
  /** Everything in scope, flat and date-sorted, before any filter row is
   *  applied — the page narrows this itself and needs the whole set to build
   *  its service chips from. */
  titles: LeavingTitle[];
  /** In your watchlist and running out of time. */
  tracked: LeavingTitle[];
  /** Leaving and never saved. */
  discover: LeavingTitle[];
  loading: boolean;
  error: unknown;
  /** False when the catalogue holds nothing for this region — the surfaces say
   *  "nothing tracked here yet" rather than "nothing is leaving", which are very
   *  different claims and only one of them is honest. */
  hasCatalogue: boolean;
  /** How many of the region's titles are on services you already pay for. Lets a
   *  surface offer the My-services filter only when it would leave something. */
  ownedCount: number;
};

/**
 * `onlyOwned` narrows to services the user subscribes to. The fetch does not
 * change with it — the whole region is pulled once and cached, so the toggle is
 * a filter over data already in hand rather than a round trip.
 */
export function useLeavingSoon(onlyOwned = false): LeavingSoon {
  const { settings } = useUserSettings();
  const { movies, loading: moviesLoading } = useMovies();
  const country = settings.watchProviderCountry;
  const owned = settings.ownedServices;

  const today = useMemo(() => todayKey(), []);

  const query = useQuery({
    queryKey: ['leaving-soon', country, today],
    queryFn: () => fetchExpirations(country, today),
    // The catalogue is rewritten twice a week; refetching it on every focus
    // would be pure noise.
    staleTime: 6 * 60 * 60 * 1000,
  });

  const titles = useMemo(
    () => buildLeavingTitles(query.data ?? [], movies ?? [], owned, today, { onlyOwned }),
    [query.data, movies, owned, today, onlyOwned],
  );

  const { tracked, discover } = useMemo(() => splitLeaving(titles), [titles]);

  const ownedCount = useMemo(
    () => (query.data ?? []).filter((row) => owned.includes(row.serviceName)).length,
    [query.data, owned],
  );

  return {
    titles,
    tracked,
    discover,
    loading: query.isLoading || moviesLoading,
    error: query.error,
    hasCatalogue: (query.data?.length ?? 0) > 0,
    ownedCount,
  };
}
