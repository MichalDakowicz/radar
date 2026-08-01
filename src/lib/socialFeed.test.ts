import {
  activityVerb,
  feedKind,
  filterCountLabel,
  formatScore,
  freshCountsSince,
  isFeedWorthy,
  matchesFeedFilter,
  relativeTime,
  weekDigest,
} from './socialFeed';
import type { ActivityEvent, ActivityType } from '@/types/movie';

const NOW = new Date('2026-08-01T12:00:00Z').getTime();

const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const event = (
  type: ActivityType,
  overrides: Partial<ActivityEvent> = {},
): ActivityEvent =>
  ({
    id: 'e1',
    userId: 'u1',
    movieId: 'm1',
    movieTitle: 'Dune: Part Two',
    type,
    mediaType: 'movie',
    details: {},
    createdAt: ago(MINUTE),
    ...overrides,
  }) as ActivityEvent;

describe('feedKind', () => {
  it('maps the direct event types', () => {
    expect(feedKind(event('rating_changed'))).toBe('rating');
    expect(feedKind(event('completed'))).toBe('watched');
    expect(feedKind(event('started_watching'))).toBe('progress');
    expect(feedKind(event('added_to_watchlist'))).toBe('watchlist');
  });

  it('reads the status off an "added" event instead of guessing', () => {
    expect(feedKind(event('added', { details: { status: 'Watchlist' } }))).toBe('watchlist');
    expect(feedKind(event('added', { details: { status: 'Completed' } }))).toBe('other');
    expect(feedKind(event('added'))).toBe('other');
  });

  it('reads the destination off a status change', () => {
    expect(feedKind(event('status_changed', { details: { newStatus: 'Watching' } }))).toBe('progress');
    expect(feedKind(event('status_changed', { details: { newStatus: 'Completed' } }))).toBe('watched');
    expect(feedKind(event('status_changed', { details: { newStatus: 'Plan to Watch' } }))).toBe('watchlist');
    expect(feedKind(event('status_changed', { details: { newStatus: 'Something else' } }))).toBe('other');
  });
});

describe('matchesFeedFilter', () => {
  it('lets everything through on All', () => {
    expect(matchesFeedFilter('other', 'all')).toBe(true);
    expect(matchesFeedFilter('rating', 'all')).toBe(true);
  });

  it('matches only its own kind otherwise', () => {
    expect(matchesFeedFilter('rating', 'rating')).toBe(true);
    expect(matchesFeedFilter('watched', 'rating')).toBe(false);
  });
});

describe('isFeedWorthy', () => {
  it('drops library bookkeeping', () => {
    expect(isFeedWorthy(event('removed'))).toBe(false);
    expect(isFeedWorthy(event('updated'))).toBe(false);
  });

  it('keeps everything a friend would care about', () => {
    expect(isFeedWorthy(event('completed'))).toBe(true);
    expect(isFeedWorthy(event('rating_changed'))).toBe(true);
  });
});

describe('activityVerb', () => {
  it('names the rating when there is one', () => {
    expect(activityVerb(event('rating_changed', { details: { rating: 4.5 } }))).toBe('rated it 4.5');
    expect(activityVerb(event('rating_changed', { details: { rating: 4 } }))).toBe('rated it 4');
  });

  it('falls back when the rating is missing', () => {
    expect(activityVerb(event('rating_changed'))).toBe('rated it');
  });

  it('distinguishes a watchlist add from a library add', () => {
    expect(activityVerb(event('added', { details: { status: 'Watchlist' } }))).toBe('added to their watchlist');
    expect(activityVerb(event('added', { details: { status: 'Completed' } }))).toBe('added to their library');
  });

  it('names the destination of a status change', () => {
    expect(activityVerb(event('status_changed', { details: { newStatus: 'Watching' } }))).toBe('moved it to Watching');
    expect(activityVerb(event('status_changed'))).toBe('changed its status');
  });
});

describe('formatScore', () => {
  it('drops a trailing zero', () => {
    expect(formatScore(4)).toBe('4');
    expect(formatScore(4.0)).toBe('4');
  });

  it('keeps one decimal', () => {
    expect(formatScore(4.5)).toBe('4.5');
    expect(formatScore(3.25)).toBe('3.3');
  });
});

describe('relativeTime', () => {
  it('walks the units', () => {
    expect(relativeTime(ago(30_000), NOW)).toBe('just now');
    expect(relativeTime(ago(12 * MINUTE), NOW)).toBe('12m');
    expect(relativeTime(ago(3 * HOUR), NOW)).toBe('3h');
    expect(relativeTime(ago(DAY + HOUR), NOW)).toBe('yesterday');
    expect(relativeTime(ago(5 * DAY), NOW)).toBe('5d');
    expect(relativeTime(ago(21 * DAY), NOW)).toBe('3w');
  });

  it('falls back to a date past a month', () => {
    expect(relativeTime(ago(200 * DAY), NOW)).toMatch(/\w/);
  });

  it('returns nothing for an unparseable timestamp', () => {
    expect(relativeTime('nonsense', NOW)).toBe('');
  });
});

describe('weekDigest', () => {
  const logged = (userId: string, at: string) =>
    event('completed', { userId, createdAt: at, details: {} });

  it('counts only viewing inside the window', () => {
    const digest = weekDigest(
      [
        logged('anna', ago(HOUR)),
        logged('anna', ago(2 * DAY)),
        logged('piotr', ago(3 * DAY)),
        logged('anna', ago(20 * DAY)), // outside the window
        event('added_to_watchlist', { userId: 'anna', createdAt: ago(HOUR) }), // intent, not viewing
      ],
      NOW,
    );
    expect(digest.total).toBe(3);
    expect(digest.leaderId).toBe('anna');
    expect(digest.bars).toEqual([
      { userId: 'anna', count: 2, widthPct: 100 },
      { userId: 'piotr', count: 1, widthPct: 50 },
    ]);
  });

  it('counts a rating as a logged film', () => {
    const digest = weekDigest([event('rating_changed', { userId: 'kasia', createdAt: ago(HOUR) })], NOW);
    expect(digest.total).toBe(1);
  });

  it('caps the bars', () => {
    const events = ['a', 'b', 'c', 'd', 'e'].map((id) => logged(id, ago(HOUR)));
    expect(weekDigest(events, NOW).bars).toHaveLength(4);
  });

  it('is empty with no activity', () => {
    expect(weekDigest([], NOW)).toEqual({ total: 0, bars: [], leaderId: null });
  });
});

describe('freshCountsSince', () => {
  it('counts per friend past the watermark', () => {
    const counts = freshCountsSince(
      [
        { userId: 'anna', createdAt: ago(MINUTE) },
        { userId: 'anna', createdAt: ago(2 * MINUTE) },
        { userId: 'piotr', createdAt: ago(2 * DAY) },
      ],
      ago(HOUR),
    );
    expect(counts).toEqual({ anna: 2 });
  });

  it('treats an event exactly on the watermark as already seen', () => {
    const at = ago(HOUR);
    expect(freshCountsSince([{ userId: 'anna', createdAt: at }], at)).toEqual({});
  });

  it('marks nothing fresh on a first visit', () => {
    expect(freshCountsSince([{ userId: 'anna', createdAt: ago(MINUTE) }], null)).toEqual({});
  });
});

describe('filterCountLabel', () => {
  it('singularises', () => {
    expect(filterCountLabel(1)).toBe('1 update');
    expect(filterCountLabel(0)).toBe('0 updates');
    expect(filterCountLabel(4)).toBe('4 updates');
  });
});
