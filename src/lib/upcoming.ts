// "Coming soon" selection (doc 06 #1). Any owned title still to be released
// belongs in the carousel — the legacy app capped it at a 6-month window, which
// silently hid next-year releases even though the user is waiting for them.
//
// Boundary is the start of today, not "right now": a title released today is
// parsed as local midnight and would otherwise drop off the carousel before the
// user has had a chance to see it.

import { isInProgress, isInWatchlist } from '@/lib/movieStatus';
import type { Movie } from '@/types/movie';

/** Max titles in the carousel, matching the other library sections. */
export const COMING_SOON_LIMIT = 30;

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Parses a TMDB date ("2027-05-14", or a bare year) to a timestamp; NaN when unusable. */
export function releaseTimestamp(releaseDate?: string | null): number {
  if (!releaseDate) return NaN;
  const trimmed = releaseDate.trim();
  if (!trimmed) return NaN;
  if (/^\d{4}$/.test(trimmed)) return new Date(Number(trimmed), 0, 1).getTime();
  const parsed = new Date(trimmed).getTime();
  return Number.isNaN(parsed) ? NaN : parsed;
}

export function isUpcomingRelease(movie: Movie, now: number): boolean {
  if (!(isInWatchlist(movie) || isInProgress(movie))) return false;
  const release = releaseTimestamp(movie.releaseDate);
  return !Number.isNaN(release) && release >= startOfDay(now);
}

/** Unreleased owned titles, soonest first, capped at COMING_SOON_LIMIT. */
export function selectComingSoon(movies: Movie[], now: number): Movie[] {
  return movies
    .filter((m) => isUpcomingRelease(m, now))
    .sort((a, b) => releaseTimestamp(a.releaseDate) - releaseTimestamp(b.releaseDate))
    .slice(0, COMING_SOON_LIMIT);
}
