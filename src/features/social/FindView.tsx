import { Check, Search, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/features/friends/Avatar';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useUserSearch } from '@/hooks/useUserSearch';
import type { Profile } from '@/types/movie';

type FindViewProps = {
  friendIds: Set<string>;
  /** Ids you already have an outbound request to, so the row can read "Requested". */
  sentIds: Set<string>;
  onSendRequest: (profile: Profile) => void;
};

const DEBOUNCE_MS = 400;

/** Search by username or display name and send a request. */
export function FindView({ friendIds, sentIds, onSendRequest }: FindViewProps) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const { results, loading } = useUserSearch(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const trimmed = debounced.trim();
  const navBarSpace = useNavBarSpace();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="gap-3.5 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: navBarSpace }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center gap-2 rounded-lg border border-border bg-secondary px-3">
        <Search size={17} color="hsl(0 0% 63.9%)" />
        <SearchInput
          value={text}
          onChangeText={setText}
          placeholder="Search by name or username"
          placeholderTextColor="hsl(0 0% 63.9%)"
          autoCapitalize="none"
          aria-label="Search people"
          className="h-11 flex-1 text-sm text-foreground"
        />
      </View>

      {loading && <ActivityIndicator className="py-8" />}

      {!loading && results.length > 0 && (
        <>
          <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Results</Text>
          <View className="gap-2.5">
            {results.map((profile) => (
              <PersonRow
                key={profile.id}
                profile={profile}
                isFriend={friendIds.has(profile.id)}
                sent={sentIds.has(profile.id)}
                onAdd={() => onSendRequest(profile)}
              />
            ))}
          </View>
        </>
      )}

      {!loading && trimmed.length > 0 && results.length === 0 && (
        <EmptyState
          icon={<Search size={38} color="hsl(0 0% 35%)" />}
          title={`No one matches “${trimmed}”`}
          description="Usernames are exact — try the whole one."
        />
      )}

      {!loading && trimmed.length === 0 && (
        <EmptyState
          icon={<UserPlus size={38} color="hsl(0 0% 35%)" />}
          title="Find people to follow along with"
          description="Search a username or display name to send a friend request."
        />
      )}
    </ScrollView>
  );
}

function PersonRow({
  profile,
  isFriend,
  sent,
  onAdd,
}: {
  profile: Profile;
  isFriend: boolean;
  sent: boolean;
  onAdd: () => void;
}) {
  const name = profile.displayName || profile.username;
  const settled = isFriend || sent;

  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Avatar profile={profile} size={44} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[14.5px] font-bold text-foreground">
          {name}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-[11.5px] text-muted-foreground">
          @{profile.username}
        </Text>
      </View>

      <Pressable
        onPress={onAdd}
        disabled={settled}
        accessibilityRole="button"
        accessibilityState={{ disabled: settled }}
        accessibilityLabel={
          isFriend ? `${name} is already your friend` : sent ? `Request already sent to ${name}` : `Send friend request to ${name}`
        }
        className={`h-10 flex-row items-center gap-1.5 rounded-full px-3.5 ${
          settled ? 'border border-border bg-secondary' : 'bg-primary active:opacity-80'
        }`}
      >
        {settled && <Check size={13} color="hsl(0 0% 55%)" />}
        <Text className={`text-[12.5px] font-bold ${settled ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
          {isFriend ? 'Friend' : sent ? 'Requested' : 'Add'}
        </Text>
      </Pressable>
    </View>
  );
}
