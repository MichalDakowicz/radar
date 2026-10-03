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
import { normalizeWatchDates } from '@/lib/watchDates';

type WatchCountSource = {
  type?: string;
  timesWatched?: number;
  watchDates?: unknown;
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
 * fewest times any episode was watched; a film's is the length of its own watch
 * log, which is why a film can now be on the calendar more than once.
 */
export function datedPasses(source: WatchCountSource): number {
  if (source.type === 'tv') return showWatchCount(source);
  return normalizeWatchDates(source.watchDates, source.completedAt).length;
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
 * What the undated count becomes when the dated records gain passes.
 *
 * A new dated pass usually *documents* a watch the row already claimed rather
 * than adding one: a show carrying "watched 5×" with no episode data, walked
 * through once with the tracker, is still five watches - one of them now dated.
 * So a gained pass absorbs an undated one.
 *
 * "Rewatch season" is the exception and skips this: that is the user saying they
 * watched it *again*, which is a sixth watch, not the fifth being written down.
 */
export function absorbUndatedWatches(undated: number, datedBefore: number, datedAfter: number): number {
  const gained = Math.max(0, datedAfter - datedBefore);
  return Math.max(0, undated - gained);
}

/**
 * `timesWatched` after an edit to the dated records alone - a date cleared, a
 * stamp dropped from the episode log, a day backfilled.
 *
 * The total is dated + undated, and only the dated half moved, so the undated
 * half is carried across. Without that, removing a watch turns it into a watch
 * that merely lost its date: still counted, still in your hours, invisible to
 * every calendar - which is the one thing an undated watch is meant to be, on
 * purpose. A gained pass absorbs, for the reason above.
 */
export function retotalWatches(before: WatchCountSource, after: WatchCountSource): number {
  const dated = datedPasses(after);
  return totalWatches(dated, absorbUndatedWatches(undatedWatches(before), datedPasses(before), dated));
}

export type WatchTally = { timesWatched: number; undatedWatches: number };

export type UndatedStep = WatchTally & {
  /** True when the tap added a watch that will be dated (stamped today on save). */
  dated: boolean;
};

/**
 * One tap on the plus or minus of the "watched before, no date" row.
 *
 * The first plus in a sitting is what the row is for: a watch the user only
 * remembers. A second is a different intent - they are still adding watches, and
 * a second one in the same breath is far more likely something just watched than
 * another they have to recall - so it adds a *dated* watch instead: the total
 * rises, the undated count holds, and the save stamps today for the difference
 * (editForm.buildMoviePayload). `undatedAddedThisOpen` counts the plus taps that
 * added an undated watch since the screen opened; a minus gives one back.
 *
 * A series cannot take a dated watch from here - its dated passes are the episode
 * tracker's - so for one every plus stays undated.
 *
 * A film's total is moved by the same amount as the count, which keeps a dated
 * watch already added this sitting (total above dated + undated) instead of
 * resetting it to what the stored log holds.
 */
export function stepUndatedWatches(
  tally: WatchTally,
  delta: 1 | -1,
  opts: { datedPasses: number; derived: boolean; undatedAddedThisOpen: number },
): UndatedStep {
  const total = Math.max(0, tally.timesWatched || 0);
  const undated = Math.max(0, tally.undatedWatches || 0);

  if (delta > 0 && !opts.derived && opts.undatedAddedThisOpen >= 1) {
    return { timesWatched: total + 1, undatedWatches: undated, dated: true };
  }

  const nextUndated = Math.max(0, undated + delta);
  const timesWatched = opts.derived
    ? totalWatches(opts.datedPasses, nextUndated)
    : Math.max(0, total + (nextUndated - undated));
  return { timesWatched, undatedWatches: nextUndated, dated: false };
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
