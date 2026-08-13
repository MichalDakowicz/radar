// Dated watches versus watches you only remember having.
//
// A streak is built from dates: dailyCompletions reads `completedAt`, dailyEpisodes
// reads the episode log (lib/stats). So anything that carries a date moves the
// streak, and there was no way to say "I watched this a while back and never logged
// it" without either lying about the day or leaving the watch out of the library
// entirely. Marking it watched stamped today; rewatching a season stamped today
// ten times over.
//
// So `timesWatched` is the *total*, and the dated records are a subset of it:
//
//   timesWatched = datedPasses + undatedWatches
//
// The difference is the watches with no date attached. They count towards hours and
// towards the number on the card, and they are invisible to every calendar and
// every streak, because there is no day to put them on. That is the whole point.
//
// Pure (doc 10) - the edit form writes the numbers, this decides what they mean.

import { showWatchCount, totalEpisodeWatches } from '@/lib/episodes';

type WatchCountSource = {
  type?: string;
  timesWatched?: number;
  completedAt?: string | null;
  runtime?: number;
  numberOfEpisodes?: number | null;
  numberOfSeasons?: number | null;
  episodesWatched?: Record<string, boolean> | null;
  episodeWatchDates?: Record<string, string[] | string | number> | null;
};

/** Episodes to bill a whole-series pass, guessing a ten-episode season if TMDB is silent. */
function episodeSpan(source: WatchCountSource): number {
  return source.numberOfEpisodes || (source.numberOfSeasons || 1) * 10;
}

/**
 * Complete watches that carry dates. A series' comes from its episode log - the
 * fewest times any episode was watched; a film's is 0 or 1, because `completedAt`
 * holds one date and cannot record an earlier viewing.
 */
export function datedPasses(source: WatchCountSource): number {
  if (source.type === 'tv') return showWatchCount(source);
  return source.completedAt ? 1 : 0;
}

/** Watches with no date on them: the total, less the ones a calendar can show. */
export function undatedWatches(source: WatchCountSource): number {
  return Math.max(0, (source.timesWatched ?? 0) - datedPasses(source));
}

/** What `timesWatched` should be stored as, given the dated records and the rest. */
export function totalWatches(dated: number, undated: number): number {
  return Math.max(0, dated) + Math.max(0, undated);
}

/**
 * Minutes a title has taken, dated and undated alike.
 *
 * A series bills every episode watch its log holds, plus a full pass of episodes
 * for each undated watch. The two can never be summed twice over: a dated pass is
 * already in the log, and `undatedWatches` subtracts exactly those out.
 */
export function watchedMinutes(source: WatchCountSource): number {
  const runtime = source.runtime || 0;
  if (runtime === 0) return 0;

  if (source.type !== 'tv') return runtime * (source.timesWatched ?? 0);

  return runtime * (totalEpisodeWatches(source) + undatedWatches(source) * episodeSpan(source));
}
