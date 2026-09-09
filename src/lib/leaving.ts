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
  /** Owned services dropping it, soonest first. */
  services: string[];
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

function keyOf(tmdbId: number, mediaType: MediaType) {
  return `${mediaType}:${tmdbId}`;
}

/**
 * Collapse expiration rows into titles, applying both rules above.
 *
 * `owned` is the user's subscribed services; rows for anything else are dropped
 * before any of this, because a film leaving a service you do not pay for is
 * not news. An empty `owned` means the user never configured their services —
 * treated as "all", so the feature still shows something rather than nothing.
 */
export function buildLeavingTitles(
  expirations: Expiration[],
  movies: Movie[],
  owned: string[],
  today: string = todayKey(),
): LeavingTitle[] {
  const mine = owned.length > 0 ? new Set(owned) : null;
  const relevant = mine ? expirations.filter((e) => mine.has(e.serviceName)) : expirations;

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
    if (movie && mine) {
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

/** Day buckets for the calendar grid, keyed `YYYY-MM-DD`. Past days are dropped:
 *  the prune job keeps a week of history in the table for debugging, but a
 *  calendar of chances you already missed is only dispiriting. */
export function groupByDay(titles: LeavingTitle[]): Map<string, LeavingTitle[]> {
  const days = new Map<string, LeavingTitle[]>();
  for (const title of titles) {
    if (title.daysLeft < 0) continue;
    const bucket = days.get(title.expiresOn);
    if (bucket) bucket.push(title);
    else days.set(title.expiresOn, [title]);
  }
  return days;
}
