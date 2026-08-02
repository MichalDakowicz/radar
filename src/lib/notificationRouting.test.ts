import { notificationHref, shouldMarkReadOnPress } from '@/lib/notificationRouting';
import type { AppNotification } from '@/types/notification';

describe('notificationHref', () => {
  it('opens the title when the payload knows one', () => {
    expect(notificationHref({ kind: 'friend_activity', data: { tmdbId: 949, mediaType: 'movie' } })).toBe('/movie/949/movie');
    expect(notificationHref({ kind: 'release', data: { tmdbId: 1396, mediaType: 'tv' } })).toBe('/movie/1396/tv');
  });

  // The event beats the title for the three social kinds: reactions and comments
  // hang off the activity row, not off the film.
  it('opens the activity page for a social row that names one', () => {
    const data = { activityId: 'act-1', tmdbId: 949, mediaType: 'movie' } as const;
    expect(notificationHref({ kind: 'friend_activity', data })).toBe('/activity/act-1');
    expect(notificationHref({ kind: 'reaction', data })).toBe('/activity/act-1');
    expect(notificationHref({ kind: 'comment', data })).toBe('/activity/act-1');
    // A release alert is about the title, so it ignores an activity id entirely.
    expect(notificationHref({ kind: 'release', data })).toBe('/movie/949/movie');
  });

  // A poster row the viewer can no longer read leaves tmdbId null; the feed is
  // still a better landing than nowhere.
  it('falls back per kind when there is no title to open', () => {
    expect(notificationHref({ kind: 'friend_activity', data: {} })).toBe('/social');
    expect(notificationHref({ kind: 'comment', data: {} })).toBe('/social');
    expect(notificationHref({ kind: 'release', data: {} })).toBe('/');
    expect(notificationHref({ kind: 'nudge', data: {} })).toBe('/');
  });

  it('sends a friend acceptance to that friend, and a bare one to Social', () => {
    expect(notificationHref({ kind: 'friend_accepted', data: { friendId: 'abc' } })).toBe('/friend/abc');
    expect(notificationHref({ kind: 'friend_accepted', data: {} })).toBe('/social');
  });

  it('sends a friend request to whoever sent it, and a streak warning to Stats', () => {
    expect(notificationHref({ kind: 'friend_request', data: { senderId: 'abc' } })).toBe('/friend/abc');
    // Rows written before the payload carried a sender still have somewhere to go.
    expect(notificationHref({ kind: 'friend_request', data: {} })).toBe('/inbox');
    expect(notificationHref({ kind: 'streak_risk', data: { streak: 9 } })).toBe('/stats');
  });

  it('defaults a media type it does not recognise to movie', () => {
    expect(notificationHref({ kind: 'release', data: { tmdbId: 1, mediaType: null } })).toBe('/movie/1/movie');
  });

  it('returns null for a kind this build has never heard of', () => {
    expect(notificationHref({ kind: 'invented_later', data: { tmdbId: 5 } })).toBeNull();
  });
});

describe('shouldMarkReadOnPress', () => {
  const base: AppNotification = {
    id: 'n1',
    kind: 'release',
    title: 'Heat',
    body: 'is out today',
    actorId: null,
    data: {},
    readAt: null,
    createdAt: '2026-08-02T09:00:00Z',
  };

  it('only marks a row that is still unread', () => {
    expect(shouldMarkReadOnPress(base)).toBe(true);
    expect(shouldMarkReadOnPress({ ...base, readAt: '2026-08-02T10:00:00Z' })).toBe(false);
  });
});
