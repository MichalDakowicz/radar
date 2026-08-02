import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useActivitySocial } from '@/features/social/useActivitySocial';
import { fetchPosters, toFeedEvent, type ActivityRow, type FeedEvent } from '@/features/social/useFriendActivity';
import { useProfile } from '@/hooks/useProfile';
import type { ReactionKind } from '@/lib/socialFeed';
import { supabase } from '@/lib/supabase';

/**
 * One activity event, by id — the feed card given its own page.
 *
 * The feed fetches a friend list and pages through it; this asks for a single
 * row, because a notification knows exactly which event it is about and nothing
 * about which friends you have. Reads through the same activity_visible_read
 * policy, so an event whose owner has since gone private resolves to null rather
 * than erroring, and the screen can say so.
 */
async function fetchActivityEvent(activityId: string): Promise<FeedEvent | null> {
  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, movie_id, movie_title, type, details, created_at')
    .eq('id', activityId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ActivityRow;
  const posters = await fetchPosters(row.movie_id ? [row.movie_id] : []);
  return toFeedEvent(row, posters);
}

/** Everything the activity screen needs, so the screen itself stays composition. */
export function useActivityDetail(activityId?: string) {
  const query = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => fetchActivityEvent(activityId!),
    enabled: !!activityId,
  });

  const event = query.data ?? null;
  const { profile } = useProfile(event?.userId);
  const { social, available, toggleReaction, postComment } = useActivitySocial(event ? [event.id] : []);

  // Open by default, unlike the feed: a page you arrived at from "someone
  // commented" is a page you are probably about to reply on.
  const [composing, setComposing] = useState(true);
  const toggleComposer = useCallback(() => setComposing((open) => !open), []);

  const react = useCallback(
    (kind: ReactionKind) => {
      if (event) toggleReaction.mutate({ activityId: event.id, kind });
    },
    [event, toggleReaction],
  );

  const comment = useCallback(
    (body: string) => {
      if (event) postComment.mutate({ activityId: event.id, body });
    },
    [event, postComment],
  );

  return {
    event,
    who: profile,
    social: event ? social[event.id] : undefined,
    socialEnabled: available,
    composing,
    toggleComposer,
    react,
    comment,
    loading: query.isLoading,
    error: query.error,
    /** Loaded fine and there is no such event to show — deleted, or gone private. */
    missing: !query.isLoading && !query.error && !event,
  };
}
