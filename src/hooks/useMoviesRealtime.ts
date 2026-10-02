import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { dropMovie, moviesQueryKey, refreshMovie } from '@/hooks/moviesCache';
import { supabase } from '@/lib/supabase';

/**
 * The one library subscription for the whole app, mounted from NotificationSync
 * in the root layout. It used to live inside useMovies, which meant one channel
 * per mounted screen - and every one of them refetched the full library for each
 * event, so a metadata sweep over the shelf downloaded it hundreds of times.
 *
 * Each event patches the single row it names. Postgres only puts the primary key
 * in a DELETE's `old` record, which is all that is needed to drop it.
 */
export function useMoviesRealtime() {
  const { user } = useAuth();
  const uid = user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    // Random suffix per the dev-mode double mount note: supabase-js caches
    // channels by name and a re-subscribed one throws on `.on()`.
    const channel = supabase
      .channel(`movies:${uid}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movies', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { id?: string };
          if (!row?.id) {
            queryClient.invalidateQueries({ queryKey: moviesQueryKey(uid) });
          } else if (payload.eventType === 'DELETE') {
            dropMovie(queryClient, uid, row.id);
          } else {
            void refreshMovie(queryClient, uid, row.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);
}
