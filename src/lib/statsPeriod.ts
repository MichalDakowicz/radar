import { episodesWatchedMirror, normalizeEpisodeWatchDates } from '@/lib/episodes';
import { latestWatch, normalizeWatchDates } from '@/lib/watchDates';
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

function isInside(timestamp: string | null | undefined, from: number, until: number): boolean {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && value >= from && value < until;
}

/**
 * The library as it looked *inside* the window. Titles with no watch activity in
 * it drop out entirely; the ones that stay have their watch data trimmed so
 * runtime, streaks and calendars only count what happened in the period.
 *
 * - Films keep the watches their log places inside the window, so a rewatch in
 *   June and another in July count once each, in their own months.
 * - Shows keep the *stamps* that land in the window, not the episodes: an
 *   episode watched in June and again in July belongs to July's numbers once.
 *   `timesWatched` is derived from the whole log, so it is dropped here.
 */
export function scopeMoviesToPeriod(movies: Movie[], start: Date | null, end: Date | null = null): Movie[] {
  if (!start && !end) return movies;
  const from = start ? start.getTime() : -Infinity;
  // Exclusive: a period's `end` is the first instant of the next one, so a title
  // finished at 00:00 on 1 August belongs to August, not to July.
  const until = end ? end.getTime() : Infinity;
  const scoped: Movie[] = [];

  for (const movie of movies) {
    const completedInWindow = isInside(movie.completedAt, from, until);

    if (movie.type !== 'tv') {
      const kept = normalizeWatchDates(movie.watchDates, movie.completedAt).filter((stamp) =>
        isInside(stamp, from, until),
      );
      if (kept.length === 0) continue;
      // The count is what happened in the window, and completedAt follows the log
      // as it always does - the latest watch still inside it.
      scoped.push({ ...movie, watchDates: kept, timesWatched: kept.length, completedAt: latestWatch(kept) });
      continue;
    }

    const episodeWatchDates: Record<string, string[]> = {};
    for (const [key, stamps] of Object.entries(normalizeEpisodeWatchDates(movie.episodeWatchDates))) {
      const kept = stamps.filter((stamp) => isInside(stamp, from, until));
      if (kept.length > 0) episodeWatchDates[key] = kept;
    }
    if (Object.keys(episodeWatchDates).length === 0 && !completedInWindow) continue;

    scoped.push({
      ...movie,
      episodeWatchDates,
      episodesWatched: episodesWatchedMirror(episodeWatchDates),
      timesWatched: 0,
      completedAt: completedInWindow ? movie.completedAt : null,
      watched: completedInWindow ? movie.watched : false,
    });
  }

  return scoped;
}
