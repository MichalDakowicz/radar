import type { QuickAddStatus } from '@/features/movies/add/useQuickAdd';
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
  lastWatchedPosition: string;
  notes: string;
  overallRating: number;
  ratings: CategoryRatings;
  seasonRatings: Record<number, SeasonRating>;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  episodesWatched: Record<string, boolean>;
  episodeWatchDates: Record<string, string>;
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
    },
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

/** True once every episode TMDB knows about is ticked off. */
export function episodesComplete(form: EditForm): boolean {
  if (form.type !== 'tv' || form.numberOfEpisodes <= 0) return false;
  const ticked = Object.values(form.episodesWatched ?? {}).filter(Boolean).length;
  return ticked >= form.numberOfEpisodes;
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

  // Only the save that *flips* a title to watched may stamp a completion date.
  // A row that was already watched keeps whatever date it had, including none:
  // dating it now would drop a mark on today in the streak calendar for a save
  // that changed nothing about the watch (ticking Watchlist for a rewatch, say).
  const completedAt = status.watched
    ? (current.completedAt ?? (current.watched ? null : new Date().toISOString()))
    : null;

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
    timesWatched: status.watched ? status.timesWatched || 1 : 0,
    completedAt,
    ratings:
      form.type === 'tv'
        ? { overall: form.overallRating, seasons: form.seasonRatings }
        : { ...form.ratings, overall: form.overallRating },
    numberOfSeasons: form.numberOfSeasons,
    numberOfEpisodes: form.numberOfEpisodes,
    episodesWatched: form.episodesWatched,
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
