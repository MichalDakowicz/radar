// "Leaving soon" — turning rows of public.streaming_expirations into the thing
// a person actually wants to know: when do I lose the ability to watch this.
//
// The distinction matters and is the whole reason this file is not a sort call.
// A single expiration row says "title X leaves service Y on date D". That is not
// the same as losing access. Two rules follow from it:
//
//   1. A title on two of your services leaves them on two dates. You keep access
//      until the LAST of them, so the access-loss date is the max across the
//      services you own — never the first date the API happens to report.
//   2. A title still carried by a service you own that is NOT expiring is not
//      leaving you at all, however many other services drop it. Library rows
//      know their current providers (Movie.availability, from TMDB), so for
//      anything you track we can check this and stay quiet.
//
// Rule 2 only works where availability is known, which is library titles. The
// discovery feed has expirations and nothing else, so there it is best-effort.
//
// SCOPE. Both rules are about *your* access, so they only apply when the list is
// scoped to services you subscribe to. Unscoped, this is a browse surface for
// the whole region — a film leaving a service you do not have is still worth
// seeing, and is the one moment a subscription is genuinely worth considering.
// So `onlyOwned` picks which question is being asked, and the answers differ:
// scoped, the date is when you lose it; unscoped, it is when it is gone from
// every service that lists it.

import { normalizeAvailability } from '@/lib/services';
import type { MediaType, Movie } from '@/types/movie';

/** One row of public.streaming_expirations, camelCased at the read boundary. */
export type Expiration = {
  serviceName: string;
  tmdbId: number;
  mediaType: MediaType;
  /** `YYYY-MM-DD`, the last day the title is watchable on that service. */
  expiresOn: string;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  link: string | null;
};

/** One title you are about to lose, collapsed across every service involved. */
export type LeavingTitle = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  link: string | null;
  /** Access-loss date: the last day it is on any service you own. */
  expiresOn: string;
  daysLeft: number;
  /** Services dropping it, soonest first. */
  services: string[];
  /** Which of those you subscribe to. Empty means this one needs a sub. */
  ownedServices: string[];
  /** Library row, when this is something you already track. */
  movieId: string | null;
  watched: boolean;
};

const DAY_MS = 86_400_000;

/** Calendar days between two `YYYY-MM-DD` dates. Parsed as UTC midnight on both
 *  sides so a device in any zone counts the same number of sleeps. */
export function daysUntil(date: string, today: string): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / DAY_MS);
}

/** Local calendar date as `YYYY-MM-DD`. Local, not UTC: "leaves today" has to
 *  agree with the date on the user's own wall. */
export function todayKey(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function urgencyLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Last day';
  if (daysLeft === 1) return 'Tomorrow';
  if (daysLeft < 7) return `${daysLeft} days`;
  if (daysLeft < 14) return 'Next week';
  return `${Math.round(daysLeft / 7)} weeks`;
}

/** How long is left, as a badge. Always carries words — the colour is emphasis
 *  on top of the label, never the label itself.
 *
 *  Hex, not the `hsl(...)` design token: these are handed to RN inline styles,
 *  and RN's colour parser rejects the space-separated CSS Color 4 form the
 *  tokens use. It fails silently to a flat grey, which is exactly how a badge
 *  ends up looking like an unlabelled blob. Same reasoning as the note in
 *  components/media/ServiceFilterChips. */
export type Urgency = { label: string; bg: string; fg: string };

export function urgency(daysLeft: number): Urgency {
  if (daysLeft <= 0) return { label: 'Today', bg: '#dc2626', fg: '#ffffff' };
  if (daysLeft === 1) return { label: '1 day', bg: '#ea580c', fg: '#ffffff' };
  if (daysLeft <= 3) return { label: `${daysLeft} days`, bg: '#f97316', fg: '#1c1917' };
  if (daysLeft <= 7) return { label: `${daysLeft} days`, bg: '#eab308', fg: '#1c1917' };
  if (daysLeft <= 13) return { label: `${daysLeft} days`, bg: '#3f3f46', fg: '#e4e4e7' };
  return { label: `${Math.round(daysLeft / 7)} wks`, bg: '#3f3f46', fg: '#e4e4e7' };
}

