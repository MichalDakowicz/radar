import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
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

export type ProfileUpdate = {
  username: string;
  displayName: string;
  pfp: string; // data URI or empty string to clear
};

// Edits the signed-in user's own profile row (profiles_update RLS: id =
// auth.uid()). username is unique in the schema, so a conflict on another
// user's row is surfaced as a friendly error before the write. Legacy's
// separate usernames/ + userSearchIndex/ side-tables are gone - the rewrite
// queries profiles directly (doc 11), so there's a single row to update.
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, displayName, pfp }: ProfileUpdate) => {
      if (!user) throw new Error('Not signed in');
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) throw new Error('Username is required.');
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) throw new Error('Username may only contain lowercase letters, numbers, and underscores.');

      const { data: taken, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle();
      if (checkError) throw checkError;
      if (taken) throw new Error('Username already taken.');

      const { error } = await supabase
        .from('profiles')
        .update({ username: cleanUsername, display_name: displayName.trim() || null, pfp: pfp.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    },
  });
}
