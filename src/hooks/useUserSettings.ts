import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

// Server-canonical settings backed by public.user_settings (schema.sql). Replaces
// the scattered legacy storage: theme (localStorage), watch-provider country +
// recently-added (Firebase settings/*), streak thresholds + privacy (Firebase).
// user_settings is owner-only (settings_owner_all RLS), so this hook only ever
// reads/writes the signed-in user's own row - the public shelf uses defaults.

export type ThemePref = 'dark' | 'light' | 'system';
export type FriendsVisibility = 'public' | 'friends' | 'noone';

export type UserSettings = {
  watchProviderCountry: string;
  recentlyAddedDays: number;
  showRecentlyAdded: boolean;
  friendsVisibility: FriendsVisibility;
  streakThreshold: number;
  tvStreakThreshold: number;
  theme: ThemePref;
  ownedServices: string[];
};

type UserSettingsRow = {
  watch_provider_country: string;
  recently_added_days: number;
  show_recently_added: boolean;
  friends_visibility: FriendsVisibility;
  streak_threshold: number;
  tv_streak_threshold: number;
  theme: string | null;
  owned_services: string[] | null;
};

export const DEFAULT_SETTINGS: UserSettings = {
  watchProviderCountry: 'US',
  recentlyAddedDays: 30,
  showRecentlyAdded: true,
  friendsVisibility: 'friends',
  streakThreshold: 2,
  tvStreakThreshold: 5,
  theme: 'dark',
  ownedServices: [],
};

function normalize(row: UserSettingsRow): UserSettings {
  return {
    watchProviderCountry: row.watch_provider_country,
    recentlyAddedDays: row.recently_added_days,
    showRecentlyAdded: row.show_recently_added,
    friendsVisibility: row.friends_visibility,
    streakThreshold: row.streak_threshold,
    tvStreakThreshold: row.tv_streak_threshold,
    theme: row.theme === 'light' || row.theme === 'system' ? row.theme : 'dark',
    // Null until the owned_services column migration has been applied, so the
    // client tolerates a row that predates it rather than crashing the filter.
    ownedServices: Array.isArray(row.owned_services) ? row.owned_services : [],
  };
}

const TO_COLUMN: Record<keyof UserSettings, keyof UserSettingsRow> = {
  watchProviderCountry: 'watch_provider_country',
  recentlyAddedDays: 'recently_added_days',
  showRecentlyAdded: 'show_recently_added',
  friendsVisibility: 'friends_visibility',
  streakThreshold: 'streak_threshold',
  tvStreakThreshold: 'tv_streak_threshold',
  theme: 'theme',
  ownedServices: 'owned_services',
};

function toRow(patch: Partial<UserSettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = TO_COLUMN[key as keyof UserSettings];
    if (column) row[column] = value;
  }
  return row;
}

function settingsKey(userId: string | undefined) {
  return ['user-settings', userId] as const;
}

async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  // The auth trigger inserts a default row on signup; a missing row (e.g. a
  // pre-trigger account) falls back to defaults rather than erroring.
  return data ? normalize(data as UserSettingsRow) : DEFAULT_SETTINGS;
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
        .upsert({ user_id: user.id, ...toRow(patch) }, { onConflict: 'user_id' });
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