function keyOf(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}:${tmdbId}`;
}

/**
 * Collapse expiration rows into titles.
 *
 * `owned` is the user's subscribed services. With `onlyOwned` it narrows the
 * list to those and both access rules apply; without it nothing is dropped and
 * `owned` only decides which services get marked as ones you already have.
 */
export function buildLeavingTitles(
  expirations: Expiration[],
  movies: Movie[],
  owned: string[],
  today: string = todayKey(),
  { onlyOwned = false }: { onlyOwned?: boolean } = {},
): LeavingTitle[] {
  const mine = owned.length > 0 ? new Set(owned) : null;
  const scoped = onlyOwned && mine;
  const relevant = scoped ? expirations.filter((e) => mine.has(e.serviceName)) : expirations;

  const byTitle = new Map<string, Expiration[]>();
  for (const row of relevant) {
    const key = keyOf(row.tmdbId, row.mediaType);
    const bucket = byTitle.get(key);
    if (bucket) bucket.push(row);
    else byTitle.set(key, [row]);
  }

  // Library rows indexed the same way, so the join is a lookup rather than a scan.
  const library = new Map<string, Movie>();
  for (const movie of movies) {
    if (movie.tmdbId) library.set(keyOf(movie.tmdbId, movie.type), movie);
  }

  const out: LeavingTitle[] = [];

  for (const [key, rows] of byTitle) {
    const sorted = [...rows].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
    // Rule 1: the last service to drop it is the one that ends your access.
    const last = sorted[sorted.length - 1];
    const movie = library.get(key) ?? null;

    // Rule 2: something you own still carries it, and that copy is not expiring.
    // Scoped only — unscoped this is a browse listing, and "leaves Netflix on
    // the 12th" is true whether or not you personally keep it elsewhere.
    if (movie && scoped) {
      const leaving = new Set(sorted.map((row) => row.serviceName));
      const staying = normalizeAvailability(movie.availability).filter(
        (service) => mine.has(service) && !leaving.has(service),
      );
      if (staying.length > 0) continue;
    }

    out.push({
      tmdbId: last.tmdbId,
      mediaType: last.mediaType,
      title: movie?.title ?? last.title,
      posterUrl: movie?.coverUrl ?? last.posterUrl,
      releaseYear: last.releaseYear,
      link: last.link,
      expiresOn: last.expiresOn,
      daysLeft: daysUntil(last.expiresOn, today),
      services: sorted.map((row) => row.serviceName),
      ownedServices: mine ? sorted.map((row) => row.serviceName).filter((s) => mine.has(s)) : [],
      movieId: movie?.id ?? null,
      watched: movie?.watched ?? false,
    });
  }

  return out.sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.title.localeCompare(b.title));
}

/**
 * The two audiences for the same list. `tracked` is the watchlist alarm — things
 * you meant to watch and are running out of time on. `discover` is the other
 * half of the ask: what is about to go that you never got round to saving.
 *
 * Anything already watched is in neither. Losing access to a film you have seen
 * is not a problem worth a notification.
 */
export function splitLeaving(titles: LeavingTitle[]): {
  tracked: LeavingTitle[];
  discover: LeavingTitle[];
} {
  const tracked: LeavingTitle[] = [];
  const discover: LeavingTitle[] = [];
  for (const title of titles) {
    if (title.watched) continue;
    if (title.movieId) tracked.push(title);
    else discover.push(title);
  }
  return { tracked, discover };
}

/** True when watching this before it goes would mean paying for something new. */
export function needsSubscription(title: LeavingTitle): boolean {
  return title.ownedServices.length === 0;
}

/** Services present in the list, biggest first — the filter row is built from
 *  what is actually leaving in this region, not from a hardcoded roster. Poland
 *  has SkyShowtime and Mubi and no Hulu; a fixed list would be wrong in both
 *  directions. */
export function serviceCounts(titles: LeavingTitle[]): { service: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const service of title.services) counts.set(service, (counts.get(service) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service));
}

export type LeavingFilter = { services?: string[]; mediaType?: MediaType | null };

/** Narrowing applied after the access rules, so it never changes what a date
 *  means — only how much of the list you are looking at. */
export function filterLeaving(titles: LeavingTitle[], { services, mediaType }: LeavingFilter): LeavingTitle[] {
  const wanted = services && services.length > 0 ? new Set(services) : null;
  return titles.filter((title) => {
    if (mediaType && title.mediaType !== mediaType) return false;
    if (wanted && !title.services.some((service) => wanted.has(service))) return false;
    return true;
  });
}

/** Time buckets for the browse grid, in order, empty ones dropped.
 *
 *  Not one section per calendar day: expirations cluster on month-end, so a
 *  day-grouped grid is a run of headers over single ragged posters followed by
 *  one enormous section. Three horizons keep every grid row full while still
 *  saying roughly when the thing goes — the per-title countdown badge carries
 *  the exact timing. Past days are dropped; the prune job keeps a week of
 *  history in the table for debugging, but a list of chances you already missed
 *  is only dispiriting.
 *
 *  Ordered strictly by date inside a bucket. Floating the titles you already
 *  subscribe to reads as a broken sort once every card wears a countdown — the
 *  grid showed 1 day, 4 days, 2 days — and "only what I have" is what the My
 *  services filter is for. */
export type LeavingBucket = { key: string; label: string; titles: LeavingTitle[] };

const HORIZONS: { key: string; label: string; within: number }[] = [
  { key: 'week', label: 'Within a week', within: 7 },
  { key: 'fortnight', label: 'One to two weeks', within: 14 },
  { key: 'later', label: 'Later', within: Infinity },
];

export function groupByHorizon(titles: LeavingTitle[]): LeavingBucket[] {
  const buckets = new Map<string, LeavingTitle[]>();
  for (const title of titles) {
    if (title.daysLeft < 0) continue;
    const horizon = HORIZONS.find((h) => title.daysLeft <= h.within)!;
    const bucket = buckets.get(horizon.key);
    if (bucket) bucket.push(title);
    else buckets.set(horizon.key, [title]);
  }
  return HORIZONS.filter((h) => buckets.has(h.key)).map((h) => ({
    key: h.key,
    label: h.label,
    titles: buckets
      .get(h.key)!
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.title.localeCompare(b.title)),
  }));
}
