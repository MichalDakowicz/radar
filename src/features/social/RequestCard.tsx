import { Check, X } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import type { FriendRequest } from '@/hooks/useFriends';
import { relativeTime } from '@/lib/socialFeed';

type RequestCardProps = {
  request: FriendRequest;
  /** "3 friends in common" — computed by the inbox, not fabricated here. */
  context: string;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
};

/**
 * One pending request. Accept and Decline are full-width 44px buttons rather
 * than the 33px icon pair the old inbox used.
 */
export function RequestCard({ request, context, busy, onAccept, onReject }: RequestCardProps) {
  const { profile } = request;
  const name = profile.displayName || profile.username;

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center gap-3">
        <Avatar profile={profile} size={46} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15.5px] font-bold text-foreground">
            {name}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[11.5px] text-muted-foreground">
            @{profile.username} · {relativeTime(request.createdAt)}
          </Text>
        </View>
      </View>

      {!!context && (
        <Text className="rounded-lg bg-secondary/50 px-3 py-2 text-xs leading-[18px] text-foreground/70">
          {context}
        </Text>
      )}

      <View className="flex-row gap-2">
        <Pressable
          onPress={onAccept}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Accept friend request from ${name}`}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-green-500/20 active:opacity-70"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <ActivityIndicator size="small" /> : <Check size={16} color="#86efac" />}
          <Text className="text-[13.5px] font-bold text-green-300">Accept</Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Decline friend request from ${name}`}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border active:opacity-70"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          <X size={16} color="hsl(0 0% 70%)" />
          <Text className="text-[13.5px] font-semibold text-foreground/80">Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}
