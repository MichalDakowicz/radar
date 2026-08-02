import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { unreadCount } from '@/lib/notificationInbox';
import { supabase } from '@/lib/supabase';
import type { AppNotification, NotificationData, NotificationKind } from '@/types/notification';

// The inbox. public.notifications is written only by security-definer triggers
// and pg_cron generators (supabase/notifications.sql) — the client's whole side
// of it is reading, marking read, and deleting.

/** One screenful and then some; the table prunes itself server-side anyway. */
const INBOX_LIMIT = 100;

type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  actor_id: string | null;
  data: NotificationData | null;
  read_at: string | null;
  created_at: string;
};

const inboxKey = (uid?: string) => ['notifications', uid] as const;

/** Snapshot handed from onMutate to onError so a failed write can be undone. */
type InboxContext = { previous?: AppNotification[] };

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    actorId: row.actor_id,
    data: row.data ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, title, body, actor_id, data, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(INBOX_LIMIT);
  if (error) throw error;
  return (data as NotificationRow[]).map(toNotification);
}

/**
 * The inbox with its mutations. Realtime rather than polled: a friend request
 * arriving has to light the nav badge while the user is on another screen, and
 * that is the same INSERT the banner came from.
 */
export function useNotifications() {
  const { user } = useAuth();
  const uid = user?.id;
  const queryClient = useQueryClient();
  const queryKey = inboxKey(uid);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(uid!),
    enabled: !!uid,
  });

  useEffect(() => {
    if (!uid) return;
    // Random suffix per the useMovies channel-reuse note (dev-mode double mount).
    const channel = supabase
      .channel(`notifications:${uid}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        () => queryClient.invalidateQueries({ queryKey: inboxKey(uid) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);

  // Optimistic on all three: the read dot and the badge are the whole point of
  // the interaction, and waiting a round-trip to dim a row reads as a dropped tap.
  const patch = (apply: (rows: AppNotification[]) => AppNotification[]) => async (): Promise<InboxContext> => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<AppNotification[]>(queryKey);
    if (previous) queryClient.setQueryData<AppNotification[]>(queryKey, apply(previous));
    return { previous };
  };

  const rollback = (_e: Error, _v: unknown, context: InboxContext | undefined) => {
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
  };

  const settle = () => queryClient.invalidateQueries({ queryKey });

  const markRead = useMutation<void, Error, string, InboxContext>({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (error) throw error;
    },
    onMutate: (id) =>
      patch((rows) => rows.map((row) => (row.id === id ? { ...row, readAt: new Date().toISOString() } : row)))(),
    onError: rollback,
    onSettled: settle,
  });

  // Explicit generics throughout: with a no-argument mutationFn, TVariables
  // infers as unknown and mutate() then insists on being handed something, and
  // naming TContext is what lets one shared rollback serve all three.
  const markAllRead = useMutation<void, Error, void, InboxContext>({
    mutationFn: async () => {
      if (!uid) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', uid)
        .is('read_at', null);
      if (error) throw error;
    },
    onMutate: patch((rows) => rows.map((row) => (row.readAt ? row : { ...row, readAt: new Date().toISOString() }))),
    onError: rollback,
    onSettled: settle,
  });

  const clearAll = useMutation<void, Error, void, InboxContext>({
    mutationFn: async () => {
      if (!uid) return;
      const { error } = await supabase.from('notifications').delete().eq('user_id', uid);
      if (error) throw error;
    },
    onMutate: patch(() => []),
    onError: rollback,
    onSettled: settle,
  });

  const notifications = query.data ?? [];

  return {
    notifications,
    unread: unreadCount(notifications),
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    clearAll: () => clearAll.mutate(),
    clearing: clearAll.isPending,
  };
}

/**
 * The unread number for always-mounted chrome. No second subscription: the
 * inbox screen keeps this key fresh and react-query dedupes the fetch behind one
 * cache entry.
 *
 * friend_request rows are excluded because the inbox renders those as
 * accept/decline cards and marks them read on open — counting them here would
 * double up with the pending-request count the same badge already adds.
 */
export function useUnreadInboxCount(): number {
  const { user } = useAuth();
  const uid = user?.id;
  const query = useQuery({
    queryKey: inboxKey(uid),
    queryFn: () => fetchNotifications(uid!),
    enabled: !!uid,
  });
  return unreadCount((query.data ?? []).filter((notification) => notification.kind !== 'friend_request'));
}
