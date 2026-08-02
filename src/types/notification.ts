import type { MediaType } from '@/types/movie';

// Mirrors public.notification_kind (supabase/notifications.sql). Adding a member
// there without adding it here leaves the row rendering on the generic fallback
// rather than crashing, which is the right failure for a client that may be an
// app-store version behind the database.
export type NotificationKind =
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_activity'
  | 'reaction'
  | 'comment'
  | 'release'
  | 'release_soon'
  | 'streak_risk'
  | 'nudge';

/**
 * The `data` payload. Every field is optional because it is a snapshot written
 * by whichever trigger or generator produced the row — a release alert carries a
 * title and a poster, a friend request carries a sender and nothing else.
 */
export type NotificationData = {
  senderId?: string;
  friendId?: string;
  activityId?: string;
  commentId?: string;
  movieId?: string;
  tmdbId?: number | null;
  mediaType?: MediaType | null;
  movieTitle?: string | null;
  coverUrl?: string | null;
  releaseDate?: string | null;
  rating?: number | null;
  reaction?: string | null;
  streak?: number;
  /** Stamped on by the push path so a tapped banner can find its row. */
  notificationId?: string;
  kind?: string;
};

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Who caused it, when that is a person. Null for release/streak/nudge. */
  actorId: string | null;
  data: NotificationData;
  readAt: string | null;
  createdAt: string;
};
