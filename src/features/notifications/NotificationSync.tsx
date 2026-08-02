import { useEffect, useRef } from 'react';
import { createMMKV } from 'react-native-mmkv';

import { useAuth } from '@/features/auth/AuthProvider';
import { useNotificationTaps } from '@/features/notifications/useNotificationTaps';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ensureNotificationChannels } from '@/lib/notificationChannels';
import { ensureNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { syncPushToken } from '@/lib/pushRegistration';

// Everything the server needs to know about *this* device, reconciled once per
// sign-in. Renders nothing; mounted from the root layout so it runs on every
// route rather than only where a screen happens to remember to ask.
const storage = createMMKV({ id: 'radar-push' });

const ASKED_KEY = 'permissionAsked';

/** The device's IANA zone, or null when the runtime cannot say. */
function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function NotificationSync() {
  const { user } = useAuth();
  const { settings, loading, updateSettings } = useUserSettings();
  const syncedFor = useRef<string | null>(null);

  // Only route a tapped banner once there is somebody to route: a cold start
  // from a notification resolves auth and the tap at roughly the same moment.
  useNotificationTaps(!!user?.id);

  // Channels first and unconditionally: Android shows their names in the system
  // permission sheet, so creating them after the prompt describes nothing.
  useEffect(() => {
    if (supportsNotifications) void ensureNotificationChannels();
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (!uid || !supportsNotifications) return;
    // Once per session per account. Re-running on every render of the tree would
    // re-upsert the token on each navigation for no gain.
    if (syncedFor.current === uid) return;
    syncedFor.current = uid;

    void (async () => {
      // Ask at most once ever. Android stops honouring the request after two
      // refusals anyway, and a prompt on every cold start reads as nagging.
      if (!storage.getBoolean(ASKED_KEY)) {
        storage.set(ASKED_KEY, true);
        await ensureNotificationPermission();
      }
      await syncPushToken(uid);
    })();
  }, [user?.id]);

  // Every generator in notifications.sql is clock-driven — "9am on release day",
  // "20:00 if the streak is at risk" — so a wrong timezone does not delay a
  // notification, it sends it at the wrong time of day.
  useEffect(() => {
    if (!user?.id || loading) return;
    const zone = deviceTimezone();
    if (!zone || zone === settings.timezone) return;
    void updateSettings({ timezone: zone });
  }, [user?.id, loading, settings.timezone, updateSettings]);

  return null;
}
