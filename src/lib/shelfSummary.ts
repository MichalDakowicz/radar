// The three numbers and two rails at the top of a friend's shelf.
//
// The scoring rule arrives as a callback so this stays free of the stars
// component (see useFriendLibraries, which passes personalScore).

import type { Movie } from '@/types/movie';

export type ShelfStats = {
  /** Titles they have finished, ever. */
  films: number;
  /** Of those, the ones finished in the current calendar year. */
  thisYear: number;
  /** Mean of every score they have given, or null if they rate nothing. */
  average: number | null;
};

type ScoreFn = (movie: Movie) => number | null;

function loggedAt(movie: Movie): number {
  // completedAt is the honest date, but older rows and bulk imports only carry
  // updatedAt — falling back keeps those titles in the rail instead of sinking
  // them all to the bottom in an arbitrary order.
  const stamp = movie.completedAt || movie.updatedAt || movie.addedAt;
  const parsed = Date.parse(stamp ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function shelfStats(movies: Movie[], score: ScoreFn, now: Date = new Date()): ShelfStats {
  const year = now.getFullYear();
  let films = 0;
  let thisYear = 0;
  let scoreTotal = 0;
  let scored = 0;

  for (const movie of movies) {
    if (movie.watched) {
      films += 1;
      const at = movie.completedAt ? Date.parse(movie.completedAt) : NaN;
      if (!Number.isNaN(at) && new Date(at).getFullYear() === year) thisYear += 1;
    }
    const value = score(movie);
    if (value != null && value > 0) {
      scoreTotal += value;
      scored += 1;
    }
  }

  return {
    films,
    thisYear,
    average: scored === 0 ? null : Math.round((scoreTotal / scored) * 10) / 10,
  };
}

/** Newest finished titles first — the poster rail under the header. */
export function recentlyLogged(movies: Movie[], limit = 12): Movie[] {
  return movies
    .filter((movie) => movie.watched)
    .sort((a, b) => loggedAt(b) - loggedAt(a))
    .slice(0, limit);
}

/** What they are partway through. The honest version of "watching now". */
export function inProgressTitles(movies: Movie[], limit = 4): Movie[] {
  return movies
    .filter((movie) => movie.inProgress)
    .sort((a, b) => loggedAt(b) - loggedAt(a))
    .slice(0, limit);
}
