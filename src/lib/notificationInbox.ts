// Shaping for the inbox: how rows are bucketed by age, how many are unread, and
// which visual family a kind belongs to. Pure, so the rules the screen depends
// on are testable without a renderer.

import type { AppNotification, NotificationKind } from '@/types/notification';

const DAY = 24 * 60 * 60 * 1000;

export type InboxBucket = 'today' | 'week' | 'earlier';

export type InboxSection = {
  bucket: InboxBucket;
  label: string;
  items: AppNotification[];
};

const LABELS: Record<InboxBucket, string> = {
  today: 'Today',
  week: 'This week',
  earlier: 'Earlier',
};

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Calendar-day based, not "within 24 hours": something logged at 23:50 last
 * night is yesterday to a reader, however few hours ago it was.
 */
export function inboxBucket(createdAt: string, now: number = Date.now()): InboxBucket {
  const at = Date.parse(createdAt);
  if (Number.isNaN(at)) return 'earlier';
  const today = startOfDay(now);
  if (at >= today) return 'today';
  if (at >= today - 6 * DAY) return 'week';
  return 'earlier';
}

/**
 * Rows grouped for the list, newest first inside each bucket and empty buckets
 * dropped. Input order is preserved, so the caller decides the sort once.
 */
export function groupNotifications(
  notifications: AppNotification[],
  now: number = Date.now(),
): InboxSection[] {
  const buckets: Record<InboxBucket, AppNotification[]> = { today: [], week: [], earlier: [] };
  for (const notification of notifications) {
    buckets[inboxBucket(notification.createdAt, now)].push(notification);
  }
  return (['today', 'week', 'earlier'] as const)
    .filter((bucket) => buckets[bucket].length > 0)
    .map((bucket) => ({ bucket, label: LABELS[bucket], items: buckets[bucket] }));
}

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.reduce((count, notification) => count + (notification.readAt === null ? 1 : 0), 0);
}

/** The visual family a row belongs to — icon, tint, and nothing else. */
export type NotificationTone = 'social' | 'release' | 'streak' | 'nudge';

const TONES: Record<NotificationKind, NotificationTone> = {
  friend_request: 'social',
  friend_accepted: 'social',
  friend_activity: 'social',
  reaction: 'social',
  comment: 'social',
  release: 'release',
  release_soon: 'release',
  streak_risk: 'streak',
  nudge: 'nudge',
};

export function notificationTone(kind: NotificationKind | string): NotificationTone {
  return TONES[kind as NotificationKind] ?? 'social';
}

/** Kinds whose thumbnail should be the actor's avatar rather than a poster. */
export function usesActorAvatar(kind: NotificationKind | string): boolean {
  return kind === 'friend_request' || kind === 'friend_accepted' || kind === 'reaction' || kind === 'comment';
}

/**
 * The badge number. Capped for display only — an inbox that says 200 has stopped
 * being a number and started being a mood.
 */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}
