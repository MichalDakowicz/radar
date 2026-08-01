import { MoreVertical } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import type { Profile } from '@/types/movie';

type FriendListRowProps = {
  profile: Profile;
  /** Second line: "12 in common · logged 1h ago". */
  meta: string;
  fresh: boolean;
  onOpen: () => void;
  onActions: () => void;
};

/** A row in the Friends list: tap to open the shelf, ··· for the action sheet. */
export function FriendListRow({ profile, meta, fresh, onOpen, onActions }: FriendListRowProps) {
  const name = profile.displayName || profile.username;

  return (
    <View className="flex-row items-center gap-1.5 rounded-xl border border-border bg-card py-2.5 pl-3 pr-2">
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${name}'s shelf`}
        className="min-w-0 flex-1 flex-row items-center gap-3 py-0.5 active:opacity-70"
      >
        <View>
          <Avatar profile={profile} size={46} />
          {fresh && (
            <View className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-[2.5px] border-card bg-primary" />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15.5px] font-bold text-foreground">
            {name}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[11.5px] text-muted-foreground">
            {meta}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onActions}
        accessibilityRole="button"
        accessibilityLabel={`Actions for ${name}`}
        className="h-11 w-11 items-center justify-center rounded-lg active:opacity-60"
      >
        <MoreVertical size={18} color="hsl(0 0% 55%)" />
      </Pressable>
    </View>
  );
}
