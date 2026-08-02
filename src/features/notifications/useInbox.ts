import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { useNotifications } from '@/hooks/useNotifications';
import { useProfileMap } from '@/hooks/useProfile';
import { groupNotifications } from '@/lib/notificationInbox';
import { notificationHref, shouldMarkReadOnPress } from '@/lib/notificationRouting';
import type { AppNotification } from '@/types/notification';

/**
 * Everything the inbox screen needs, so the screen itself stays composition.
 *
 * Friend requests are the one kind the list does not render: the screen shows
 * them as accept/decline cards above, which is strictly more useful than a row
 * saying the same thing. They are marked read on open instead, or the badge
 * would count rows the user is looking at and can never clear.
 */
export function useInbox() {
  const router = useRouter();
  const { notifications, unread, loading, error, markRead, markAllRead, clearAll, clearing } = useNotifications();

  const listed = useMemo(
    () => notifications.filter((notification) => notification.kind !== 'friend_request'),
    [notifications],
  );

  const sections = useMemo(() => groupNotifications(listed), [listed]);

  const actorIds = useMemo(
    () => listed.map((notification) => notification.actorId).filter((id): id is string => !!id),
    [listed],
  );
  const actors = useProfileMap(actorIds);

  useEffect(() => {
    for (const notification of notifications) {
      if (notification.kind === 'friend_request' && notification.readAt === null) markRead(notification.id);
    }
    // markRead is a stable mutate binding; notifications is what actually changes.
  }, [notifications, markRead]);

  const open = useCallback(
    (notification: AppNotification) => {
      if (shouldMarkReadOnPress(notification)) markRead(notification.id);
      const href = notificationHref(notification);
      // Not every kind has somewhere better to be than the inbox; those just
      // mark themselves read and stay put.
      if (href) router.push(href as Href);
    },
    [markRead, router],
  );

  return {
    sections,
    actors,
    unread,
    loading,
    error,
    open,
    markAllRead,
    clearAll,
    clearing,
    isEmpty: listed.length === 0,
  };
}
