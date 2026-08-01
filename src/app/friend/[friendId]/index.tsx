import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { personalScore } from '@/components/media/RatingStars';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { FriendActionSheet } from '@/features/social/FriendActionSheet';
import { NestedHeader } from '@/features/social/NestedHeader';
import { ShelfHeader } from '@/features/social/ShelfHeader';
import { ShelfSections } from '@/features/social/ShelfSections';
import { useFriendLibraries } from '@/features/social/useFriendLibraries';
import { useFriends } from '@/hooks/useFriends';
import { MAX_W } from '@/hooks/useResponsive';
import { inProgressTitles, recentlyLogged, shelfStats } from '@/lib/shelfSummary';
import { sharedTasteTags } from '@/lib/tasteTags';
import type { Movie } from '@/types/movie';

/** A friend's shelf: who they are, what they are on, and what you have in common. */
export default function FriendShelfScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const { show } = useToast();
  const { removeFriend } = useFriends();
  const { profile, canView, theirs, mine, loading, error } = useFriendLibraries(friendId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const stats = useMemo(() => shelfStats(theirs, (m) => personalScore(m.ratings)), [theirs]);
  const recent = useMemo(() => recentlyLogged(theirs), [theirs]);
  const inProgress = useMemo(() => inProgressTitles(theirs), [theirs]);
  const tags = useMemo(() => sharedTasteTags(mine, theirs), [mine, theirs]);

  const name = profile?.displayName || profile?.username || 'Shelf';

  const openTitle = (movie: Movie) => {
    if (movie.tmdbId == null) {
      show(`${movie.title} is not on TMDB, so it has no detail page`);
      return;
    }
    router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(movie.tmdbId), type: movie.type } });
  };

  const handleRemove = async () => {
    setConfirming(false);
    try {
      await removeFriend.mutateAsync(friendId);
      show(`Removed ${name} — you can send a new request any time`);
      router.back();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to remove friend');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title={name} onMore={profile ? () => setSheetOpen(true) : undefined} />

      {loading ? (
        <LoadingState label="Loading shelf…" />
      ) : canView === false ? (
        <EmptyState
          icon={<Lock size={40} color="hsl(0 0% 45%)" />}
          title="This shelf is private"
          description="Only friends can see this collection."
        />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load shelf'} />
      ) : !profile ? (
        <EmptyState title="No such person" description="This account no longer exists." />
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ShelfHeader
              profile={profile}
              stats={stats}
              backdropUrl={recent[0]?.coverUrl ?? null}
              onCompare={() => router.push(`/friend/${friendId}/compare`)}
              onWatchTogether={() => router.push(`/friend/${friendId}/watch-together`)}
            />
            <ShelfSections
              inProgress={inProgress}
              recent={recent}
              tags={tags}
              onOpenTitle={openTitle}
              onOpenCollection={() => router.push(`/u/${friendId}`)}
            />
          </ScrollView>
        </ContentShell>
      )}

      <FriendActionSheet
        profile={sheetOpen ? profile : null}
        onClose={() => setSheetOpen(false)}
        onOpenShelf={() => {
          setSheetOpen(false);
          router.push(`/u/${friendId}`);
        }}
        onCompare={() => {
          setSheetOpen(false);
          router.push(`/friend/${friendId}/compare`);
        }}
        onWatchTogether={() => {
          setSheetOpen(false);
          router.push(`/friend/${friendId}/watch-together`);
        }}
        onRemove={() => {
          setSheetOpen(false);
          setConfirming(true);
        }}
      />

      <ConfirmDialog
        visible={confirming}
        destructive
        loading={removeFriend.isPending}
        title={`Remove ${name}?`}
        description="You will both stop seeing each other's activity, and re-adding needs a new request they have to accept."
        confirmLabel="Remove"
        onCancel={() => setConfirming(false)}
        onConfirm={handleRemove}
      />
    </View>
  );
}
