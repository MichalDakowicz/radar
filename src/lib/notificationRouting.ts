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
 * The event itself, when the row carries one. Preferred over the title page for
 * anything social: "Ana finished Dune" is about what Ana did, and the reactions
 * and comments that answer it live on the event, not on Dune.
 */
function activityHref(data: NotificationData): string | null {
  return data.activityId ? `/activity/${data.activityId}` : null;
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
      // Whoever is asking, rather than the inbox: the question is "who is this
      // person", and the accept/decline cards are one back-tap away. Older rows
      // predating the senderId payload still land on the inbox.
      return data.senderId ? `/friend/${data.senderId}` : '/inbox';
    case 'friend_accepted':
      return data.friendId ? `/friend/${data.friendId}` : '/social';
    case 'friend_activity':
    case 'reaction':
    case 'comment':
      // Event page first, then the title, then the feed — each fallback is a
      // step further from what the notification actually said.
      return activityHref(data) ?? titleHref(data) ?? '/social';
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
