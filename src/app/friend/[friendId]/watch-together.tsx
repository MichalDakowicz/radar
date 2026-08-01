import { useLocalSearchParams, useRouter } from 'expo-router';
import { ListVideo, Lock, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { Avatar } from '@/features/friends/Avatar';
import { NestedHeader } from '@/features/social/NestedHeader';
import { SharedTitleRow } from '@/features/social/SharedTitleRow';
import { useFriendLibraries } from '@/features/social/useFriendLibraries';
import { useTonightPick } from '@/features/social/useTonightPick';
import { useProfile } from '@/hooks/useProfile';
import { MAX_W } from '@/hooks/useResponsive';
import { sharedCountLabel, sharedWatchlist } from '@/lib/sharedWatchlist';
import type { SharedTitle } from '@/lib/sharedWatchlist';

/** The titles on both watchlists, and a coin toss for which one wins tonight. */
export default function WatchTogetherScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const { profile: me } = useProfile(user?.id);
  const { profile, canView, theirs, mine, loading, error } = useFriendLibraries(friendId);

  const shared = useMemo(() => sharedWatchlist(mine, theirs), [mine, theirs]);
  const keys = useMemo(() => shared.map((title) => title.key), [shared]);
  const { chosen, spinning, spin } = useTonightPick(keys);

  const openTitle = (title: SharedTitle) => {
    if (title.tmdbId == null) {
      show(`${title.title} is not on TMDB, so it has no detail page`);
      return;
    }
    router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(title.tmdbId), type: title.type } });
  };

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title="Watch together" />

      {loading ? (
        <LoadingState label="Cross-checking watchlists…" />
      ) : canView === false ? (
        <EmptyState
          icon={<Lock size={40} color="hsl(0 0% 45%)" />}
          title="This watchlist is private"
          description="Only friends can build a shared list."
        />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load watchlists'} />
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-4 px-4 pb-10 pt-4">
            <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3.5">
              <View className="flex-row">
                <View className="z-10 rounded-full border-2 border-card">
                  <Avatar profile={me} size={34} />
                </View>
                <View className="-ml-3 rounded-full border-2 border-card">
                  <Avatar profile={profile} size={34} />
                </View>
              </View>
              <Text className="min-w-0 flex-1 text-[12.5px] leading-[18px] text-muted-foreground">
                {sharedCountLabel(shared.length)}
              </Text>
            </View>

            {shared.length > 0 && (
              <Pressable
                onPress={() => spin((key) => show(`Tonight: ${shared.find((t) => t.key === key)?.title ?? ''}`))}
                disabled={spinning}
                accessibilityRole="button"
                accessibilityLabel="Pick one for tonight"
                className="h-12 flex-row items-center justify-center gap-2 rounded-[10px] bg-primary active:opacity-80"
                style={{ opacity: spinning ? 0.8 : 1 }}
              >
                <Sparkles size={17} color="#fff" />
                <Text className="text-sm font-bold text-primary-foreground">
                  {spinning ? 'Picking…' : 'Pick one for tonight'}
                </Text>
              </Pressable>
            )}

            <View className="gap-2.5">
              {shared.map((title) => (
                <SharedTitleRow
                  key={title.key}
                  title={title}
                  chosen={chosen === title.key && !spinning}
                  onPress={() => openTitle(title)}
                />
              ))}
            </View>

            {shared.length === 0 && (
              <EmptyState
                icon={<ListVideo size={38} color="hsl(0 0% 35%)" />}
                title="No overlap yet"
                description="Nothing is on both watchlists. Add something you have both been meaning to see."
              />
            )}
          </ScrollView>
        </ContentShell>
      )}
    </View>
  );
}
