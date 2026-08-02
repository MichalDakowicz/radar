import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  settingsToRow,
  type UserSettings,
  type UserSettingsRow,
} from '@/lib/userSettings';

// Server-canonical settings backed by public.user_settings (schema.sql +
// notifications.sql). Replaces the scattered legacy storage: theme
// (localStorage), watch-provider country + recently-added (Firebase settings/*),
// streak thresholds + privacy (Firebase). user_settings is owner-only
// (settings_owner_all RLS), so this hook only ever reads/writes the signed-in
// user's own row - the public shelf uses defaults.
//
// The row shape and its column mapping live in lib/userSettings so they can be
// tested without a network; this file is the I/O and the cache.

export {
  DEFAULT_SETTINGS,
  type FriendActivityScope,
  type FriendsVisibility,
  type ThemePref,
  type UserSettings,
} from '@/lib/userSettings';

function settingsKey(userId: string | undefined) {
  return ['user-settings', userId] as const;
}

async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  // The auth trigger inserts a default row on signup; a missing row (e.g. a
  // pre-trigger account) falls back to defaults rather than erroring.
  return data ? normalizeSettings(data as UserSettingsRow) : DEFAULT_SETTINGS;
}

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = settingsKey(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSettings(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_settings:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const mutation = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...settingsToRow(patch) }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    // Optimistic: reflect the change immediately, roll back on failure.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UserSettings>(queryKey);
      queryClient.setQueryData<UserSettings>(queryKey, { ...(previous ?? DEFAULT_SETTINGS), ...patch });
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    loading: query.isLoading,
    error: query.error,
    updateSettings: (patch: Partial<UserSettings>) => mutation.mutateAsync(patch),
    saving: mutation.isPending,
  };
}
