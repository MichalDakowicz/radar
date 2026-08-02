import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// The refresh's only UI when the app isn't on screen. expo-notifications has no
// Android progress-bar binding, so "progress" is a sticky, low-importance
// notification whose body is rewritten in place (same identifier) each title.

const CHANNEL_ID = 'metadata-refresh';
const PROGRESS_ID = 'metadata-refresh-progress';
const ACCENT = '#3b82f6';

const supported = Platform.OS !== 'web';

// Low importance and no banner: this is a status line, not an interruption. It
// still has to be *presented* while the app is foregrounded, or the shade entry
// would vanish the moment the user opens Radar mid-sweep.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Metadata refresh',
    importance: Notifications.AndroidImportance.LOW,
    showBadge: false,
    lightColor: ACCENT,
  });
  channelReady = true;
}

/**
 * Asks once for POST_NOTIFICATIONS (Android 13+). A refusal is not fatal - the
 * refresh runs either way, it just loses its progress readout.
 */
export async function ensureRefreshNotifications(): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannel();
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

// Reusing one identifier is what makes this read as a single updating row in
// the shade instead of a stack of one notification per title.
async function present(body: string, title: string, sticky: boolean): Promise<void> {
  if (!supported) return;
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: PROGRESS_ID,
      content: { title, body, sticky, autoDismiss: !sticky, color: ACCENT },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn('Failed to present refresh notification', error);
  }
}

export function showRefreshProgress(current: number, total: number, title?: string): Promise<void> {
  const suffix = title ? ` · ${title}` : '';
  return present(`${current} of ${total}${suffix}`, 'Refreshing metadata', true);
}

export function showRefreshPaused(remaining: number): Promise<void> {
  return present(`${remaining} titles left · will finish in the background`, 'Metadata refresh paused', false);
}

export function showRefreshDone(ok: number, failed: number): Promise<void> {
  const body = failed > 0 ? `${ok} titles updated · ${failed} failed` : `${ok} titles updated`;
  return present(body, 'Metadata refresh complete', false);
}

export async function clearRefreshNotification(): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.dismissNotificationAsync(PROGRESS_ID);
  } catch {
    // Nothing posted yet, or the user already swiped it away.
  }
}
