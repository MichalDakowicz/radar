import {
  badgeLabel,
  groupNotifications,
  inboxBucket,
  notificationTone,
  unreadCount,
  usesActorAvatar,
} from '@/lib/notificationInbox';
import type { AppNotification, NotificationKind } from '@/types/notification';

const NOW = new Date('2026-08-02T14:00:00Z').getTime();

function make(id: string, createdAt: string, readAt: string | null = null): AppNotification {
  return {
    id,
    kind: 'friend_activity',
    title: 'Ada',
    body: 'finished Heat',
    actorId: 'ada',
    data: {},
    readAt,
    createdAt,
  };
}

describe('inboxBucket', () => {
  it('buckets by calendar day, not by elapsed hours', () => {
    const lateLastNight = new Date(NOW);
    lateLastNight.setDate(lateLastNight.getDate() - 1);
    lateLastNight.setHours(23, 50, 0, 0);
    // Only a few hours old, but it is still yesterday to anyone reading it.
    expect(inboxBucket(lateLastNight.toISOString(), NOW)).toBe('week');
  });

  it('calls anything from today today', () => {
    const earlier = new Date(NOW);
    earlier.setHours(0, 5, 0, 0);
    expect(inboxBucket(earlier.toISOString(), NOW)).toBe('today');
  });

  it('drops past six days into earlier', () => {
    const old = new Date(NOW - 8 * 24 * 60 * 60 * 1000);
    expect(inboxBucket(old.toISOString(), NOW)).toBe('earlier');
  });

  it('treats an unparseable date as old rather than throwing', () => {
    expect(inboxBucket('not a date', NOW)).toBe('earlier');
  });
});

describe('groupNotifications', () => {
  it('omits empty buckets and keeps input order inside one', () => {
    const today = new Date(NOW).toISOString();
    const older = new Date(NOW - 20 * 24 * 60 * 60 * 1000).toISOString();
    const sections = groupNotifications([make('a', today), make('b', today), make('c', older)], NOW);

    expect(sections.map((s) => s.bucket)).toEqual(['today', 'earlier']);
    expect(sections[0].items.map((n) => n.id)).toEqual(['a', 'b']);
    expect(sections[1].items).toHaveLength(1);
  });

  it('returns nothing for an empty inbox', () => {
    expect(groupNotifications([], NOW)).toEqual([]);
  });
});

describe('unreadCount', () => {
  it('counts only rows with no read timestamp', () => {
    const now = new Date(NOW).toISOString();
    expect(unreadCount([make('a', now), make('b', now, now), make('c', now)])).toBe(2);
  });
});

describe('notificationTone', () => {
  it.each<[NotificationKind, string]>([
    ['friend_request', 'social'],
    ['comment', 'social'],
    ['release_soon', 'release'],
    ['streak_risk', 'streak'],
    ['nudge', 'nudge'],
  ])('maps %s to %s', (kind, tone) => {
    expect(notificationTone(kind)).toBe(tone);
  });

  // A database ahead of the installed app must degrade, not crash.
  it('falls back to social on an unknown kind', () => {
    expect(notificationTone('something_new')).toBe('social');
  });
});

describe('usesActorAvatar', () => {
  it('shows the person for person-shaped kinds and the poster otherwise', () => {
    expect(usesActorAvatar('friend_request')).toBe(true);
    expect(usesActorAvatar('comment')).toBe(true);
    expect(usesActorAvatar('friend_activity')).toBe(false);
    expect(usesActorAvatar('release')).toBe(false);
  });
});

describe('badgeLabel', () => {
  it('hides at zero and caps at 99+', () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-1)).toBeNull();
    expect(badgeLabel(7)).toBe('7');
    expect(badgeLabel(99)).toBe('99');
    expect(badgeLabel(320)).toBe('99+');
  });
});
