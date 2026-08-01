import { useRouter } from 'expo-router';
import { Inbox, UserPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/layout/ContentShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { FeedView } from '@/features/social/FeedView';
import { FindView } from '@/features/social/FindView';
import { FriendsView } from '@/features/social/FriendsView';
import { useFeedWatermark } from '@/features/social/useFeedWatermark';
import { useFriendActivity } from '@/features/social/useFriendActivity';
import { useFriends } from '@/hooks/useFriends';
import { useProfile } from '@/hooks/useProfile';
import { MAX_W } from '@/hooks/useResponsive';
import { freshCountsSince } from '@/lib/socialFeed';
import { withTabReload } from '@/store/tabReload';
import type { Profile } from '@/types/movie';

type Segment = 'activity' | 'friends' | 'find';

export default withTabReload(SocialScreen, 'social');

/**
 * The Social tab: your friends' activity, your friend list, and people search
 * behind one segmented control. The friend shelf, Compare taste, Watch together
 * and the requests inbox are pushed routes instead of inner states, so each has
 * a real back stack and its own URL on web.
 */
function SocialScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const { profile: me } = useProfile(user?.id);
  const { friends, requests, loading, error, sendRequest, removeFriend } = useFriends();
  const [segment, setSegment] = useState<Segment>('activity');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const since = useFeedWatermark();

  // Your own activity is fetched alongside your friends' — one query either way
  // — but the feed keeps it out of the default view. It is only ever shown when
  // you tap yourself in the rail.
  const authorIds = useMemo(
    () => [user?.id, ...friends.map((f) => f.id)].filter((id): id is string => !!id),
    [user?.id, friends],
  );
  const activity = useFriendActivity(authorIds, user?.id);

  const freshIds = useMemo(() => {
    const counts = freshCountsSince(activity.events, since);
    return new Set(Object.keys(counts).filter((id) => id !== user?.id));
  }, [activity.events, since, user?.id]);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const handleSendRequest = async (profile: Profile) => {
    try {
      await sendRequest.mutateAsync(profile.id);
      setSentIds((prev) => new Set(prev).add(profile.id));
      show(`Friend request sent to ${profile.displayName || profile.username}`);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to send request');
    }
  };

  const handleRemove = async (id: string) => {
    const profile = friends.find((f) => f.id === id);
    const name = profile?.displayName || profile?.username || 'friend';
    try {
      await removeFriend.mutateAsync(id);
      show(`Removed ${name} — you can send a new request any time`);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <LoadingState label="Loading social…" />
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load your friends'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-background px-4 pb-2" style={{ paddingTop: insets.top + 10 }}>
        <ContentShell maxWidth={MAX_W.text}>
          <View className="flex-row items-center justify-between gap-2.5">
            <Text className="text-2xl font-bold tracking-tight text-foreground">Social</Text>
            <View className="flex-row gap-1">
              <Pressable
                onPress={() => router.push('/friend-requests')}
                accessibilityRole="button"
                accessibilityLabel={
                  requests.length ? `Friend requests, ${requests.length} pending` : 'Friend requests, none pending'
                }
                className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
              >
                <Inbox size={21} color="hsl(0 0% 90%)" />
                {requests.length > 0 && (
                  <View className="absolute right-1 top-1 min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1">
                    <Text className="text-[10px] font-bold text-white">{requests.length}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => setSegment('find')}
                accessibilityRole="button"
                accessibilityLabel="Find friends"
                className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
              >
                <UserPlus size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </ContentShell>
      </View>

      <View className="px-4 pt-3">
        <ContentShell maxWidth={MAX_W.text}>
          <View className="flex-row gap-0.5 rounded-lg bg-secondary p-1">
            <SegBtn active={segment === 'activity'} onPress={() => setSegment('activity')} dot={activity.pending > 0}>
              Activity
            </SegBtn>
            <SegBtn active={segment === 'friends'} onPress={() => setSegment('friends')}>
              Friends ({friends.length})
            </SegBtn>
            <SegBtn active={segment === 'find'} onPress={() => setSegment('find')}>
              Find
            </SegBtn>
          </View>
        </ContentShell>
      </View>

      <ContentShell fill maxWidth={MAX_W.text}>
        {segment === 'activity' && (
          <FeedView
            me={me}
            friends={friends}
            events={activity.events}
            loading={activity.loading}
            pending={activity.pending}
            loadPending={activity.loadPending}
            since={since}
          />
        )}
        {segment === 'friends' && (
          <FriendsView
            friends={friends}
            events={activity.events}
            freshIds={freshIds}
            removing={removeFriend.isPending}
            onRemove={handleRemove}
            onFind={() => setSegment('find')}
          />
        )}
        {segment === 'find' && <FindView friendIds={friendIds} sentIds={sentIds} onSendRequest={handleSendRequest} />}
      </ContentShell>
    </View>
  );
}

function SegBtn({
  active,
  onPress,
  dot,
  children,
}: {
  active: boolean;
  onPress: () => void;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className="min-h-[44px] flex-1 flex-row items-center justify-center gap-1.5 rounded-md"
      style={{ backgroundColor: active ? 'hsl(0 0% 27%)' : 'transparent' }}
    >
      <Text className={`text-[13.5px] font-medium ${active ? 'text-white' : 'text-muted-foreground'}`}>{children}</Text>
      {dot && <View className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </Pressable>
  );
}
