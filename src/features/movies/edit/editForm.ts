import type { QuickAddStatus } from '@/features/movies/add/useQuickAdd';
import { mergeEpisodeMirror, showWatchCount, watchedEpisodeCount, type EpisodeWatchLog } from '@/lib/episodes';
import { datedPasses, totalWatches, undatedWatches } from '@/lib/watchCounts';
import type { CastMember, MediaType, Movie, NamedRef, Ratings } from '@/types/movie';

export type CategoryRatings = { story: number; acting: number; ending: number; enjoyment: number };
export type SeasonRating = CategoryRatings & { overall: number };

export type EditForm = {
  title: string;
  type: MediaType;
  tmdbId: number | null;
  imdbId: string | null;
  voteAverage: number;
  director: NamedRef[];
  cast: CastMember[];
  genres: NamedRef[];
  releaseDate: string;
  coverUrl: string;
  overview: string;
  runtime: number;
  availability: string[];
  status: QuickAddStatus;
  /**
   * The one date a film's completion carries, or a series' - held on the form so
   * an undated watch can be saved without stamping today (lib/watchCounts).
   */
  completedAt: string | null;
  lastWatchedPosition: string;
  notes: string;
  overallRating: number;
  ratings: CategoryRatings;
  seasonRatings: Record<number, SeasonRating>;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  episodesWatched: Record<string, boolean>;
  episodeWatchDates: EpisodeWatchLog;
};

const EMPTY_CATEGORY: CategoryRatings = { story: 0, acting: 0, ending: 0, enjoyment: 0 };

// Upgrades the legacy flat-number season rating format ({ 1: 4.5 }) to the
// object format ({ 1: { overall: 4.5, story: 0, ... } }) - doc 02 note on
// EditMovie.jsx's `upgradedSeasons`.
function upgradeSeasonRatings(seasons: Ratings['seasons']): Record<number, SeasonRating> {
  const out: Record<number, SeasonRating> = {};
  for (const [key, value] of Object.entries(seasons ?? {})) {
    const num = Number(key);
    if (typeof value === 'number') {
      out[num] = { overall: value, story: 0, acting: 0, ending: 0, enjoyment: 0 };
    } else if (value) {
      out[num] = {
        overall: value.overall ?? 0,
        story: value.story ?? 0,
        acting: value.acting ?? 0,
        ending: value.ending ?? 0,
        enjoyment: value.enjoyment ?? 0,
      };
    }
  }
  return out;
}

export function fromMovie(movie: Movie): EditForm {
  return {
    title: movie.title,
    type: movie.type,
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    voteAverage: movie.voteAverage,
    director: movie.director,
    cast: movie.cast,
    genres: movie.genres,
    releaseDate: movie.releaseDate ?? '',
    coverUrl: movie.coverUrl ?? '',
    overview: movie.overview,
    runtime: movie.runtime,
    availability: movie.availability,
    status: {
      inWatchlist: movie.inWatchlist,
      inProgress: movie.inProgress,
      watched: movie.watched,
      timesWatched: movie.timesWatched,
      undatedWatches: undatedWatches(movie),
    },
    completedAt: movie.completedAt,
    lastWatchedPosition: movie.lastWatchedPosition ?? '',
    notes: movie.notes,
    overallRating: movie.ratings.overall ?? 0,
    ratings: {
      story: movie.ratings.story ?? 0,
      acting: movie.ratings.acting ?? 0,
      ending: movie.ratings.ending ?? 0,
      enjoyment: movie.ratings.enjoyment ?? 0,
    },
    seasonRatings: upgradeSeasonRatings(movie.ratings.seasons),
    numberOfSeasons: movie.numberOfSeasons ?? 0,
    numberOfEpisodes: movie.numberOfEpisodes ?? 0,
    episodesWatched: movie.episodesWatched,
    episodeWatchDates: movie.episodeWatchDates,
  };
}

export type EditSaveResult = { remove: true } | { remove: false; updates: Partial<Movie> };

/** True once every episode TMDB knows about has been watched at least once. */
export function episodesComplete(form: EditForm): boolean {
  if (form.type !== 'tv' || form.numberOfEpisodes <= 0) return false;
  return watchedEpisodeCount(form) >= form.numberOfEpisodes;
}

/**
 * Complete watches this form has dates for: a series' from its episode log, a
 * film's 0 or 1 from `completedAt`.
 */
export function formDatedPasses(form: EditForm): number {
  return form.type === 'tv' ? showWatchCount(form) : form.completedAt ? 1 : 0;
}

/**
 * What `timesWatched` should be saved as: the dated passes plus the watches the
 * user only remembers (lib/watchCounts). A series' dated count is never typed in -
 * it comes from the episode tracker - but an undated watch has no episodes and no
 * days behind it, so it is only ever a number.
 */
/**
 * What the undated count becomes when the episode log gains dated passes.
 *
 * Ticking episodes off usually *documents* a watch the row already claimed rather
 * than adding one: a show carrying "watched 5×" with no episode data, walked
 * through once with the tracker, is still five watches - one of them now dated.
 * So a new dated pass absorbs an undated one.
 *
 * "Rewatch season" is the exception and passes absorb=false: that is the user
 * saying they watched it *again*, which is a sixth watch, not the fifth being
 * written down.
 */
