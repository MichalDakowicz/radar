import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureNotificationChannels } from '@/lib/notificationChannels';

// The one place setNotificationHandler is called. It is a global, last-write-wins
// registration, so a second module setting its own would silently decide the
// behaviour of every notification in the app — which is exactly what happened
// while the metadata sweep owned it and blanket-suppressed banners.

export const supportsNotifications = Platform.OS !== 'web';

/** Marks a notification as a status line rather than an interruption. */
export type SilentData = { silent?: boolean };

if (supportsNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Opt-out, not opt-in: a new notification kind that forgets to say
      // anything should be seen, not swallowed.
      const data = notification.request.content.data as SilentData | null | undefined;
      const silent = data?.silent === true;
      return {
        // The sweep's progress row is a line in the shade, not a banner — but it
        // still has to be *presented* while Radar is foregrounded, or the entry
        // would vanish the moment the user opened the app mid-sweep.
        shouldShowBanner: !silent,
        shouldShowList: true,
        shouldPlaySound: !silent,
        shouldSetBadge: !silent,
      };
    },
  });
}

/**
 * Asks once for POST_NOTIFICATIONS (Android 13+), creating the channels first so
 * the system prompt has something to describe. A refusal is never fatal —
 * everything that would have been a banner is still an inbox row.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    await ensureNotificationChannels();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (error) {
    console.warn('Notification permission check failed', error);
    return false;
  }
}

/** Whether notifications are already allowed, without prompting for them. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
