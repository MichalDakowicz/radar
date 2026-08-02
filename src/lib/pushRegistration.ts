import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

import { ensureNotificationChannels } from '@/lib/notificationChannels';
import { hasNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { supabase } from '@/lib/supabase';

// Expo push tokens, and the public.device_tokens row that lets the server reach
// this phone. The token is the primary key over there, not the user - a handset
// passed to a second account has to *move* its token, or the previous owner
// keeps receiving the new owner's banners.
//
// The last token is mirrored into MMKV because sign-out has to delete the right
// row, and by then there is no session left to ask the server which row that was.
const storage = createMMKV({ id: 'radar-push' });

const TOKEN_KEY = 'expoPushToken';

/** Emulators have no FCM registration to hand out; asking just throws. */
const canRegister = supportsNotifications && Platform.OS !== 'web';

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export function getStoredPushToken(): string | null {
  return storage.getString(TOKEN_KEY) ?? null;
}

/**
 * The device's Expo push token, or null when it cannot have one — permission
 * refused, an emulator, or (the common case until the FCM service account is
 * uploaded to the Expo project) no push credentials configured at all.
 *
 * A missing token is not an error state worth surfacing: the inbox is server
 * side and fills either way, so the user just does not get banners.
 */
export async function fetchPushToken(): Promise<string | null> {
  if (!canRegister || !Device.isDevice) return null;
  if (!(await hasNotificationPermission())) return null;

  const id = projectId();
  if (!id) {
    console.warn('No EAS project id in app.json — push notifications are disabled');
    return null;
  }

  try {
    await ensureNotificationChannels();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    return data || null;
  } catch (error) {
    console.warn('Could not obtain an Expo push token', error);
    return null;
  }
}

/**
 * Point this device's token at `userId`. Upsert on every sign-in rather than
 * only on change: the write also refreshes updated_at, which is what keeps a
 * live phone out of the 180-day dead-token sweep in notifications.sql.
 */
export async function syncPushToken(userId: string): Promise<string | null> {
  const token = await fetchPushToken();
  if (!token) return null;

  const previous = getStoredPushToken();
  // Rotation: the old row is keyed by the old token, so nothing else will ever
  // clean it up and the server would keep pushing into a dead handle.
  if (previous && previous !== token) {
    await supabase.from('device_tokens').delete().eq('token', previous);
  }

  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      { token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );

  if (error) {
    console.warn('Could not register this device for push', error.message);
    return null;
  }

  storage.set(TOKEN_KEY, token);
  return token;
}

/**
 * Sign-out. Deletes the row while the session is still valid — RLS on
 * device_tokens is owner-scoped, so a delete attempted after the session is
 * gone silently matches nothing and the device keeps receiving notifications
 * meant for an account no longer on it.
 */
export async function clearPushToken(): Promise<void> {
  const token = getStoredPushToken();
  storage.remove(TOKEN_KEY);
  if (!token) return;
  try {
    await supabase.from('device_tokens').delete().eq('token', token);
  } catch (error) {
    console.warn('Could not unregister this device for push', error);
  }
}
