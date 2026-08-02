import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { ensureNotificationPermission, hasNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { syncPushToken } from '@/lib/pushRegistration';

/**
 * OS-level notification permission, kept honest across a trip to system
 * settings. The only way back from Android's app-info screen is the app
 * foregrounding again, so that is what triggers the re-check — polling would
 * either be too slow to feel connected or too fast to be free.
 */
export function useNotificationPermission(userId?: string) {
  const [granted, setGranted] = useState<boolean | null>(supportsNotifications ? null : false);

  const check = useCallback(async () => {
    setGranted(await hasNotificationPermission());
  }, []);

  useEffect(() => {
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, [check]);

  /**
   * Ask, or send the user to system settings when Android has stopped honouring
   * the prompt. Registers the push token on the way out: permission is what was
   * blocking getExpoPushTokenAsync, so this is the first moment one can exist.
   */
  const request = useCallback(async () => {
    const allowed = await ensureNotificationPermission();
    setGranted(allowed);
    if (allowed && userId) await syncPushToken(userId);
    else if (!allowed) await Linking.openSettings().catch(() => undefined);
  }, [userId]);

  return { granted, request, recheck: check };
}
