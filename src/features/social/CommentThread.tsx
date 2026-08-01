import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/features/friends/Avatar';
import type { ActivityComment } from '@/features/social/useActivitySocial';

type CommentThreadProps = {
  comments: ActivityComment[];
  composing: boolean;
  onSubmit: (body: string) => void;
};

/** Posted comments, plus the composer once the comment button is tapped. */
export function CommentThread({ comments, composing, onSubmit }: CommentThreadProps) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSubmit(text);
  };

  if (comments.length === 0 && !composing) return null;

  return (
    <View className="gap-2">
      {comments.length > 0 && (
        <View className="gap-2 border-t border-border pt-2">
          {comments.map((comment) => (
            <View key={comment.id} className="flex-row items-start gap-2">
              <Avatar profile={comment.author} size={22} />
              <Text className="flex-1 text-xs leading-[17px] text-foreground/80">
                <Text className="font-semibold text-foreground">
                  {comment.author?.displayName || comment.author?.username || 'Someone'}
                </Text>{' '}
                {comment.body}
              </Text>
            </View>
          ))}
        </View>
      )}

      {composing && (
        <View className="flex-row items-center gap-2">
          <SearchInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            returnKeyType="send"
            placeholder="Add a comment…"
            placeholderTextColor="hsl(0 0% 45%)"
            aria-label="Add a comment"
            maxLength={500}
            className="h-10 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground"
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            className="h-10 justify-center rounded-lg bg-primary px-3.5 active:opacity-70"
            style={{ opacity: draft.trim() ? 1 : 0.5 }}
          >
            <Text className="text-sm font-bold text-primary-foreground">Post</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
