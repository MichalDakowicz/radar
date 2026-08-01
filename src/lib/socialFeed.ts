// Shaping for the Social tab's activity feed. Everything here is pure so the
// feed's rules — what a chip matches, how a row reads, which friends count as
// "new since your last visit" — are testable without a renderer or a network.
//
// The feed reads public.activity rows written by useMovies' logActivity, so the
// only signals it can show are ones the app already records. Nothing here
// invents presence or playback.

import type { ActivityEvent, ActivityType } from '@/types/movie';

/**
 * Reaction codes match the CHECK constraint on activity_reactions.kind. The
 * column stores the code, not the glyph — '❤️' carries a variation selector,
 * and comparing that in SQL is a normalisation trap.
 */
export type ReactionKind = 'fire' | 'eyes' | 'heart';

export const REACTIONS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: 'fire', emoji: '🔥', label: 'fire' },
  { kind: 'eyes', emoji: '👀', label: 'eyes' },
  { kind: 'heart', emoji: '❤️', label: 'heart' },
];

/** What an activity row means to the feed, collapsed from the raw event type. */
export type FeedKind = 'rating' | 'watched' | 'progress' | 'watchlist' | 'other';

export type FeedFilter = 'all' | FeedKind;

export const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'rating', label: 'Ratings' },
  { key: 'watched', label: 'Watched' },
  { key: 'progress', label: 'In progress' },
  { key: 'watchlist', label: 'Watchlist' },
];

// `details` is nullable so a raw Postgres row can be passed straight in,
// before it has been through the read boundary that defaults it to {}.
type MinimalEvent = { type: ActivityType; details: Record<string, unknown> | null };

function statusOf(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : '';
}

/**
 * 'added' and 'status_changed' both cover several outcomes, so the kind comes
 * from the details payload rather than the type alone — otherwise "added to
 * watchlist" and "moved to Watching" would land in the same bucket.
 */
export function feedKind(event: MinimalEvent): FeedKind {
  const details = event.details ?? {};
  switch (event.type) {
    case 'rating_changed':
      return 'rating';
    case 'completed':
      return 'watched';
    case 'started_watching':
      return 'progress';
    case 'added_to_watchlist':
      return 'watchlist';
    case 'added':
      return statusOf(details, 'status') === 'Watchlist' ? 'watchlist' : 'other';
    case 'status_changed':
      return statusFilterKind(statusOf(details, 'newStatus'));
    default:
      return 'other';
  }
}

function statusFilterKind(status: string): FeedKind {
  if (status === 'Watchlist' || status === 'Plan to Watch') return 'watchlist';
  if (status === 'Watching') return 'progress';
  if (status === 'Completed' || status === 'Watched') return 'watched';
  return 'other';
}

export function matchesFeedFilter(kind: FeedKind, filter: FeedFilter): boolean {
  return filter === 'all' || kind === filter;
}

/** 'removed' and 'updated' are library bookkeeping — not a friend's business. */
export function isFeedWorthy(event: MinimalEvent): boolean {
  return event.type !== 'removed' && event.type !== 'updated';
}

/** The grey line after the name: "finished", "rated it 4.5", "added to watchlist". */
export function activityVerb(event: MinimalEvent): string {
  const details = event.details ?? {};
  switch (event.type) {
    case 'completed':
      return 'finished';
    case 'rating_changed': {
      const rating = details.rating;
      return typeof rating === 'number' ? `rated it ${formatScore(rating)}` : 'rated it';
    }
    case 'started_watching':
      return 'started watching';
    case 'added_to_watchlist':
      return 'added to their watchlist';
    case 'added':
      return statusOf(details, 'status') === 'Watchlist' ? 'added to their watchlist' : 'added to their library';
    case 'status_changed': {
      const next = statusOf(details, 'newStatus');
      return next ? `moved it to ${next}` : 'changed its status';
    }
    default:
      return 'updated it';
  }
}

/** Trailing zeroes read as noise on a rating: 4.5 stays 4.5, 4.0 becomes 4. */
export function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact age for a feed row: "just now", "12m", "3h", "yesterday", "5d", "3w". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const delta = now - then;
  if (delta < MINUTE) return 'just now';
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  const days = Math.floor(delta / DAY);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  if (days < 28) return `${Math.floor(days / 7)}w`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type WeekBar = { userId: string; count: number; widthPct: number };
export type WeekDigest = { total: number; bars: WeekBar[]; leaderId: string | null };

/**
 * "This week" — how many titles each friend logged in the trailing window.
 * Bars are relative to the busiest friend, not to the total, so the shape stays
 * readable when one person logs ten and everyone else logs one.
 */
export function weekDigest(
  events: Pick<ActivityEvent, 'userId' | 'createdAt' | 'type' | 'details'>[],
  now: number = Date.now(),
  windowDays = 7,
  maxBars = 4,
): WeekDigest {
  const since = now - windowDays * DAY;
  const counts = new Map<string, number>();

  for (const event of events) {
    const at = Date.parse(event.createdAt);
    if (Number.isNaN(at) || at < since || at > now) continue;
    // Only logged *viewing* counts as a week's worth of films — a watchlist add
    // is an intention, and counting it would inflate everyone's number.
    const kind = feedKind(event);
    if (kind !== 'watched' && kind !== 'rating') continue;
    counts.set(event.userId, (counts.get(event.userId) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId));

  const top = ranked[0]?.count ?? 0;
  return {
    total: ranked.reduce((sum, row) => sum + row.count, 0),
    leaderId: ranked[0]?.userId ?? null,
    bars: ranked.slice(0, maxBars).map((row) => ({
      ...row,
      widthPct: top > 0 ? Math.round((row.count / top) * 100) : 0,
    })),
  };
}

/**
 * Per-friend count of events newer than the watermark — the rail's spinning
 * ring and its badge. A null watermark means a first visit: nothing is "new"
 * yet, because everything would be.
 */
export function freshCountsSince(
  events: Pick<ActivityEvent, 'userId' | 'createdAt'>[],
  sinceIso: string | null,
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!sinceIso) return counts;
  const since = Date.parse(sinceIso);
  if (Number.isNaN(since)) return counts;

  for (const event of events) {
    const at = Date.parse(event.createdAt);
    if (Number.isNaN(at) || at <= since) continue;
    counts[event.userId] = (counts[event.userId] ?? 0) + 1;
  }
  return counts;
}

/** "Only Anna · 3 updates" — the count line on the active rail filter. */
export function filterCountLabel(count: number): string {
  return count === 1 ? '1 update' : `${count} updates`;
}