export function absorbUndatedWatches(undated: number, datedBefore: number, datedAfter: number): number {
  const gained = Math.max(0, datedAfter - datedBefore);
  return Math.max(0, undated - gained);
}

export function derivedTimesWatched(form: EditForm, watched: boolean): number {
  if (!watched) return 0;
  const derived = totalWatches(formDatedPasses(form), form.status.undatedWatches ?? 0);
  // A series' total is fully derived - its dated half is the episode tracker's and
  // is never typed. A film's is typed: completedAt holds one date, so the stepper
  // is the only place a second viewing can be recorded at all, and deriving the
  // total from the date would silently throw that watch away (lib/watchCounts).
  const total = form.type === 'tv' ? derived : Math.max(form.status.timesWatched || 0, derived);
  // Watched with nothing behind it: an old row, or the Watched box ticked before
  // anything was logged. One watch is what the tick means.
  return total > 0 ? total : 1;
}

function statusLabel(status: QuickAddStatus): string {
  return status.watched ? 'Completed' : status.inProgress ? 'Watching' : 'Watchlist';
}

/**
 * Pure save-payload builder (doc 03 `buildMoviePayload`, ported from
 * EditMovie.jsx `handleSave`). Movies that are unwatched, not in progress,
 * and unchecked from the watchlist are treated as a removal - the same rule
 * legacy applied only to movies (TV keeps its row even at "no status").
 */
export function buildMoviePayload(form: EditForm, current: Movie): EditSaveResult {
  // A series finished by ticking its last episode is watched, whether or not
  // the status buttons were touched. Without this the row saves as "Watchlist,
  // watched 0 times" and only *looks* finished, because the read boundary
  // re-derives the flag on the way out (lib/movieStatus) - so the count every
  // other surface reads stays at zero.
  const status = episodesComplete(form)
    ? { ...form.status, inWatchlist: false, inProgress: false, watched: true }
    : form.status;

  if (form.type === 'movie' && !status.inWatchlist && !status.inProgress && !status.watched) {
    return { remove: true };
  }

  // The form owns the date now, so "watched, but not today" is expressible: the
  // undated actions leave it null while still raising the count.
  //
  // A save that adds a watch without adding an undated one is a watch that
  // happened now - marking a title watched, or raising its count - and has to land
  // on today or the streak, the calendar and the recap all miss it. Anything else
  // keeps whatever date the row had, including none: dating it now would drop a
  // mark on today for a save that changed nothing about the watch (ticking
  // Watchlist for a rewatch, say), and an undated watch is the explicit claim that
  // no day is known (lib/watchCounts).
  //
  // The prior side is read off the stored row the same way the form reads it, so a
  // row whose count and dates disagree cannot look like a new watch on every save.
  const priorUndated = undatedWatches(current);
  const priorTotal = totalWatches(datedPasses(current), priorUndated);
  const nextTotal = derivedTimesWatched(form, status.watched);
  const addedDatedWatch =
    status.watched && nextTotal > priorTotal && (status.undatedWatches ?? 0) <= priorUndated;
  const completedAt = !status.watched
    ? null
    : addedDatedWatch
      ? new Date().toISOString()
      : (form.completedAt ?? null);

  const updates: Partial<Movie> = {
    title: form.title,
    type: form.type,
    tmdbId: form.tmdbId,
    imdbId: form.imdbId,
    voteAverage: form.voteAverage,
    director: form.director,
    cast: form.cast,
    genres: form.genres,
    releaseDate: form.releaseDate,
    coverUrl: form.coverUrl,
    overview: form.overview,
    runtime: form.runtime,
    availability: form.availability,
    lastWatchedPosition: form.lastWatchedPosition,
    notes: form.notes,
    status: statusLabel(status),
    inWatchlist: status.inWatchlist,
    inProgress: status.inProgress,
    watched: status.watched,
    timesWatched: nextTotal,
    completedAt,
    ratings:
      form.type === 'tv'
        ? { overall: form.overallRating, seasons: form.seasonRatings }
        : { ...form.ratings, overall: form.overallRating },
    numberOfSeasons: form.numberOfSeasons,
    numberOfEpisodes: form.numberOfEpisodes,
    // The log is written with its mirror, always: the friend shelf reads the
    // mirror column straight out of Postgres and would otherwise go stale.
    episodesWatched: mergeEpisodeMirror(form.episodesWatched, form.episodeWatchDates),
    episodeWatchDates: form.episodeWatchDates,
  };

  return { remove: false, updates };
}

export function recalcOverall(ratings: CategoryRatings): number | null {
  const values = Object.values(ratings).filter((v) => v > 0);
  if (values.length === 0) return null;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

export function recalcSeasonsAverage(seasonRatings: Record<number, SeasonRating>): number | null {
  const values = Object.values(seasonRatings)
    .map((s) => s.overall)
    .filter((v) => v > 0);
  if (values.length === 0) return null;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

export const EMPTY_CATEGORY_RATINGS = EMPTY_CATEGORY;
