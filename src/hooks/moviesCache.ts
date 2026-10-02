import type { QueryClient } from '@tanstack/react-query';

import { normalizeMovie, type MovieRow } from '@/lib/normalizeMovie';
import { removeMovieById, upsertMovie } from '@/lib/movieList';
import { supabase } from '@/lib/supabase';
import type { Movie } from '@/types/movie';

// The library list is the heaviest read in the app (every row carries cast,
// episode logs and production companies), so a change to one title patches that
// one row into the cache. Refetching the list on every write - or on every
// realtime echo of a metadata sweep - re-downloaded the whole library each time.

export function moviesQueryKey(userId: string | undefined) {
  return ['movies', userId] as const;
}

/** One title, fetched on its own. */
async function fetchMovieRow(id: string): Promise<Movie | null> {
  const { data, error } = await supabase.from('movies').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeMovie(data as MovieRow) : null;
}

export function dropMovie(queryClient: QueryClient, userId: string, id: string) {
  queryClient.setQueryData<Movie[]>(moviesQueryKey(userId), (list) => (list ? removeMovieById(list, id) : list));
}

const running = new Map<string, Promise<void>>();
const stale = new Set<string>();

/**
 * Re-reads one title into the cached list. Never rejects: if the single read
 * fails the whole list is invalidated instead, which is the old (costly) path
 * but still correct.
 *
 * A call that lands while the same title is already being read marks it stale
 * and reads once more afterwards - the in-flight read may predate that write.
 */
export function refreshMovie(queryClient: QueryClient, userId: string, id: string): Promise<void> {
  const key = `${userId}:${id}`;
  const active = running.get(key);
  if (active) {
    stale.add(key);
    return active;
  }

  const task = fetchMovieRow(id)
    .then((movie) => {
      if (!movie) return dropMovie(queryClient, userId, id);
      queryClient.setQueryData<Movie[]>(moviesQueryKey(userId), (list) => (list ? upsertMovie(list, movie) : list));
    })
    .catch(() => {
      queryClient.invalidateQueries({ queryKey: moviesQueryKey(userId) });
    })
    .finally(() => {
      running.delete(key);
      if (stale.delete(key)) void refreshMovie(queryClient, userId, id);
    });
  running.set(key, task);
  return task;
}
