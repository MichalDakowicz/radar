import { useQuery } from '@tanstack/react-query';

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

async function searchProfiles(term: string, selfId: string | undefined): Promise<Profile[]> {
  const q = term.trim();
  if (!q) return [];
  // profiles_read is world-readable; query the table directly (legacy walked a
  // separate userSearchIndex node - dropped per doc 11). ilike on both fields.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);
  if (error) throw error;
  return (data as ProfileRow[])
    .filter((r) => r.id !== selfId)
    .map((r) => ({ id: r.id, username: r.username, displayName: r.display_name, pfp: r.pfp, createdAt: r.created_at }));
}

// Username/display-name search for the "Find friends" panel. Debounce lives in
// the component; this just caches per-term.
export function useUserSearch(term: string) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['userSearch', term.trim(), user?.id],
    queryFn: () => searchProfiles(term, user?.id),
    enabled: term.trim().length > 0,
  });
  return { results: query.data ?? [], loading: query.isFetching, error: query.error };
}
