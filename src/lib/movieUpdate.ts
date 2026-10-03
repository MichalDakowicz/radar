import { normalizeMovie, toMovieRow, type MovieRow } from './normalizeMovie';
import { stripUndefined } from './stripUndefined';
import type { Movie } from '@/types/movie';

/**
 * What a title will read back as once `updates` has been written to it, so the
 * library can show a change before the round trips that confirm it return.
 *
 * The merge goes through normalizeMovie - the read boundary the real row will
 * pass through - so derived fields (the status flags, the episode mirror, the
 * watch log) already agree with what the refetch is about to say, instead of
 * showing a half-updated title for the length of a network call.
 */
export function applyMovieUpdate(current: Movie, updates: Partial<Movie>): Movie {
  const row = {
    id: current.id,
    user_id: current.userId,
    added_at: current.addedAt,
    updated_at: current.updatedAt,
    ...toMovieRow(current),
    ...stripUndefined(toMovieRow(updates)),
  };
  return normalizeMovie(row as unknown as MovieRow);
}
