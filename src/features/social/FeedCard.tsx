import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import { CommentThread } from '@/features/social/CommentThread';
import { PosterThumb } from '@/features/social/PosterThumb';
import { ReactionRow } from '@/features/social/ReactionRow';
import { StarRow } from '@/features/social/StarRow';
import type { ActivitySocial } from '@/features/social/useActivitySocial';
import type { FeedEvent } from '@/features/social/useFriendActivity';
import { relativeTime, type ReactionKind } from '@/lib/socialFeed';
import type { Profile } from '@/types/movie';

type FeedCardProps = {
  event: FeedEvent;
  who: Profile | null;
  /** Absent until the reactions/comments query for this page has landed. */
  social?: ActivitySocial;
  /** False until the reactions/comments schema change has been applied. */
  socialEnabled: boolean;
  composing: boolean;
  onOpenProfile: () => void;
  onOpenTitle: () => void;
  onToggleReaction: (kind: ReactionKind) => void;
  onToggleComposer: () => void;
  onPostComment: (body: string) => void;
};

const EMPTY_SOCIAL: ActivitySocial = { counts: {}, mine: [], comments: [] };

/** One friend, one thing they did, and what anyone has said about it. */
export function FeedCard({
  event,
  who,
  social = EMPTY_SOCIAL,
  socialEnabled,
  composing,
  onOpenProfile,
  onOpenTitle,
  onToggleReaction,
  onToggleComposer,
  onPostComment,
}: FeedCardProps) {
  const name = who ? who.displayName || who.username : 'A friend';
  const subtitle = [event.releaseYear, event.mediaType === 'tv' ? 'Series' : null].filter(Boolean).join(' · ');

  return (
    <View className="gap-2.5 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-start gap-2.5">
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel={`Open ${name}'s shelf`}
          className="active:opacity-70"
        >
          <Avatar profile={who} size={36} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text className="text-[13.5px] leading-[19px] text-foreground">
            <Text className="font-bold">{name}</Text> <Text className="text-muted-foreground">{event.verb}</Text>
          </Text>
          <Text className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(event.createdAt)}</Text>
        </View>
        {event.kind === 'progress' && (
          <View className="flex-row items-center gap-1.5 rounded-full bg-yellow-400/15 px-2 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            <Text className="text-[10px] font-bold tracking-wider text-yellow-200">IN PROGRESS</Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={onOpenTitle}
        accessibilityRole="button"
        accessibilityLabel={`Open ${event.movieTitle}`}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <PosterThumb coverUrl={event.coverUrl} title={event.movieTitle} width={46} />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[15px] font-bold leading-[19px] text-foreground">{event.movieTitle}</Text>
          {!!subtitle && <Text className="text-[11.5px] text-muted-foreground">{subtitle}</Text>}
          {event.rating != null && <StarRow score={event.rating} />}
        </View>
      </Pressable>

      {socialEnabled && (
        <>
          <ReactionRow
            title={event.movieTitle}
            social={social}
            commentCount={social.comments.length}
            onToggle={onToggleReaction}
            onComment={onToggleComposer}
          />
          <CommentThread comments={social.comments} composing={composing} onSubmit={onPostComment} />
        </>
      )}
    </View>
  );
}
