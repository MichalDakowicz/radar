import { useLocalSearchParams, useRouter } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { FeedCard } from '@/features/social/FeedCard';
import { NestedHeader } from '@/features/social/NestedHeader';
import { useActivityDetail } from '@/features/social/useActivityDetail';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';

/**
 * One activity event on its own page — where a "your friend finished something"
 * notification lands. The feed shows the same card, but a feed is a list you
 * scroll past: this is the event you were told about, with every comment on it
 * and the composer already open.
 */
export default function ActivityScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const { show } = useToast();
  const { user } = useAuth();
  const navBarSpace = useNavBarSpace();
  const { event, who, social, socialEnabled, composing, toggleComposer, react, comment, loading, error, missing } =
    useActivityDetail(activityId);

  const name = who ? who.displayName || who.username : 'Activity';

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title={event && who ? `${name}'s activity` : 'Activity'} />

      {loading ? (
        <LoadingState label="Loading activity…" />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load this activity'} />
      ) : missing || !event ? (
        <EmptyState
          icon={<BarChart3 size={38} color="hsl(0 0% 35%)" />}
          title="Nothing to see here"
          description="This activity has been removed, or its owner no longer shares their shelf with you."
        />
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="px-4 pt-4"
            contentContainerStyle={{ paddingBottom: navBarSpace }}
            keyboardShouldPersistTaps="handled"
          >
            <FeedCard
              event={event}
              who={who}
              social={social}
              socialEnabled={socialEnabled}
              composing={composing}
              onOpenProfile={() =>
                event.userId === user?.id ? show('That one is you') : router.push(`/friend/${event.userId}`)
              }
              onOpenTitle={() => {
                if (event.tmdbId == null || !event.mediaType) {
                  show(`${event.movieTitle} is not on TMDB, so it has no detail page`);
                  return;
                }
                router.push({
                  pathname: '/movie/[tmdbId]/[type]',
                  params: { tmdbId: String(event.tmdbId), type: event.mediaType },
                });
              }}
              onToggleReaction={react}
              onToggleComposer={toggleComposer}
              onPostComment={comment}
            />
          </ScrollView>
        </ContentShell>
      )}
    </View>
  );
}
