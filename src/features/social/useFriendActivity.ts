import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { activityVerb, feedKind, isFeedWorthy, type FeedKind } from '@/lib/socialFeed';
import { supabase } from '@/lib/supabase';
import type { ActivityEvent, ActivityType, MediaType } from '@/types/movie';

/** How far back the feed reaches. Pagination is a follow-up, not a 2.3.0 gap. */
const FEED_LIMIT = 60;

/**
 * An activity row with everything a card needs attached. Note it keeps
 * ActivityEvent's `type` (the event kind) — the movie's media type stays on
 * `mediaType`, as it is on ActivityEvent.
 */
export type FeedEvent = ActivityEvent & {
  kind: FeedKind;
  verb: string;
  /** Hydrated from the friend's movies row — activity itself stores no poster. */
  coverUrl: string | null;
  tmdbId: number | null;
  releaseYear: string | null;
  /** The rating on a rating_changed row, so the card can draw stars. */
  rating: number | null;
  inProgress: boolean;
};

type ActivityRow = {
  id: string;
  user_id: string;
  movie_id: string | null;
  movie_title: string | null;
  type: ActivityType;
  details: Record<string, unknown> | null;
  created_at: string;
};

type PosterRow = {
  id: string;
  tmdb_id: number | null;
  type: MediaType;
  cover_url: string | null;
  release_date: string | null;
  in_progress: boolean;
};

async function fetchPosters(movieIds: string[]): Promise<Map<string, PosterRow>> {
  if (movieIds.length === 0) return new Map();
  // Friends' movies rows are readable through movies_visible_read; a title whose
  // owner has since gone private simply drops out and the card renders coverless.
  const { data, error } = await supabase
    .from('movies')
    .select('id, tmdb_id, type, cover_url, release_date, in_progress')
    .in('id', movieIds);
  if (error) throw error;
  return new Map((data as PosterRow[]).map((row) => [row.id, row]));
}

function toFeedEvent(row: ActivityRow, posters: Map<string, PosterRow>): FeedEvent {
  const details = row.details ?? {};
  const poster = row.movie_id ? posters.get(row.movie_id) : undefined;
  const base = {
    id: row.id,
    userId: row.user_id,
    movieId: row.movie_id,
    movieTitle: row.movie_title ?? 'Untitled',
    type: row.type,
    mediaType: (details.mediaType as MediaType | undefined) ?? poster?.type ?? null,
    details,
    createdAt: row.created_at,
  } satisfies ActivityEvent;

  const rating = typeof details.rating === 'number' ? details.rating : null;
  return {
    ...base,
    kind: feedKind(base),
    verb: activityVerb(base),
    coverUrl: poster?.cover_url ?? null,
    tmdbId: poster?.tmdb_id ?? null,
    releaseYear: poster?.release_date?.slice(0, 4) ?? null,
    rating,
    inProgress: poster?.in_progress ?? false,
  };
}

async function fetchFriendActivity(friendIds: string[]): Promise<FeedEvent[]> {
  if (friendIds.length === 0) return [];
  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, movie_id, movie_title, type, details, created_at')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;

  const rows = (data as ActivityRow[]).filter(isFeedWorthy);
  const posters = await fetchPosters([...new Set(rows.map((r) => r.movie_id).filter((id): id is string => !!id))]);
  return rows.map((row) => toFeedEvent(row, posters));
}

/**
 * Your friends' activity, poster-hydrated.
 *
 * New rows are counted, not merged: re-sorting the list under someone mid-read
 * is the thing every feed gets wrong. `pending` drives the "N new updates" pill,
 * and `loadPending` is what actually refetches.
 */
export function useFriendActivity(friendIds: string[]) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);
  // Sorted so a reordered friend list is not a new cache key.
  const key = [...friendIds].sort().join(',');

  const query = useQuery({
    queryKey: ['friendActivity', key],
    queryFn: () => fetchFriendActivity(friendIds),
    enabled: friendIds.length > 0,
  });

  useEffect(() => {
    if (friendIds.length === 0) return;
    const friends = new Set(friendIds);
    // postgres_changes cannot express `user_id in (...)`, and realtime applies
    // the same RLS as a read — so subscribe broadly and drop anything that is
    // not a friend's (which, in practice, is only your own writes).
    const channel = supabase
      .channel(`social-feed:${key}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, (payload) => {
        const row = payload.new as ActivityRow;
        if (!friends.has(row.user_id) || !isFeedWorthy({ type: row.type, details: row.details ?? {} })) return;
        setPending((n) => n + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [key, friendIds]);

  const loadPending = useCallback(() => {
    setPending(0);
    queryClient.invalidateQueries({ queryKey: ['friendActivity', key] });
  }, [queryClient, key]);

  return {
    events: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    pending,
    loadPending,
  };
}
