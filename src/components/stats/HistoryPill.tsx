import { useRouter } from 'expo-router';
import { Bookmark, CheckCircle2, Edit, Plus, PlayCircle, Star, Trash2 } from 'lucide-react-native';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatRelativeTime } from '@/lib/utils';
import type { ActivityEvent } from '@/types/movie';

// Recent-activity chip (legacy HistoryPill.jsx). Removed items are inert
// (their movie row is gone); everything else taps through to Edit.
type HistoryPillProps = {
  event: ActivityEvent;
};

const ICON_PROPS = { size: 16, color: 'hsl(0 0% 90%)' };

// Returns elements, not component types, so render never picks a component
// dynamically (react-hooks/static-components).
function iconFor(event: ActivityEvent): ReactElement {
  switch (event.type) {
    case 'added':
      return <Plus {...ICON_PROPS} />;
    case 'completed':
      return <CheckCircle2 {...ICON_PROPS} />;
    case 'started_watching':
      return <PlayCircle {...ICON_PROPS} />;
    case 'added_to_watchlist':
      return <Bookmark {...ICON_PROPS} />;
    case 'rating_changed':
      return <Star {...ICON_PROPS} />;
    case 'removed':
      return <Trash2 {...ICON_PROPS} />;
    case 'status_changed': {
      const s = event.details?.newStatus;
      if (s === 'Completed') return <CheckCircle2 {...ICON_PROPS} />;
      if (s === 'Watching') return <PlayCircle {...ICON_PROPS} />;
      if (s === 'Watchlist') return <Bookmark {...ICON_PROPS} />;
      return <Edit {...ICON_PROPS} />;
    }
    default:
      return <Edit {...ICON_PROPS} />;
  }
}

function actionText(event: ActivityEvent): string {
  switch (event.type) {
    case 'added':
      return 'Added to library';
    case 'completed':
      return 'Completed';
    case 'started_watching':
      return 'Started watching';
    case 'added_to_watchlist':
      return 'Added to watchlist';
    case 'rating_changed':
      return `Rated ${event.details?.rating ?? ''}/5`;
    case 'removed':
      return 'Removed from library';
    case 'updated':
      return 'Updated details';
    case 'status_changed':
      return `Changed to ${event.details?.newStatus ?? ''}`;
    default:
      return 'Updated';
  }
}

export function HistoryPill({ event }: HistoryPillProps) {
  const router = useRouter();
  const isRemoved = event.type === 'removed';
  const timeAgo = formatRelativeTime(event.createdAt);

  const body = (
    <>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
        {iconFor(event)}
      </View>
      <View className="justify-center">
        <Text className="mb-0.5 text-sm font-semibold leading-tight text-foreground" numberOfLines={1}>
          {event.movieTitle}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-medium text-muted-foreground">{actionText(event)}</Text>
          {!!timeAgo && (
            <>
              <Text className="text-xs text-muted-foreground/50">•</Text>
              <Text className="text-xs text-muted-foreground/70">{timeAgo}</Text>
            </>
          )}
        </View>
      </View>
    </>
  );

  const className = 'mr-4 flex-row items-center gap-3 rounded-full border border-border bg-secondary/40 py-2 pl-2 pr-6';

  if (isRemoved || !event.movieId) {
    return <View className={`${className} opacity-60`}>{body}</View>;
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/edit/[movieId]', params: { movieId: event.movieId! } })}
      className={className}
    >
      {body}
    </Pressable>
  );
}
