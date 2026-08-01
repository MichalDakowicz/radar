import { Inbox, UserPlus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type SocialHeaderActionsProps = {
  /** Pending incoming requests — drives the badge on the inbox. */
  requestCount: number;
  onOpenRequests: () => void;
  onFind: () => void;
};

/**
 * Social's own header controls, handed to the global Header via its `actions`
 * slot. Neither is filled: the header already carries one primary button (Add),
 * and a second one next to it reads as two competing calls to action.
 */
export function SocialHeaderActions({ requestCount, onOpenRequests, onFind }: SocialHeaderActionsProps) {
  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        onPress={onOpenRequests}
        accessibilityRole="button"
        accessibilityLabel={requestCount ? `Friend requests, ${requestCount} pending` : 'Friend requests, none pending'}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
      >
        <Inbox size={21} color="hsl(0 0% 90%)" />
        {requestCount > 0 && (
          <View className="absolute right-1 top-1 min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1">
            <Text className="text-[10px] font-bold text-white">{requestCount}</Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={onFind}
        accessibilityRole="button"
        accessibilityLabel="Find friends"
        className="h-11 w-11 items-center justify-center rounded-full border border-border active:opacity-60"
      >
        <UserPlus size={18} color="hsl(0 0% 90%)" />
      </Pressable>
    </View>
  );
}
