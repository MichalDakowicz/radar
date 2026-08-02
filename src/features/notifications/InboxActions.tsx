import { CheckCheck, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type InboxActionsProps = {
  unread: number;
  clearing: boolean;
  onMarkAllRead: () => void;
  onClearAll: () => void;
};

/**
 * The two things you can do to the inbox as a whole. Sits above the list rather
 * than behind a ··· menu: both are one tap from a screen you opened precisely to
 * deal with a pile of rows.
 */
export function InboxActions({ unread, clearing, onMarkAllRead, onClearAll }: InboxActionsProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <View className="flex-row items-center gap-2 px-1">
      <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {unread > 0 ? `${unread} unread` : 'All caught up'}
      </Text>

      {unread > 0 && (
        <Pressable
          onPress={onMarkAllRead}
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
          className="h-9 flex-row items-center gap-1.5 rounded-full border border-border px-3 active:opacity-70"
        >
          <CheckCheck size={14} color="hsl(0 0% 70%)" />
          <Text className="text-[12px] font-semibold text-foreground/80">Mark read</Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        accessibilityLabel="Clear all notifications"
        className="h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-70"
      >
        <Trash2 size={14} color="hsl(0 0% 70%)" />
      </Pressable>

      <ConfirmDialog
        visible={confirming}
        title="Clear the inbox?"
        description="Every notification is removed from this list. Pending friend requests are not affected."
        confirmLabel="Clear"
        destructive
        loading={clearing}
        onConfirm={() => {
          onClearAll();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}
