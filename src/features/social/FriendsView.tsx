import { useRouter } from 'expo-router';
import { Search, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { FriendActionSheet } from '@/features/social/FriendActionSheet';
import { FriendListRow } from '@/features/social/FriendListRow';
import type { FeedEvent } from '@/features/social/useFriendActivity';
import { relativeTime } from '@/lib/socialFeed';
import type { Profile } from '@/types/movie';

type FriendsViewProps = {
  friends: Profile[];
  events: FeedEvent[];
  freshIds: Set<string>;
  removing: boolean;
  onRemove: (id: string) => void;
  onFind: () => void;
};

/** Your friends, searchable, each row a way into their shelf or out of the friendship. */
export function FriendsView({ friends, events, freshIds, removing, onRemove, onFind }: FriendsViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sheetFor, setSheetFor] = useState<Profile | null>(null);
  const [confirmFor, setConfirmFor] = useState<Profile | null>(null);

  // Last time each friend logged anything, straight off the feed the tab has
  // already fetched — no second query for a subtitle.
  const lastActive = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) if (!map.has(event.userId)) map.set(event.userId, event.createdAt);
    return map;
  }, [events]);

  const trimmed = query.trim().toLowerCase();
  const rows = trimmed
    ? friends.filter(
        (f) => (f.displayName ?? '').toLowerCase().includes(trimmed) || f.username.toLowerCase().includes(trimmed),
      )
    : friends;

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-8 pt-4">
        <View className="flex-row items-center gap-2 rounded-lg border border-border bg-secondary px-3">
          <Search size={17} color="hsl(0 0% 63.9%)" />
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your friends"
            placeholderTextColor="hsl(0 0% 63.9%)"
            autoCapitalize="none"
            aria-label="Search your friends"
            className="h-11 flex-1 text-sm text-foreground"
          />
        </View>

        {rows.map((profile) => {
          const last = lastActive.get(profile.id);
          return (
            <FriendListRow
              key={profile.id}
              profile={profile}
              meta={last ? `Logged ${relativeTime(last)}` : 'No activity yet'}
              fresh={freshIds.has(profile.id)}
              onOpen={() => router.push(`/friend/${profile.id}`)}
              onActions={() => setSheetFor(profile)}
            />
          );
        })}

        {rows.length === 0 && (
          <EmptyState
            icon={<Users size={38} color="hsl(0 0% 35%)" />}
            title={trimmed ? `No match for “${query.trim()}”` : 'No friends yet'}
            description={
              trimmed
                ? 'Try a username instead of a display name.'
                : 'Find people to see their shelf, compare taste and build a shared watchlist.'
            }
            action={
              !trimmed ? (
                <Text onPress={onFind} className="mt-1 text-sm font-bold text-primary">
                  Find friends
                </Text>
              ) : undefined
            }
          />
        )}
      </ScrollView>

      <FriendActionSheet
        profile={sheetFor}
        onClose={() => setSheetFor(null)}
        onOpenShelf={() => {
          const id = sheetFor?.id;
          setSheetFor(null);
          if (id) router.push(`/friend/${id}`);
        }}
        onCompare={() => {
          const id = sheetFor?.id;
          setSheetFor(null);
          if (id) router.push(`/friend/${id}/compare`);
        }}
        onWatchTogether={() => {
          const id = sheetFor?.id;
          setSheetFor(null);
          if (id) router.push(`/friend/${id}/watch-together`);
        }}
        onRemove={() => {
          setConfirmFor(sheetFor);
          setSheetFor(null);
        }}
      />

      <ConfirmDialog
        visible={!!confirmFor}
        destructive
        loading={removing}
        title={`Remove ${confirmFor?.displayName || confirmFor?.username}?`}
        description="You will both stop seeing each other's activity, and re-adding needs a new request they have to accept."
        confirmLabel="Remove"
        onCancel={() => setConfirmFor(null)}
        onConfirm={() => {
          const id = confirmFor?.id;
          setConfirmFor(null);
          if (id) onRemove(id);
        }}
      />
    </View>
  );
}
