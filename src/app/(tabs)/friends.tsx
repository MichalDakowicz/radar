import { Inbox, UserPlus, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { FriendCard } from '@/features/friends/FriendCard';
import { FriendRequestItem } from '@/features/friends/FriendRequestItem';
import { UserSearchPanel } from '@/features/friends/UserSearchPanel';
import { useFriends } from '@/hooks/useFriends';

const MUTED = 'hsl(0 0% 45%)';

type Tab = 'list' | 'search';

export default function FriendsScreen() {
  const { friends, requests, loading, error, sendRequest, acceptRequest, rejectRequest, removeFriend } = useFriends();
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>('list');

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const guard = (fn: Promise<unknown>) => fn.catch((e) => show(e instanceof Error ? e.message : 'Something went wrong'));

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <LoadingState label="Loading friends…" />
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load friends'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header />
      <ScrollView contentContainerClassName="gap-6 px-4 pb-12 pt-4" showsVerticalScrollIndicator={false}>
        {/* Segmented control */}
        <View className="flex-row rounded-lg bg-secondary p-1">
          <SegBtn active={tab === 'list'} onPress={() => setTab('list')} icon={<Users size={16} color={tab === 'list' ? '#fff' : MUTED} />}>
            My Friends ({friends.length})
          </SegBtn>
          <SegBtn
            active={tab === 'search'}
            onPress={() => setTab('search')}
            icon={<UserPlus size={16} color={tab === 'search' ? '#fff' : MUTED} />}
          >
            Find Friends
          </SegBtn>
        </View>

        {/* Incoming requests - always visible when present */}
        {requests.length > 0 && (
          <View className="gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <View className="flex-row items-center gap-2">
              <Inbox size={18} color="hsl(217 91% 60%)" />
              <Text className="font-semibold text-foreground">Friend Requests</Text>
              <View className="ml-auto rounded-full bg-primary px-2 py-0.5">
                <Text className="text-xs font-bold text-primary-foreground">{requests.length}</Text>
              </View>
            </View>
            {requests.map((req) => (
              <FriendRequestItem
                key={req.profile.id}
                request={req}
                busy={acceptRequest.isPending || rejectRequest.isPending}
                onAccept={(id) => guard(acceptRequest.mutateAsync(id))}
                onReject={(id) => guard(rejectRequest.mutateAsync(id))}
              />
            ))}
          </View>
        )}

        {tab === 'list' ? (
          friends.length === 0 ? (
            <EmptyState
              icon={<Users size={40} color={MUTED} />}
              title="No friends yet"
              description="Find people to see their watchlist and stats."
            />
          ) : (
            <View className="gap-3">
              {friends.map((profile) => (
                <FriendCard key={profile.id} profile={profile} onRemove={(id) => guard(removeFriend.mutateAsync(id))} />
              ))}
            </View>
          )
        ) : (
          <UserSearchPanel
            friendIds={friendIds}
            onSendRequest={async (id) => {
              try {
                await sendRequest.mutateAsync(id);
                show('Friend request sent');
              } catch (e) {
                show(e instanceof Error ? e.message : 'Failed to send request');
                throw e;
              }
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

function SegBtn({
  active,
  onPress,
  icon,
  children,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-2 rounded-md py-2"
      style={{ backgroundColor: active ? 'hsl(0 0% 27%)' : 'transparent' }}
    >
      {icon}
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-muted-foreground'}`}>{children}</Text>
    </Pressable>
  );
}
