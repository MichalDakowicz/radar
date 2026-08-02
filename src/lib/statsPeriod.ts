import type { Movie } from '@/types/movie';

// Time-period scoping for the Stats screen. Stats used to be all-time only; the
// period picker narrows the library to what you actually *watched* inside a
// window, rather than filtering the library by when a title was added.
//
// Pure by design (doc 10): the screen picks an id, this turns it into a date
// bound and a rewritten movie list, and computeStats runs unchanged on top.

export type StatsPeriodId = 'all' | '30d' | '90d' | 'year';

export const STATS_PERIODS: { id: StatsPeriodId; label: string; short: string }[] = [
  { id: 'all', label: 'All time', short: 'All time' },
  { id: '30d', label: 'Last 30 days', short: '30 days' },
  { id: '90d', label: 'Last 90 days', short: '90 days' },
  { id: 'year', label: 'This year', short: 'This year' },
];

export function periodShortLabel(id: StatsPeriodId): string {
  return STATS_PERIODS.find((p) => p.id === id)?.short ?? 'All time';
}

/** Inclusive lower bound at 00:00 local, or null for "all time". */
export function periodStart(id: StatsPeriodId, now: Date = new Date()): Date | null {
  if (id === 'all') return null;
  if (id === 'year') return new Date(now.getFullYear(), 0, 1);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  // Inclusive of today, so "last 30 days" is today plus the 29 before it.
  start.setDate(start.getDate() - (id === '30d' ? 29 : 89));
  return start;
}

function isAfter(timestamp: string | null | undefined, from: number): boolean {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && value >= from;
}

/**
 * The library as it looked *inside* the window. Titles with no watch activity in
 * it drop out entirely; the ones that stay have their watch data trimmed so
 * runtime, streaks and calendars only count what happened in the period.
 *
 * - Movies keep their runtime once. `completedAt` only records the latest
 *   completion, so earlier rewatches cannot be placed in a window and are not
 *   counted in one.
 * - Shows keep the episodes whose watch date lands in the window. Full-series
 *   rewatches (`timesWatched`) carry no dates at all, so they are dropped too.
 */
export function scopeMoviesToPeriod(movies: Movie[], start: Date | null): Movie[] {
  if (!start) return movies;
  const from = start.getTime();
  const scoped: Movie[] = [];

  for (const movie of movies) {
    const completedInWindow = isAfter(movie.completedAt, from);

    if (movie.type !== 'tv') {
      if (!completedInWindow) continue;
      scoped.push({ ...movie, timesWatched: 1 });
      continue;
    }

    const episodeWatchDates: Record<string, string> = {};
    for (const [key, timestamp] of Object.entries(movie.episodeWatchDates || {})) {
      if (isAfter(timestamp, from)) episodeWatchDates[key] = timestamp;
    }
    if (Object.keys(episodeWatchDates).length === 0 && !completedInWindow) continue;

    const episodesWatched: Record<string, boolean> = {};
    for (const key of Object.keys(episodeWatchDates)) {
      if (movie.episodesWatched?.[key]) episodesWatched[key] = true;
    }

    scoped.push({
      ...movie,
      episodeWatchDates,
      episodesWatched,
      timesWatched: 0,
      completedAt: completedInWindow ? movie.completedAt : null,
      watched: completedInWindow ? movie.watched : false,
    });
  }

  return scoped;
}
