import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useUserSettings } from '@/hooks/useUserSettings';
import { useMovies } from '@/hooks/useMovies';
import {
  buildLeavingTitles,
  groupByDay,
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

/** Safety net for a user with no services configured, where the query cannot be
 *  narrowed by service. A whole country's month is a few hundred rows, not a few
 *  thousand, so this should never bite. */
const ROW_CAP = 600;

function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

async function fetchExpirations(country: string, owned: string[], today: string): Promise<Expiration[]> {
  let request = supabase
    .from('streaming_expirations')
    .select('service_name,tmdb_id,media_type,expires_on,title,poster_url,release_year,link')
    .eq('country', country)
    .gte('expires_on', today)
    .lte('expires_on', addDays(today, HORIZON_DAYS))
    .order('expires_on', { ascending: true })
    .limit(ROW_CAP);

  // Narrowing server-side matters on a big catalogue: the US month is ~790 rows
  // across 10 services, and a signed poster URL is most of a row's weight.
  if (owned.length > 0) request = request.in('service_name', owned);

  const { data, error } = await request;
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
  /** In your watchlist and running out of time. */
  tracked: LeavingTitle[];
  /** Leaving your services, never saved. */
  discover: LeavingTitle[];
  /** Everything, bucketed `YYYY-MM-DD` for the calendar grid. */
  byDay: Map<string, LeavingTitle[]>;
  loading: boolean;
  error: unknown;
  /** False when the catalogue is empty for this region — the surfaces say
   *  "nothing tracked here yet" rather than "nothing is leaving", which are very
   *  different claims and only one of them is honest. */
  hasCatalogue: boolean;
};

export function useLeavingSoon(): LeavingSoon {
  const { settings } = useUserSettings();
  const { movies, loading: moviesLoading } = useMovies();
  const country = settings.watchProviderCountry;
  const owned = settings.ownedServices;

  const today = useMemo(() => todayKey(), []);

  const query = useQuery({
    queryKey: ['leaving-soon', country, owned, today],
    queryFn: () => fetchExpirations(country, owned, today),
    // The catalogue is rewritten twice a week; refetching it on every focus
    // would be pure noise.
    staleTime: 6 * 60 * 60 * 1000,
  });

  const titles = useMemo(
    () => buildLeavingTitles(query.data ?? [], movies ?? [], owned, today),
    [query.data, movies, owned, today],
  );

  const { tracked, discover } = useMemo(() => splitLeaving(titles), [titles]);
  const byDay = useMemo(() => groupByDay(titles), [titles]);

  return {
    tracked,
    discover,
    byDay,
    loading: query.isLoading || moviesLoading,
    error: query.error,
    hasCatalogue: (query.data?.length ?? 0) > 0,
  };
}
