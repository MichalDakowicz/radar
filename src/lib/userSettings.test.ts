import { DEFAULT_SETTINGS, normalizeSettings, settingsToRow, type UserSettingsRow } from '@/lib/userSettings';

// A row as it comes back from a database that has had every migration applied.
const FULL: UserSettingsRow = {
  watch_provider_country: 'PL',
  recently_added_days: 14,
  show_recently_added: false,
  friends_visibility: 'public',
  streak_threshold: 3,
  tv_streak_threshold: 7,
  theme: 'light',
  owned_services: ['Netflix'],
  notify_enabled: true,
  notify_friend_requests: false,
  notify_friend_activity: 'all',
  notify_social: false,
  notify_releases: true,
  notify_release_lead_days: 7,
  notify_streaks: false,
  notify_nudges: false,
  notify_quiet_start: 22,
  notify_quiet_end: 7,
  timezone: 'Europe/Warsaw',
  current_streak: 12,
  streak_updated_at: '2026-08-02T10:00:00Z',
  streak_week_start: '2026-07-27',
  streak_week_needed: 2,
};

/** What the same row looks like before notifications.sql has been run. */
const LEGACY = Object.fromEntries(
  Object.entries(FULL).map(([key, value]) => [key, key.startsWith('notify_') || key === 'timezone' ? null : value]),
) as UserSettingsRow;

describe('normalizeSettings', () => {
  it('maps every column across', () => {
    expect(normalizeSettings(FULL)).toEqual({
      watchProviderCountry: 'PL',
      recentlyAddedDays: 14,
      showRecentlyAdded: false,
      friendsVisibility: 'public',
      streakThreshold: 3,
      tvStreakThreshold: 7,
      theme: 'light',
      ownedServices: ['Netflix'],
      notifyEnabled: true,
      notifyFriendRequests: false,
      notifyFriendActivity: 'all',
      notifySocial: false,
      notifyReleases: true,
      notifyReleaseLeadDays: 7,
      notifyStreaks: false,
      notifyNudges: false,
      notifyQuietStart: 22,
      notifyQuietEnd: 7,
      timezone: 'Europe/Warsaw',
      currentStreak: 12,
      streakUpdatedAt: '2026-08-02T10:00:00Z',
      streakWeekStart: '2026-07-27',
      streakWeekNeeded: 2,
    });
  });

  // The failure mode this guards against is silent: a null toggle read as
  // `false` would mute someone who never asked to be muted, on a database that
  // simply has not had the migration applied yet.
  it('reads a pre-migration row as the defaults, not as everything off', () => {
    const settings = normalizeSettings(LEGACY);
    expect(settings.notifyEnabled).toBe(true);
    expect(settings.notifyFriendRequests).toBe(true);
    expect(settings.notifySocial).toBe(true);
    expect(settings.notifyReleases).toBe(true);
    expect(settings.notifyStreaks).toBe(true);
    expect(settings.notifyNudges).toBe(true);
    expect(settings.notifyFriendActivity).toBe(DEFAULT_SETTINGS.notifyFriendActivity);
    expect(settings.notifyReleaseLeadDays).toBe(DEFAULT_SETTINGS.notifyReleaseLeadDays);
    expect(settings.timezone).toBe('UTC');
  });

  // The week snapshot columns arrive with the same release as the fixed streak
  // warning; a row written before it has no week to warn about, not a zero one.
  it('reads a row with no week snapshot as owing nothing', () => {
    const settings = normalizeSettings({ ...FULL, streak_week_start: null, streak_week_needed: null });
    expect(settings.streakWeekStart).toBeNull();
    expect(settings.streakWeekNeeded).toBe(0);
  });

  it('keeps a deliberate false rather than treating it as absent', () => {
    expect(normalizeSettings({ ...FULL, notify_enabled: false }).notifyEnabled).toBe(false);
    expect(normalizeSettings({ ...FULL, notify_release_lead_days: 0 }).notifyReleaseLeadDays).toBe(0);
    expect(normalizeSettings({ ...FULL, notify_quiet_start: 0 }).notifyQuietStart).toBe(0);
  });

  it('falls back to collection on an unrecognised friend-activity scope', () => {
    expect(normalizeSettings({ ...FULL, notify_friend_activity: 'everything' }).notifyFriendActivity).toBe('collection');
  });
});

describe('settingsToRow', () => {
  it('renames only the keys it knows', () => {
    expect(settingsToRow({ notifyFriendActivity: 'none', currentStreak: 4 })).toEqual({
      notify_friend_activity: 'none',
      current_streak: 4,
    });
  });

  it('drops anything that is not a settings key', () => {
    expect(settingsToRow({ nonsense: true } as never)).toEqual({});
  });
});
