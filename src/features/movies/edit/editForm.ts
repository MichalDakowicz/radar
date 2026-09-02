import type { QuickAddStatus } from '@/features/movies/add/useQuickAdd';
import { mergeEpisodeMirror, showWatchCount, watchedEpisodeCount, type EpisodeWatchLog } from '@/lib/episodes';
import { absorbUndatedWatches, datedPasses, totalWatches, undatedWatches } from '@/lib/watchCounts';
import { latestWatch, normalizeWatchDates, resizeWatchLog } from '@/lib/watchDates';
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
   * A film's dated watches, oldest first. The stepper types a total and this is
   * where the dated half of it lives, so a second viewing has a day of its own
   * (lib/watchDates). Empty for a series, which dates its passes per episode.
   */
  watchDates: string[];
  /**
   * The latest of those, or a series' completion - held on the form so an undated
   * watch can be saved without stamping today (lib/watchCounts).
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
    watchDates: movie.type === 'tv' ? [] : normalizeWatchDates(movie.watchDates, movie.completedAt),
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
 * film's from its own watch log.
 */
export function formDatedPasses(form: EditForm): number {
  return form.type === 'tv' ? showWatchCount(form) : form.watchDates.length;
}

/**
 * What `timesWatched` should be saved as: the dated passes plus the watches the
 * user only remembers (lib/watchCounts). A series' dated count is never typed in -
 * it comes from the episode tracker - but an undated watch has no episodes and no
 * days behind it, so it is only ever a number.
 */
// The absorb rule moved to lib/watchCounts, where the completion managers reach
// it too. Re-exported because the hook and its tests import it from here.
export { absorbUndatedWatches };

export function derivedTimesWatched(form: EditForm, watched: boolean): number {
  if (!watched) return 0;
  const undated = form.status.undatedWatches ?? 0;
  // A series' total is fully derived: its dated half is the episode tracker's and
  // is never typed. A film's is the other way round - the stepper types the total
  // and the watch log is resized to match it on save, so deriving the total back
  // off the log would leave the stepper unable to go down (lib/watchDates).
  const total =
    form.type === 'tv'
      ? totalWatches(formDatedPasses(form), undated)
      : Math.max(form.status.timesWatched || 0, undated);
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

  // The form owns the dates now, so "watched, but not today" is expressible: the
  // undated actions raise the count without touching the log.
  //
  // A film reconciles the two here. The stepper types a total, the undated row
  // types the part of it with no day behind it, and the difference is how many
  // dated watches the log should hold: one short and the user just watched it
  // again, which happened now; one long and they removed a watch, which takes the
  // newest date with it. Nothing else re-dates anything, so a save that changed no
  // watch leaves every stamp where it was (lib/watchDates).
  const nextTotal = derivedTimesWatched(form, status.watched);
  const undated = Math.min(status.undatedWatches ?? 0, nextTotal);
  const watchDates = status.watched ? resizeWatchLog(form.watchDates, nextTotal - undated, new Date().toISOString()) : [];

  // A series has no log of its own: its dated passes are the episode tracker's,
  // and completedAt is the day it was finished. Same rule as before - stamp today
  // when this save is what finished it, keep whatever was there otherwise.
  const priorUndated = undatedWatches(current);
  const priorTotal = totalWatches(datedPasses(current), priorUndated);
  const finishedNow =
    status.watched && nextTotal > priorTotal && (status.undatedWatches ?? 0) <= priorUndated;
  const completedAt =
    form.type === 'tv'
      ? status.watched
        ? (finishedNow ? new Date().toISOString() : (form.completedAt ?? null))
        : null
      : latestWatch(watchDates);

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
    watchDates,
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
