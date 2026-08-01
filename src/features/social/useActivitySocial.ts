import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchProfiles } from '@/hooks/useProfile';
import type { ReactionKind } from '@/lib/socialFeed';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/movie';

export type ActivityComment = {
  id: string;
  activityId: string;
  userId: string;
  body: string;
  createdAt: string;
  author: Profile | null;
};

export type ActivitySocial = {
  /** Total reactions per emoji, everyone included. */
  counts: Partial<Record<ReactionKind, number>>;
  /** Which of them you have left, so the chip can render lit. */
  mine: ReactionKind[];
  comments: ActivityComment[];
};

export type SocialMap = Record<string, ActivitySocial>;

/**
 * Postgres/PostgREST codes for "that table isn't there". Reactions and comments
 * ship as a schema change the owner applies by hand (supabase/schema.sql), so
 * an app build can legitimately reach a database that predates them. That is a
 * missing capability, not an error to shout about — the feed hides the controls
 * and everything else keeps working.
 */
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST106']);

function isMissingTable(error: { code?: string } | null): boolean {
  return !!error?.code && MISSING_TABLE_CODES.has(error.code);
}

type ReactionRow = { activity_id: string; user_id: string; kind: ReactionKind };
type CommentRow = { id: string; activity_id: string; user_id: string; body: string; created_at: string };

type SocialResult = { map: SocialMap; available: boolean };

const EMPTY: SocialResult = { map: {}, available: false };

function blank(): ActivitySocial {
  return { counts: {}, mine: [], comments: [] };
}

async function fetchSocial(activityIds: string[], viewerId: string): Promise<SocialResult> {
  if (activityIds.length === 0) return { map: {}, available: true };

  const [reactions, comments] = await Promise.all([
    supabase.from('activity_reactions').select('activity_id, user_id, kind').in('activity_id', activityIds),
    supabase
      .from('activity_comments')
      .select('id, activity_id, user_id, body, created_at')
      .in('activity_id', activityIds)
      .order('created_at', { ascending: true }),
  ]);

  if (isMissingTable(reactions.error) || isMissingTable(comments.error)) return EMPTY;
  if (reactions.error) throw reactions.error;
  if (comments.error) throw comments.error;

  const map: SocialMap = {};
  const entry = (id: string) => (map[id] ??= blank());

  for (const row of reactions.data as ReactionRow[]) {
    const target = entry(row.activity_id);
    target.counts[row.kind] = (target.counts[row.kind] ?? 0) + 1;
    if (row.user_id === viewerId) target.mine.push(row.kind);
  }

  const commentRows = comments.data as CommentRow[];
  const authors = new Map(
    (await fetchProfiles([...new Set(commentRows.map((r) => r.user_id))])).map((p) => [p.id, p]),
  );
  for (const row of commentRows) {
    entry(row.activity_id).comments.push({
      id: row.id,
      activityId: row.activity_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      author: authors.get(row.user_id) ?? null,
    });
  }

  return { map, available: true };
}

/**
 * Reactions and comments for the activity rows currently on screen, plus the
 * writes. Both mutations paint first and reconcile after: a reaction that waits
 * for a round-trip reads as a dropped tap.
 */
export function useActivitySocial(activityIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewerId = user?.id ?? '';
  const key = ['activitySocial', [...activityIds].sort().join(','), viewerId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSocial(activityIds, viewerId),
    enabled: !!viewerId,
  });

  const patch = (activityId: string, apply: (entry: ActivitySocial) => ActivitySocial) => {
    queryClient.setQueryData<SocialResult>(key, (prev) => {
      const current = prev ?? { map: {}, available: true };
      return { ...current, map: { ...current.map, [activityId]: apply(current.map[activityId] ?? blank()) } };
    });
  };

  const toggleReaction = useMutation({
    mutationFn: async ({ activityId, kind }: { activityId: string; kind: ReactionKind }) => {
      // Read through the cache, not through `query.data`: two taps in the same
      // render would both see the pre-tap value and issue the same write twice.
      const had =
        queryClient.getQueryData<SocialResult>(key)?.map[activityId]?.mine.includes(kind) ?? false;
      patch(activityId, (entry) => ({
        ...entry,
        mine: had ? entry.mine.filter((k) => k !== kind) : [...entry.mine, kind],
        counts: { ...entry.counts, [kind]: Math.max(0, (entry.counts[kind] ?? 0) + (had ? -1 : 1)) },
      }));

      const { error } = had
        ? await supabase
            .from('activity_reactions')
            .delete()
            .match({ activity_id: activityId, user_id: viewerId, kind })
        : await supabase.from('activity_reactions').insert({ activity_id: activityId, user_id: viewerId, kind });
      if (error) throw error;
    },
    // The optimistic patch is the only local copy, so a failed write has to be
    // undone by re-reading rather than by inverting it a second time.
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const postComment = useMutation({
    mutationFn: async ({ activityId, body }: { activityId: string; body: string }) => {
      const text = body.trim();
      if (!text) return;
      const { data, error } = await supabase
        .from('activity_comments')
        .insert({ activity_id: activityId, user_id: viewerId, body: text })
        .select('id, activity_id, user_id, body, created_at')
        .single();
      if (error) throw error;

      const row = data as CommentRow;
      const author = queryClient.getQueryData<Profile | null>(['profile', viewerId]) ?? null;
      patch(activityId, (entry) => ({
        ...entry,
        comments: [
          ...entry.comments,
          { id: row.id, activityId, userId: viewerId, body: row.body, createdAt: row.created_at, author },
        ],
      }));
    },
  });

  return {
    social: query.data?.map ?? {},
    /** False when the schema change has not been applied yet. */
    available: query.data?.available ?? true,
    loading: query.isLoading,
    toggleReaction,
    postComment,
  };
}
