import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { dropMovie, moviesQueryKey, refreshMovie } from '@/hooks/moviesCache';
import { normalizeMovie, toMovieRow, type MovieRow } from '@/lib/normalizeMovie';
import { stripUndefined } from '@/lib/stripUndefined';
import { supabase } from '@/lib/supabase';
import type { ActivityType, MediaType, Movie } from '@/types/movie';

// Realtime (useMoviesRealtime) and our own writes both patch single rows into this
// list, so a full re-read is only the catch-up after the app was away - the socket
// is not delivering while it is backgrounded.
const LIBRARY_STALE_MS = 5 * 60 * 1000;

async function fetchMovies(userId: string): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data as MovieRow[]).map(normalizeMovie);
}

async function logActivity(
  userId: string,
  movieId: string | null,
  movieTitle: string,
  type: ActivityType,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.from('activity').insert(
    stripUndefined({
      user_id: userId,
      movie_id: movieId,
      movie_title: movieTitle,
      type,
      details,
    }),
  );
  if (error) console.error('Failed to log activity', error);
}

export function useMovies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = moviesQueryKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMovies(user!.id),
    enabled: !!user,
    staleTime: LIBRARY_STALE_MS,
  });

  const addMovie = async (movieData: Partial<Movie> & { title: string; type: MediaType }) => {
    if (!user) return;

    const row = stripUndefined({
      ...toMovieRow(movieData),
      user_id: user.id,
      title: movieData.title,
      type: movieData.type,
    });
    const { data, error } = await supabase.from('movies').insert(row).select('id').single();
    if (error) throw error;

    await logActivity(user.id, data.id, movieData.title, 'added', {
      mediaType: movieData.type,
      status: movieData.status ?? 'Watchlist',
    });
    void refreshMovie(queryClient, user.id, data.id);
  };

  const updateMovie = async (movieId: string, updates: Partial<Movie>, options: { silent?: boolean } = {}) => {
    if (!user) return;

    const currentMovie = query.data?.find((m) => m.id === movieId);
    const row = stripUndefined(toMovieRow(updates));

    const { error } = await supabase.from('movies').update(row).eq('id', movieId);
    if (error) throw error;

    if (currentMovie && !options.silent) {
      const details = { mediaType: currentMovie.type };
      let logged = false;

      if (updates.watched === true && !currentMovie.watched) {
        await logActivity(user.id, movieId, currentMovie.title, 'completed', {
          ...details,
          timesWatched: updates.timesWatched ?? 1,
        });
        logged = true;
      }

      if (!logged && updates.inProgress === true && !currentMovie.inProgress) {
        await logActivity(user.id, movieId, currentMovie.title, 'started_watching', details);
        logged = true;
      }

      if (!logged && updates.inWatchlist === true && !currentMovie.inWatchlist) {
        await logActivity(user.id, movieId, currentMovie.title, 'added_to_watchlist', details);
        logged = true;
      }

      if (!logged && updates.status && updates.status !== currentMovie.status) {
        await logActivity(user.id, movieId, currentMovie.title, 'status_changed', {
          ...details,
          oldStatus: currentMovie.status,
          newStatus: updates.status,
        });
        logged = true;
      }

      if (
        !logged &&
        updates.ratings?.overall &&
        updates.ratings.overall > 0 &&
        updates.ratings.overall !== currentMovie.ratings?.overall
      ) {
        await logActivity(user.id, movieId, currentMovie.title, 'rating_changed', {
          ...details,
          rating: updates.ratings.overall,
        });
        logged = true;
      }

      if (!logged && Object.keys(updates).length > 0) {
        await logActivity(user.id, movieId, currentMovie.title, 'updated', details);
      }
    }

    void refreshMovie(queryClient, user.id, movieId);
  };

  const removeMovie = async (movieId: string) => {
    if (!user) return;

    const movie = query.data?.find((m) => m.id === movieId);
    const { error } = await supabase.from('movies').delete().eq('id', movieId);
    if (error) throw error;

    if (movie) {
      // movie row is gone, so movie_id must be null or the activity FK rejects the insert
      await logActivity(user.id, null, movie.title, 'removed', { mediaType: movie.type });
    }
    dropMovie(queryClient, user.id, movieId);
  };

  return {
    movies: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    addMovie,
    updateMovie,
    removeMovie,
  };
}
