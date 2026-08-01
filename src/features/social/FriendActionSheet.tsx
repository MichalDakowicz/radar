import { ArrowLeftRight, LibraryBig, ListVideo, UserMinus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/features/friends/Avatar';
import type { Profile } from '@/types/movie';

type FriendActionSheetProps = {
  profile: Profile | null;
  onClose: () => void;
  onOpenShelf: () => void;
  onCompare: () => void;
  onWatchTogether: () => void;
  onRemove: () => void;
};

/**
 * Per-friend actions. "Remove friend" only opens the confirm dialog — the
 * destructive write never fires straight off a sheet row.
 */
export function FriendActionSheet({
  profile,
  onClose,
  onOpenShelf,
  onCompare,
  onWatchTogether,
  onRemove,
}: FriendActionSheetProps) {
  const insets = useSafeAreaInsets();
  if (!profile) return null;
  const name = profile.displayName || profile.username;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        {/* Backdrop is a sibling, not a parent: a Pressable wrapping the panel
            would swallow taps meant for the rows inside it. */}
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          className="bg-black/60"
        />
        <View
          className="rounded-t-[18px] border-t border-border bg-card px-3 pt-2.5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mx-auto mb-3 mt-1 h-1 w-9 rounded-full bg-secondary" />

          <View className="flex-row items-center gap-3 px-1.5 pb-3">
            <Avatar profile={profile} size={38} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-[14.5px] font-bold text-foreground">
                {name}
              </Text>
              <Text numberOfLines={1} className="text-[11.5px] text-muted-foreground">
                @{profile.username}
              </Text>
            </View>
          </View>

          <SheetAction icon={<LibraryBig size={19} color="hsl(0 0% 92%)" />} label="Open shelf" onPress={onOpenShelf} />
          <SheetAction
            icon={<ArrowLeftRight size={19} color="hsl(0 0% 92%)" />}
            label="Compare taste"
            onPress={onCompare}
          />
          <SheetAction
            icon={<ListVideo size={19} color="hsl(0 0% 92%)" />}
            label="Watch together"
            onPress={onWatchTogether}
          />
          <SheetAction
            icon={<UserMinus size={19} color="#f87171" />}
            label="Remove friend"
            onPress={onRemove}
            destructive
          />
        </View>
      </View>
    </Modal>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-[50px] flex-row items-center gap-3 rounded-lg px-2 active:opacity-60"
    >
      {icon}
      <Text className={`text-[14.5px] ${destructive ? 'text-red-400' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  );
}
