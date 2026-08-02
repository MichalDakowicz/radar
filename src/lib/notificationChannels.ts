import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Android routes every notification through a channel, and the channel — not the
// message — owns whether it makes a sound, vibrates, or is allowed to interrupt.
// Splitting them by kind is what lets the user mute nudges in the system settings
// while keeping friend requests loud, without Radar needing a setting for it.
//
// These ids are duplicated in supabase/functions/send-push/index.ts, which stamps
// channelId onto each push. A push naming a channel the device has never seen
// falls back to the app's default one, so the two lists must not drift.

export const CHANNELS = {
  social: 'social',
  releases: 'releases',
  streaks: 'streaks',
  nudges: 'nudges',
  /** The metadata sweep's progress row. Pre-dates the rest; kept for continuity. */
  refresh: 'metadata-refresh',
} as const;

export type ChannelId = (typeof CHANNELS)[keyof typeof CHANNELS];

export const NOTIFICATION_ACCENT = '#3b82f6';

const { AndroidImportance } = Notifications;

type ChannelSpec = {
  id: ChannelId;
  name: string;
  description?: string;
  importance: number;
  showBadge: boolean;
};

const SPECS: ChannelSpec[] = [
  {
    id: CHANNELS.social,
    name: 'Friends',
    description: 'Friend requests, and what the people you follow are watching',
    importance: AndroidImportance.DEFAULT,
    showBadge: true,
  },
  {
    id: CHANNELS.releases,
    name: 'Releases',
    description: 'When something on your watchlist comes out',
    importance: AndroidImportance.DEFAULT,
    showBadge: true,
  },
  {
    id: CHANNELS.streaks,
    name: 'Streaks',
    // The only channel that earns HIGH: it is the one notification with a
    // deadline, and it is worthless if it arrives after midnight.
    description: 'A warning when your watching streak is about to break',
    importance: AndroidImportance.HIGH,
    showBadge: true,
  },
  {
    id: CHANNELS.nudges,
    name: 'Suggestions',
    description: 'The occasional nudge to pick something up again',
    importance: AndroidImportance.LOW,
    showBadge: false,
  },
  {
    id: CHANNELS.refresh,
    name: 'Metadata refresh',
    importance: AndroidImportance.LOW,
    showBadge: false,
  },
];

let ready: Promise<void> | null = null;

/**
 * Create every channel. Idempotent both here (the promise is memoized) and in
 * Android, where re-declaring a channel only updates its name and description —
 * importance is frozen after first creation, because it belongs to the user
 * once they have touched it.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  ready ??= Promise.all(
    SPECS.map((spec) =>
      Notifications.setNotificationChannelAsync(spec.id, {
        name: spec.name,
        description: spec.description,
        importance: spec.importance,
        showBadge: spec.showBadge,
        lightColor: NOTIFICATION_ACCENT,
      }),
    ),
  )
    .then(() => undefined)
    .catch((error) => {
      // A failed channel is not worth blocking a refresh or a sign-in over; the
      // notification still lands, just on Android's default channel.
      console.warn('Could not create notification channels', error);
      ready = null;
    });
  return ready;
}
