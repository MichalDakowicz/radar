// Where a notification takes you. Pure and separate from the row that renders
// it, because the same answer is needed from two places that share no UI: a tap
// in the inbox, and a tap on the system banner that woke the app up.

import type { AppNotification, NotificationData, NotificationKind } from '@/types/notification';

/** Enough of a notification to route it — a push payload has no row around it. */
export type Routable = { kind: NotificationKind | string; data: NotificationData };

function titleHref(data: NotificationData): string | null {
  if (typeof data.tmdbId !== 'number') return null;
  return `/movie/${data.tmdbId}/${data.mediaType === 'tv' ? 'tv' : 'movie'}`;
}

/**
 * The route a tap should open, or null when there is nowhere better than where
 * the user already is. Falls back deliberately rather than to the title page:
 * a friend-activity row whose poster row has since gone private still knows the
 * feed is the right place to land.
 */
export function notificationHref(notification: Routable): string | null {
  const { data } = notification;

  switch (notification.kind) {
    case 'friend_request':
      // Actionable in the inbox itself, so this only matters from a banner.
      return '/inbox';
    case 'friend_accepted':
      return data.friendId ? `/friend/${data.friendId}` : '/social';
    case 'friend_activity':
    case 'reaction':
    case 'comment':
      return titleHref(data) ?? '/social';
    case 'release':
    case 'release_soon':
    case 'nudge':
      return titleHref(data) ?? '/';
    case 'streak_risk':
      return '/stats';
    default:
      return null;
  }
}

/** True when tapping the row should also mark it read. Everything but a no-op. */
export function shouldMarkReadOnPress(notification: AppNotification): boolean {
  return notification.readAt === null;
}
