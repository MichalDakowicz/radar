import { Pressable, Text, View } from 'react-native';

import { NotificationIcon } from '@/features/notifications/NotificationIcon';
import { relativeTime } from '@/lib/socialFeed';
import type { Profile } from '@/types/movie';
import type { AppNotification } from '@/types/notification';

type NotificationRowProps = {
  notification: AppNotification;
  /** The person who caused it, when the row has one and it has been fetched. */
  actor?: Profile;
  onPress: () => void;
};

/**
 * One inbox row. Unread is carried by a filled card plus a dot rather than by
 * bold text — a list of mostly-unread rows in bold is just a list in bold, and
 * stops distinguishing anything.
 */
export function NotificationRow({ notification, actor, onPress }: NotificationRowProps) {
  const unread = notification.readAt === null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title} ${notification.body}`}
      accessibilityState={{ selected: unread }}
      className={`flex-row items-center gap-3 rounded-xl border px-3 py-3 active:opacity-70 ${
        unread ? 'border-blue-500/25 bg-blue-500/[0.07]' : 'border-border bg-card'
      }`}
    >
      <NotificationIcon notification={notification} actor={actor} />

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[14.5px] font-bold text-foreground">
          {notification.title}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-[12.5px] leading-[17px] text-muted-foreground">
          {notification.body}
        </Text>
      </View>

      <View className="items-end gap-1.5">
        <Text className="text-[11px] text-muted-foreground">{relativeTime(notification.createdAt)}</Text>
        {unread && <View className="h-2 w-2 rounded-full bg-blue-400" />}
      </View>
    </Pressable>
  );
}
