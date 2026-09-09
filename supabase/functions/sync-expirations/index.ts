// sync-expirations — fills public.streaming_expirations from the Streaming
// Availability API (movieofthenight).
//
// Runs on Supabase Edge Functions (Deno). A pg_cron job POSTs here twice a week
// (see supabase/expirations.sql, "SCHEDULES"); the body is ignored, the work is
// always the same: for every country a user actually lives in, ask upstream what
// is leaving, write it down, forget what is no longer leaving.
//
// Deploy:
//   npx supabase secrets set MOTN_API_KEY=<key> --project-ref <ref>
//   npx supabase functions deploy sync-expirations --no-verify-jwt --project-ref <ref>
//
// --no-verify-jwt because the caller is pg_net with a bearer from Vault, not a
// user JWT. The guard in `serve` still refuses everyone else — this endpoint
// spends metered upstream quota, so an open door is a bill.
//
// Dependency-free for the same reason as send-push: PostgREST is reachable with
// fetch, and a zero-import function has nothing to break on a Deno bump.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AUTH_SECRET = Deno.env.get('RADAR_PUSH_SECRET') || SERVICE_KEY;
const MOTN_KEY = Deno.env.get('MOTN_API_KEY');

const MOTN_BASE = 'https://api.movieofthenight.com/v4';

// Upstream service id -> the app's normalized service name (mirrored from
// src/lib/services.ts SERVICE_CONFIG). Anything not in here is skipped rather
// than stored: user_settings.owned_services can only ever hold these names, so
// a row for an unmapped service could never match anyone — and every service
// included costs upstream pages. Filtering here is also the cheapest quota
// control we have.
//
// `apple` upstream is the whole Apple TV store, rentals included; we only ask
// for its subscription catalogue, which is Apple TV+.
const SERVICE_NAMES: Record<string, string> = {
  netflix: 'Netflix',
  prime: 'Prime Video',
  disney: 'Disney+',
  hbo: 'Max',
  apple: 'Apple TV+',
  hulu: 'Hulu',
  paramount: 'Paramount+',
  peacock: 'Peacock',
  fubo: 'Fubo',
  criterion: 'Criterion Channel',
  mubi: 'Mubi',
  skyshowtime: 'SkyShowtime',
  crunchyroll: 'Crunchyroll',
};

/** Changes come 25 to a page. A country that needs more than this is truncated
 *  rather than allowed to run the monthly quota down in one call. */
const MAX_PAGES = 40;

type MotnService = { id: string };
type MotnChange = {
  showId: string;
  service: { id: string };
  timestamp?: number;
  link?: string;
};
type MotnShow = {
  tmdbId?: string; // "movie/550" | "tv/1396"
  title?: string;
  releaseYear?: number;
  imageSet?: { verticalPoster?: Record<string, string> };
};
type ChangesPage = {
  changes?: MotnChange[];
  shows?: Record<string, MotnShow>;
  hasMore?: boolean;
  nextCursor?: string;
};

type ExpirationRow = {
  country: string;
  service: string;
  service_name: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  expires_on: string;
  title: string;
  poster_url: string | null;
  release_year: number | null;
  link: string | null;
  synced_at: string;
};

