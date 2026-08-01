import { MessageSquare } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { ActivitySocial } from '@/features/social/useActivitySocial';
import { REACTIONS, type ReactionKind } from '@/lib/socialFeed';

type ReactionRowProps = {
  title: string;
  social: ActivitySocial;
  commentCount: number;
  onToggle: (kind: ReactionKind) => void;
  onComment: () => void;
};

/** Emoji chips plus the comment toggle along the bottom of a feed card. */
export function ReactionRow({ title, social, commentCount, onToggle, onComment }: ReactionRowProps) {
  return (
    <View className="flex-row items-center gap-2">
      {REACTIONS.map(({ kind, emoji, label }) => {
        const mine = social.mine.includes(kind);
        const count = social.counts[kind] ?? 0;
        return (
          <Pressable
            key={kind}
            onPress={() => onToggle(kind)}
            accessibilityRole="button"
            accessibilityState={{ selected: mine }}
            accessibilityLabel={`${mine ? 'Remove' : 'Add'} ${label} reaction on ${title}`}
            className={`h-11 flex-row items-center gap-1.5 rounded-full border px-3 active:scale-95 ${
              mine ? 'border-primary/50 bg-primary/15' : 'border-border bg-card'
            }`}
          >
            <Text className="text-sm">{emoji}</Text>
            <Text className={`text-[12.5px] font-semibold ${mine ? 'text-primary' : 'text-muted-foreground'}`}>
              {count}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onComment}
        accessibilityRole="button"
        accessibilityLabel={`Comment on ${title}`}
        className="ml-auto h-11 flex-row items-center gap-1.5 rounded-full border border-border px-3 active:opacity-70"
      >
        <MessageSquare size={14} color="hsl(0 0% 63.9%)" />
        <Text className="text-[12.5px] font-semibold text-muted-foreground">{commentCount}</Text>
      </Pressable>
    </View>
  );
}
