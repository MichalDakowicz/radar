import { useRouter } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { ActivityRail } from '@/features/social/ActivityRail';
import { FeedCard } from '@/features/social/FeedCard';
import { FeedFilterChips } from '@/features/social/FeedFilterChips';
import { NewActivityPill } from '@/features/social/NewActivityPill';
import { WeekDigest } from '@/features/social/WeekDigest';
import { useActivitySocial } from '@/features/social/useActivitySocial';
import type { FeedEvent } from '@/features/social/useFriendActivity';
import { filterCountLabel, freshCountsSince, matchesFeedFilter, weekDigest, type FeedFilter } from '@/lib/socialFeed';
import type { Profile } from '@/types/movie';

type FeedViewProps = {
  me: Profile | null;
  friends: Profile[];
  events: FeedEvent[];
  loading: boolean;
  pending: number;
  loadPending: () => void;
  /** Watermark for "new since your last visit", frozen by the tab screen. */
  since: string | null;
};

/**
 * The activity feed. Your own logs are in it alongside your friends' — it is
 * the same read either way, and it means the rail's "You" chip filters to
 * something instead of sitting there decorative.
 */
export function FeedView({ me, friends, events, loading, pending, loadPending, since }: FeedViewProps) {
  const router = useRouter();
  const { show } = useToast();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [railId, setRailId] = useState<string | null>(null);
  const [composingId, setComposingId] = useState<string | null>(null);

  const profiles = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const profile of [...(me ? [me] : []), ...friends]) map.set(profile.id, profile);
    return map;
  }, [me, friends]);

  const fresh = useMemo(() => freshCountsSince(events, since), [events, since]);
  const digest = useMemo(() => weekDigest(events), [events]);

  const railEntries = useMemo(
    () =>
      [...(me ? [me] : []), ...friends].map((profile) => ({
        profile,
        // Your own logs are never news to you.
        fresh: profile.id === me?.id ? 0 : (fresh[profile.id] ?? 0),
      })),
    [me, friends, fresh],
  );

  const visible = useMemo(
    () => events.filter((e) => (!railId || e.userId === railId) && matchesFeedFilter(e.kind, filter)),
    [events, railId, filter],
  );

  const { social, available, toggleReaction, postComment } = useActivitySocial(visible.map((e) => e.id));

  const openTitle = (tmdbId: number | null, type: string | null, title: string) => {
    if (tmdbId == null || !type) {
      show(`${title} is not on TMDB, so it has no detail page`);
      return;
    }
    router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(tmdbId), type } });
  };

  if (loading) return <LoadingState label="Loading activity…" />;

  const railFiltered = railId && railId !== me?.id ? profiles.get(railId) : null;

  return (
    <View className="flex-1">
      <NewActivityPill count={pending} onPress={loadPending} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8" keyboardShouldPersistTaps="handled">
        <ActivityRail entries={railEntries} selectedId={railId} onSelect={setRailId} />
        <FeedFilterChips value={filter} onChange={setFilter} />

        {!!railFiltered && (
          <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2">
            <Text className="flex-1 text-[12.5px] text-foreground">
              Only <Text className="font-bold">{railFiltered.displayName || railFiltered.username}</Text> ·{' '}
              {filterCountLabel(visible.length)}
            </Text>
            <Pressable
              onPress={() => setRailId(null)}
              accessibilityRole="button"
              accessibilityLabel="Clear friend filter"
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
            >
              <Text className="text-base text-muted-foreground">✕</Text>
            </Pressable>
          </View>
        )}

        {filter === 'all' && !railId && (
          <WeekDigest
            bars={digest.bars}
            total={digest.total}
            leader={digest.leaderId ? (profiles.get(digest.leaderId) ?? null) : null}
            profiles={profiles}
            onCompareLeader={() =>
              digest.leaderId &&
              (digest.leaderId === me?.id
                ? show('That one is you — pick a friend to compare with')
                : router.push(`/friend/${digest.leaderId}/compare`))
            }
          />
        )}

        <View className="gap-2.5 px-4 pb-4 pt-3.5">
          {visible.map((event) => (
            <FeedCard
              key={event.id}
              event={event}
              who={profiles.get(event.userId) ?? null}
              social={social[event.id]}
              socialEnabled={available}
              composing={composingId === event.id}
              onOpenProfile={() =>
                event.userId === me?.id ? show('That one is you') : router.push(`/friend/${event.userId}`)
              }
              onOpenTitle={() => openTitle(event.tmdbId, event.mediaType, event.movieTitle)}
              onToggleReaction={(kind) => toggleReaction.mutate({ activityId: event.id, kind })}
              onToggleComposer={() => setComposingId((id) => (id === event.id ? null : event.id))}
              onPostComment={(body) => {
                setComposingId(null);
                postComment.mutate({ activityId: event.id, body });
              }}
            />
          ))}

          {visible.length === 0 && (
            <EmptyState
              icon={<BarChart3 size={38} color="hsl(0 0% 35%)" />}
              title={events.length === 0 ? 'Nothing logged yet' : 'Nothing here yet'}
              description={
                events.length === 0
                  ? 'Rate or finish something, or add a friend, and it shows up here.'
                  : 'No activity matches this filter.'
              }
              action={
                events.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setRailId(null);
                      setFilter('all');
                    }}
                    accessibilityRole="button"
                    className="h-11 justify-center rounded-full border border-border px-5 active:opacity-70"
                  >
                    <Text className="text-[12.5px] font-semibold text-foreground">Reset filters</Text>
                  </Pressable>
                ) : undefined
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