async function motn<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${MOTN_BASE}${path}?${new URLSearchParams(params)}`;
  const response = await fetch(url, { headers: { 'X-API-Key': MOTN_KEY! } });
  if (!response.ok) {
    throw new Error(`upstream ${path} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function rest(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`postgrest ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

/** Only sync what someone is actually looking at. A region nobody has selected
 *  is quota spent on an empty audience. */
async function activeCountries(): Promise<string[]> {
  const response = await rest('user_settings?select=watch_provider_country', { method: 'GET' });
  const rows = (await response.json()) as { watch_provider_country: string | null }[];
  const codes = new Set<string>();
  for (const row of rows) {
    const code = row.watch_provider_country?.trim().toUpperCase();
    if (code) codes.add(code);
  }
  // A brand-new project with no users still gets a useful table.
  if (codes.size === 0) codes.add('US');
  return [...codes];
}

/** The subscription catalogues of every service the app knows about in this
 *  country. Rentals are excluded — an Apple rental "expiring" is not a title
 *  leaving a service you pay for, it is a receipt. */
async function catalogsFor(country: string): Promise<string> {
  const detail = await motn<{ services?: MotnService[] }>(`/countries/${country.toLowerCase()}`, {});
  return (detail.services ?? [])
    .map((service) => service.id)
    .filter((id) => id in SERVICE_NAMES)
    .map((id) => `${id}.subscription`)
    .join(',');
}

function parseTmdb(raw: string | undefined): { id: number; type: 'movie' | 'tv' } | null {
  const [type, id] = (raw ?? '').split('/');
  if ((type !== 'movie' && type !== 'tv') || !id) return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? { id: parsed, type } : null;
}

/** Upstream ships a poster in several widths; w360 matches what the app's cards
 *  ask of TMDB, so the two sources look alike side by side.
 *
 *  These are signed CloudFront URLs with an Expires roughly a year out. Storing
 *  a signed URL is normally a trap, but every sync rewrites the column, so a
 *  row is never more than a few days from a fresh signature. */
function posterOf(show: MotnShow): string | null {
  const set = show.imageSet?.verticalPoster;
  return set?.w360 ?? set?.w480 ?? set?.w240 ?? null;
}

async function pullCountry(country: string, showType: 'movie' | 'series', syncedAt: string) {
  const catalogs = await catalogsFor(country);
  if (!catalogs) return { rows: [] as ExpirationRow[], pages: 0, truncated: false };

  const rows: ExpirationRow[] = [];
  let cursor: string | undefined;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const page = await motn<ChangesPage>('/changes', {
      country: country.toLowerCase(),
      change_type: 'expiring',
      item_type: 'show',
      show_type: showType,
      catalogs,
      order_direction: 'asc',
      ...(cursor ? { cursor } : {}),
    });
    pages += 1;

    const shows = page.shows ?? {};
    for (const change of page.changes ?? []) {
      const serviceName = SERVICE_NAMES[change.service.id];
      // Undated changes exist upstream but are useless to a calendar, and the
      // measured PL/US catalogues had none of them anyway.
      if (!serviceName || !change.timestamp) continue;

      const show = shows[change.showId];
      const tmdb = parseTmdb(show?.tmdbId);
      if (!show || !tmdb) continue;

      rows.push({
        country,
        service: change.service.id,
        service_name: serviceName,
        tmdb_id: tmdb.id,
        media_type: tmdb.type,
        expires_on: new Date(change.timestamp * 1000).toISOString().slice(0, 10),
        title: show.title ?? 'Untitled',
        poster_url: posterOf(show),
        release_year: show.releaseYear ?? null,
        link: change.link ?? null,
        synced_at: syncedAt,
      });
    }

    if (!page.hasMore || !page.nextCursor) {
      return { rows, pages, truncated: false };
    }
    cursor = page.nextCursor;
  }

  console.warn(`${country}/${showType}: hit MAX_PAGES, catalogue truncated`);
  return { rows, pages, truncated: true };
}

/** Upsert, then drop whatever this run did not restamp. That deletion is the
 *  only way a cancelled expiry — title renewed, no longer leaving — leaves the
 *  calendar before its old date arrives. */
async function writeCountry(country: string, rows: ExpirationRow[], syncedAt: string) {
  // One title can leave two services on two dates, but the primary key already
  // separates those. Duplicates within a page would not: dedupe so the upsert
  // never sees the same key twice in one payload.
  const unique = new Map<string, ExpirationRow>();
  for (const row of rows) {
    unique.set(`${row.service}|${row.media_type}|${row.tmdb_id}`, row);
  }
  const payload = [...unique.values()];

  for (let i = 0; i < payload.length; i += 500) {
    await rest('streaming_expirations', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload.slice(i, i + 500)),
    });
  }

  await rest(
    `streaming_expirations?country=eq.${encodeURIComponent(country)}&synced_at=lt.${encodeURIComponent(syncedAt)}`,
    { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
  );

  return payload.length;
}

async function sync() {
  const countries = await activeCountries();
  const summary: Record<string, { written: number; pages: number; truncated: boolean }> = {};

  for (const country of countries) {
    // Per-country stamp, taken before its own fetch: a row restamped by this run
    // must never look older than the cutoff that deletes stale ones.
    const syncedAt = new Date().toISOString();
    try {
      const movies = await pullCountry(country, 'movie', syncedAt);
      const series = await pullCountry(country, 'series', syncedAt);
      const written = await writeCountry(country, [...movies.rows, ...series.rows], syncedAt);
      summary[country] = {
        written,
        pages: movies.pages + series.pages,
        truncated: movies.truncated || series.truncated,
      };
    } catch (error) {
      // One country failing (upstream 5xx, quota exhausted) must not cost the
      // others their refresh. Its existing rows are left alone rather than
      // deleted — stale data beats an empty calendar.
      console.error(`sync failed for ${country}`, error);
      summary[country] = { written: -1, pages: 0, truncated: false };
    }
  }

  return summary;
}

Deno.serve(async (request: Request) => {
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${AUTH_SECRET}`) {
    const using = Deno.env.get('RADAR_PUSH_SECRET') ? 'RADAR_PUSH_SECRET' : 'SUPABASE_SERVICE_ROLE_KEY';
    console.error(`Rejected caller: bearer did not match ${using}`);
    return new Response(
      JSON.stringify({ error: 'Unauthorized', compared_against: using, bearer_present: !!auth }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!MOTN_KEY) {
    console.error('MOTN_API_KEY is not set - nothing to sync');
    return new Response(JSON.stringify({ error: 'MOTN_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    return Response.json(await sync());
  } catch (error) {
    console.error('sync-expirations failed', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
