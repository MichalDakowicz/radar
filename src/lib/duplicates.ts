// Two rows for one title. The library has no unique key on (user, tmdb id,
// type) - an add that raced the cached "already added" check, or an import run
// twice, lands a second row - and once there are two, half your watches live on
// one and half on the other.
//
// Pure: the settings tool decides *what* to write, this decides *what should be
// written*. Manual rows (no tmdbId) are never touched; there is nothing to match
// them on but a title, and two titles that read alike can be different films.

import type { Movie } from '@/types/movie';

export type DuplicateGroup = {
  /** The row that survives, already carrying the merged watch history. */
  keep: Movie;
  /** Fields to write onto it, empty when the keeper already had everything. */
  patch: Partial<Movie>;
  /** The rows to delete once the patch lands. */
  remove: Movie[];
};

function ticked(movie: Movie): number {
  return Object.values(movie.episodesWatched ?? {}).filter(Boolean).length;
}

/**
 * How much of *your* history a row carries. The richest row wins the group, so
 * the copy you actually rated and tracked is the one that stays - the merge
 * below only has to fill its gaps.
 */
function weight(movie: Movie): number {
  return (
    (movie.watched ? 8 : 0) +
    (movie.inProgress ? 4 : 0) +
    (movie.ratings?.overall ? 2 : 0) +
    (movie.notes ? 1 : 0) +
    Math.min(ticked(movie), 999) / 1000 +
    Math.min(movie.timesWatched ?? 0, 99) / 100
  );
}

function earlier(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

function mergePatch(keep: Movie, others: Movie[]): Partial<Movie> {
  const patch: Partial<Movie> = {};
  const all = [keep, ...others];

  const timesWatched = Math.max(...all.map((m) => m.timesWatched ?? 0));
  if (timesWatched !== keep.timesWatched) patch.timesWatched = timesWatched;

  const watched = all.some((m) => m.watched);
  if (watched !== keep.watched) {
    patch.watched = true;
    patch.inWatchlist = false;
    patch.inProgress = false;
    patch.status = 'Completed';
  }

  // The first time you finished it is the date that belongs on the calendar,
  // not whichever copy was saved last.
  const completedAt = all.reduce<string | null>((acc, m) => earlier(acc, m.completedAt), null);
  if (completedAt !== keep.completedAt) patch.completedAt = completedAt;

  if (!keep.ratings?.overall) {
    const rated = others.find((m) => m.ratings?.overall);
    if (rated) patch.ratings = rated.ratings;
  }

  if (!keep.notes) {
    const noted = others.find((m) => m.notes);
    if (noted) patch.notes = noted.notes;
  }

  // Episode ticks are unioned rather than picked: watching seasons 1-2 on one
  // row and 3 on the other is exactly how a duplicate splits a show.
  const episodesWatched = { ...keep.episodesWatched };
  const episodeWatchDates = { ...keep.episodeWatchDates };
  let episodesChanged = false;
  for (const other of others) {
    for (const [key, value] of Object.entries(other.episodesWatched ?? {})) {
      if (value && !episodesWatched[key]) {
        episodesWatched[key] = true;
        episodesChanged = true;
      }
    }
    for (const [key, stamp] of Object.entries(other.episodeWatchDates ?? {})) {
      const merged = earlier(episodeWatchDates[key] ?? null, stamp);
      if (merged && merged !== episodeWatchDates[key]) {
        episodeWatchDates[key] = merged;
        episodesChanged = true;
      }
    }
  }
  if (episodesChanged) {
    patch.episodesWatched = episodesWatched;
    patch.episodeWatchDates = episodeWatchDates;
  }

  return patch;
}

/**
 * Every title held more than once, newest-and-richest row first. A group only
 * forms on an exact TMDB id *and* type match: The Hitcher (1986) and The Hitcher
 * (2007) share a title and nothing else, and remakes must not be merged away.
 */
export function findDuplicates(movies: Movie[]): DuplicateGroup[] {
  const byKey = new Map<string, Movie[]>();

  for (const movie of movies) {
    if (movie.tmdbId == null) continue;
    const key = `${movie.tmdbId}:${movie.type}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(movie);
    else byKey.set(key, [movie]);
  }

  const groups: DuplicateGroup[] = [];
  for (const rows of byKey.values()) {
    if (rows.length < 2) continue;
    // Ties fall back to the older row: it is the one your friends' activity and
    // any shared link already point at.
    const sorted = [...rows].sort(
      (a, b) => weight(b) - weight(a) || Date.parse(a.addedAt || '') - Date.parse(b.addedAt || '') || a.id.localeCompare(b.id),
    );
    const [keep, ...remove] = sorted;
    groups.push({ keep, patch: mergePatch(keep, remove), remove });
  }

  return groups.sort((a, b) => a.keep.title.localeCompare(b.keep.title));
}

/** How many rows would disappear if every group were merged. */
export function duplicateRowCount(groups: DuplicateGroup[]): number {
  return groups.reduce((total, group) => total + group.remove.length, 0);
}
