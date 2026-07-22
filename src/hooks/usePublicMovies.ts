import { useQuery } from '@tanstack/react-query';

import { normalizeMovie, type MovieRow } from '@/lib/normalizeMovie';
import { supabase } from '@/lib/supabase';
import type { ActivityEvent, MediaType } from '@/types/movie';

// can_view_user (schema.sql Phase 8) exposes private.can_view over RPC so the
// UI can distinguish a private shelf from an empty one - the raw RLS filter
// returns 0 rows either way.
export function useCanViewUser(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['canView', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('can_view_user', { p_target: userId! });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!userId,
  });
  return { canView: query.data ?? null, loading: query.isLoading };
}

export function usePublicMovies(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['publicMovies', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', userId!)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data as MovieRow[]).map(normalizeMovie);
    },
    enabled: !!userId,
  });
  return { movies: query.data ?? [], loading: query.isLoading, error: query.error };
}

type ActivityRow = {
  id: string;
  user_id: string;
  movie_id: string | null;
  movie_title: string;
  type: ActivityEvent['type'];
  details: Record<string, unknown> | null;
  created_at: string;
};

export function usePublicActivity(userId: string | undefined, limit = 20) {
  const query = useQuery({
    queryKey: ['publicActivity', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as ActivityRow[]).map((row) => {
        const details = row.details ?? {};
        return {
          id: row.id,
          userId: row.user_id,
          movieId: row.movie_id,
          movieTitle: row.movie_title,
          type: row.type,
          mediaType: (details.mediaType as MediaType | undefined) ?? null,
          details,
          createdAt: row.created_at,
        } satisfies ActivityEvent;
      });
    },
    enabled: !!userId,
  });
  return { activities: query.data ?? [], loading: query.isLoading };
}
