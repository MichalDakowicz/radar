// The shape of public.user_settings and the translation between its snake_case
// columns and the camelCase the app uses. Pure, so the tolerance rules — what a
// row written before a column migration should read as — are testable without a
// network or a React tree. The hook (hooks/useUserSettings) owns the I/O.

export type ThemePref = 'dark' | 'light' | 'system';
export type FriendsVisibility = 'public' | 'friends' | 'noone';
/** How much of a friend's watching earns a notification. */
export type FriendActivityScope = 'none' | 'collection' | 'all';

export type UserSettings = {
  watchProviderCountry: string;
  recentlyAddedDays: number;
  showRecentlyAdded: boolean;
  friendsVisibility: FriendsVisibility;
  streakThreshold: number;
  tvStreakThreshold: number;
  theme: ThemePref;
  ownedServices: string[];
  notifyEnabled: boolean;
  notifyFriendRequests: boolean;
  notifyFriendActivity: FriendActivityScope;
  notifySocial: boolean;
  notifyReleases: boolean;
  notifyReleaseLeadDays: number;
  notifyStreaks: boolean;
  notifyNudges: boolean;
  notifyQuietStart: number;
  notifyQuietEnd: number;
  /** IANA zone, synced from the device — every generator is clock-driven. */
  timezone: string;
  /** Client-computed streak snapshot the streak-risk generator reads. */
  currentStreak: number;
  streakUpdatedAt: string | null;
};

export type UserSettingsRow = {
  watch_provider_country: string;
  recently_added_days: number;
  show_recently_added: boolean;
  friends_visibility: FriendsVisibility;
  streak_threshold: number;
  tv_streak_threshold: number;
  theme: string | null;
  owned_services: string[] | null;
  notify_enabled: boolean | null;
  notify_friend_requests: boolean | null;
  notify_friend_activity: string | null;
  notify_social: boolean | null;
  notify_releases: boolean | null;
  notify_release_lead_days: number | null;
  notify_streaks: boolean | null;
  notify_nudges: boolean | null;
  notify_quiet_start: number | null;
  notify_quiet_end: number | null;
  timezone: string | null;
  current_streak: number | null;
  streak_updated_at: string | null;
};

export const DEFAULT_SETTINGS: UserSettings = {
  watchProviderCountry: 'US',
  recentlyAddedDays: 30,
  showRecentlyAdded: true,
  friendsVisibility: 'friends',
  streakThreshold: 2,
  tvStreakThreshold: 5,
  theme: 'dark',
  ownedServices: [],
  notifyEnabled: true,
  notifyFriendRequests: true,
  notifyFriendActivity: 'collection',
  notifySocial: true,
  notifyReleases: true,
  notifyReleaseLeadDays: 1,
  notifyStreaks: true,
  notifyNudges: true,
  notifyQuietStart: 23,
  notifyQuietEnd: 8,
  timezone: 'UTC',
  currentStreak: 0,
  streakUpdatedAt: null,
};

// Every column added after the initial deploy is nullable on the way in, so a
// row written before its migration reads as the default rather than as `false` —
// which for a notification toggle would mute someone who never chose to be muted.
function bool(value: boolean | null | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

export function normalizeSettings(row: UserSettingsRow): UserSettings {
  const scope = row.notify_friend_activity;
  return {
    watchProviderCountry: row.watch_provider_country,
    recentlyAddedDays: row.recently_added_days,
    showRecentlyAdded: row.show_recently_added,
    friendsVisibility: row.friends_visibility,
    streakThreshold: row.streak_threshold,
    tvStreakThreshold: row.tv_streak_threshold,
    theme: row.theme === 'light' || row.theme === 'system' ? row.theme : 'dark',
    ownedServices: Array.isArray(row.owned_services) ? row.owned_services : [],
    notifyEnabled: bool(row.notify_enabled, true),
    notifyFriendRequests: bool(row.notify_friend_requests, true),
    notifyFriendActivity: scope === 'none' || scope === 'all' ? scope : 'collection',
    notifySocial: bool(row.notify_social, true),
    notifyReleases: bool(row.notify_releases, true),
    notifyReleaseLeadDays: num(row.notify_release_lead_days, 1),
    notifyStreaks: bool(row.notify_streaks, true),
    notifyNudges: bool(row.notify_nudges, true),
    notifyQuietStart: num(row.notify_quiet_start, 23),
    notifyQuietEnd: num(row.notify_quiet_end, 8),
    timezone: row.timezone || 'UTC',
    currentStreak: num(row.current_streak, 0),
    streakUpdatedAt: row.streak_updated_at ?? null,
  };
}

const TO_COLUMN: Record<keyof UserSettings, keyof UserSettingsRow> = {
  watchProviderCountry: 'watch_provider_country',
  recentlyAddedDays: 'recently_added_days',
  showRecentlyAdded: 'show_recently_added',
  friendsVisibility: 'friends_visibility',
  streakThreshold: 'streak_threshold',
  tvStreakThreshold: 'tv_streak_threshold',
  theme: 'theme',
  ownedServices: 'owned_services',
  notifyEnabled: 'notify_enabled',
  notifyFriendRequests: 'notify_friend_requests',
  notifyFriendActivity: 'notify_friend_activity',
  notifySocial: 'notify_social',
  notifyReleases: 'notify_releases',
  notifyReleaseLeadDays: 'notify_release_lead_days',
  notifyStreaks: 'notify_streaks',
  notifyNudges: 'notify_nudges',
  notifyQuietStart: 'notify_quiet_start',
  notifyQuietEnd: 'notify_quiet_end',
  timezone: 'timezone',
  currentStreak: 'current_streak',
  streakUpdatedAt: 'streak_updated_at',
};

/** A patch, keyed by column. Unknown keys are dropped rather than sent. */
export function settingsToRow(patch: Partial<UserSettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = TO_COLUMN[key as keyof UserSettings];
    if (column) row[column] = value;
  }
  return row;
}
