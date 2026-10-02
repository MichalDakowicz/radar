import type { Movie } from '@/types/movie';

// The library list is cached newest-added first, the order fetchMovies asks for.
// These patch one row into that cache so a single change never costs a refetch
// of the whole library.

/** Replaces the row in place, or slots a new one in where `added_at` puts it. */
export function upsertMovie(list: Movie[], movie: Movie): Movie[] {
  const at = list.findIndex((m) => m.id === movie.id);
  if (at >= 0) {
    const next = list.slice();
    next[at] = movie;
    return next;
  }

  const slot = list.findIndex((m) => m.addedAt < movie.addedAt);
  if (slot < 0) return [...list, movie];
  return [...list.slice(0, slot), movie, ...list.slice(slot)];
}

/** Returns the same array when the id is not in the list, so no subscriber re-renders. */
export function removeMovieById(list: Movie[], id: string): Movie[] {
  return list.some((m) => m.id === id) ? list.filter((m) => m.id !== id) : list;
}
