import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { ActivityEvent, ActivityType, MediaType } from '@/types/movie';

type ActivityRow = {
  id: string;
  user_id: string;
  movie_id: string | null;
  movie_title: string;
  type: ActivityType;
  details: Record<string, unknown> | null;
  created_at: string;
};

function normalizeActivity(row: ActivityRow): ActivityEvent {
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
  };
}

async function fetchActivity(userId: string, limit: number): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ActivityRow[]).map(normalizeActivity);
}

// Recent-activity feed for the Stats history rail (legacy useActivity). Own
// data only for now; public activity arrives with the public shelf (Phase 8).
export function useActivity(limit = 20) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['activity', user?.id, limit],
    queryFn: () => fetchActivity(user!.id, limit),
    enabled: !!user,
  });
  return { activities: query.data ?? [], loading: query.isLoading, error: query.error };
}
