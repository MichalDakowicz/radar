import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/movie';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  pfp: string | null;
  created_at: string;
};

function normalizeProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    pfp: row.pfp,
    createdAt: row.created_at,
  };
}

// profiles is world-readable (schema.sql profiles_read using(true)), so a single
// row fetch works for own + friend + stranger profiles alike. Cached long since
// usernames/pfps rarely change within a session (replaces legacy useUserProfile
// + its hand-rolled Map cache).
export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeProfile(data as ProfileRow) : null;
}

export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  return (data as ProfileRow[]).map(normalizeProfile);
}

export function useProfile(id: string | undefined) {
  const query = useQuery({
    queryKey: ['profile', id],
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  return { profile: query.data ?? null, loading: query.isLoading, error: query.error };
}
