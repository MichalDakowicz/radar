import { AlertCircle, Check, Search, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/features/friends/Avatar';
import { useUserSearch } from '@/hooks/useUserSearch';
import type { Profile } from '@/types/movie';

type UserSearchPanelProps = {
  friendIds: Set<string>;
  onSendRequest: (id: string) => Promise<void>;
};

function ResultRow({
  profile,
  isFriend,
  sent,
  onAdd,
}: {
  profile: Profile;
  isFriend: boolean;
  sent: boolean;
  onAdd: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const name = profile.displayName || profile.username;

  const handleAdd = async () => {
    setBusy(true);
    try {
      await onAdd();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg border border-border bg-card p-3">
      <View className="flex-1 flex-row items-center gap-3">
        <Avatar profile={profile} size={40} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-foreground">
            {name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            @{profile.username}
          </Text>
        </View>
      </View>

      {isFriend ? (
        <View className="flex-row items-center gap-1 rounded bg-primary/15 px-2 py-1">
          <Check size={12} color="hsl(217 91% 60%)" />
          <Text className="text-xs text-primary">Friend</Text>
        </View>
      ) : sent ? (
        <View className="flex-row items-center gap-1 rounded bg-secondary px-2 py-1">
          <Check size={12} color="hsl(0 0% 63.9%)" />
          <Text className="text-xs text-muted-foreground">Sent</Text>
        </View>
      ) : (
        <Pressable onPress={handleAdd} disabled={busy} className="rounded-md bg-primary/15 p-2 active:opacity-70">
          {busy ? <ActivityIndicator size="small" /> : <UserPlus size={16} color="hsl(217 91% 60%)" />}
        </Pressable>
      )}
    </View>
  );
}

// Find-friends search (username / display name). 400ms debounce; sent requests
// tracked locally so the row flips to "Sent" without a round-trip.
export function UserSearchPanel({ friendIds, onSendRequest }: UserSearchPanelProps) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const { results, loading } = useUserSearch(debounced);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 400);
    return () => clearTimeout(t);
  }, [text]);

  const handleAdd = async (id: string) => {
    try {
      await onSendRequest(id);
      setSentIds((prev) => new Set(prev).add(id));
    } catch {
      // onSendRequest surfaces its own toast; leave the row addable to retry.
    }
  };

  const trimmed = debounced.trim();

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 rounded-full border border-border px-4">
        <Search size={18} color="hsl(0 0% 63.9%)" />
        <SearchInput
          value={text}
          onChangeText={setText}
          placeholder="Search by username or name…"
          placeholderTextColor="hsl(0 0% 63.9%)"
          autoCapitalize="none"
          className="flex-1 py-3 text-foreground"
        />
      </View>

      {loading ? (
        <View className="py-8">
          <ActivityIndicator />
        </View>
      ) : results.length > 0 ? (
        <View>
          {results.map((profile) => (
            <ResultRow
              key={profile.id}
              profile={profile}
              isFriend={friendIds.has(profile.id)}
              sent={sentIds.has(profile.id)}
              onAdd={() => handleAdd(profile.id)}
            />
          ))}
        </View>
      ) : trimmed ? (
        <View className="items-center gap-2 py-8">
          <AlertCircle size={28} color="hsl(0 0% 45%)" />
          <Text className="text-muted-foreground">No matches for “{trimmed}”</Text>
        </View>
      ) : (
        <Text className="py-8 text-center text-sm text-muted-foreground">Enter a username to search.</Text>
      )}
    </View>
  );
}
