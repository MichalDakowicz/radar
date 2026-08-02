import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { CHANNELS, ensureNotificationChannels, NOTIFICATION_ACCENT } from '@/lib/notificationChannels';
import { ensureNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { requestRefreshStop } from '@/lib/refreshState';

// The refresh's only UI when the app isn't on screen. expo-notifications has no
// Android progress-bar binding, so "progress" is a sticky, low-importance
// notification whose body is rewritten in place (same identifier) each title.
//
// The channel and the global notification handler used to live here; both are
// app-wide concerns now (notificationChannels / notificationSetup) and this
// module only marks its own rows `silent` so the handler leaves them off the
// banner path.

const PROGRESS_ID = 'metadata-refresh-progress';
const CATEGORY_ID = 'metadata-refresh-actions';
const STOP_ACTION = 'metadata-refresh-stop';

// A stop that only works from inside the app would defeat the point of the
// sweep surviving the app being closed, so the progress notification carries
// its own action. It can only ever arrive while the JS context is alive - which
// is exactly when there is a run to stop.
if (supportsNotifications) {
  Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier === STOP_ACTION) requestRefreshStop();
  });
}

let categoryReady = false;

async function ensureCategory(): Promise<void> {
  if (categoryReady) return;
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: STOP_ACTION, buttonTitle: 'Stop', options: { opensAppToForeground: false } },
  ]);
  categoryReady = true;
}

/**
 * Asks once for POST_NOTIFICATIONS (Android 13+). A refusal is not fatal - the
 * refresh runs either way, it just loses its progress readout.
 */
export function ensureRefreshNotifications(): Promise<boolean> {
  return ensureNotificationPermission();
}

// Reusing one identifier is what makes this read as a single updating row in
// the shade instead of a stack of one notification per title. Only the sticky
// in-progress notification is actionable - a finished run has nothing to stop.
async function present(body: string, title: string, sticky: boolean): Promise<void> {
  if (!supportsNotifications) return;
  try {
    await ensureNotificationChannels();
    if (sticky) await ensureCategory();
    await Notifications.scheduleNotificationAsync({
      identifier: PROGRESS_ID,
      content: {
        title,
        body,
        sticky,
        autoDismiss: !sticky,
        color: NOTIFICATION_ACCENT,
        // Read by the global handler: this is a status line, not an interruption.
        data: { silent: true },
        categoryIdentifier: sticky ? CATEGORY_ID : undefined,
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNELS.refresh } : null,
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

export function showRefreshStopped(ok: number, remaining: number): Promise<void> {
  return present(`${ok} titles updated · ${remaining} not refreshed`, 'Metadata refresh stopped', false);
}

export function showRefreshDone(ok: number, failed: number): Promise<void> {
  const body = failed > 0 ? `${ok} titles updated · ${failed} failed` : `${ok} titles updated`;
  return present(body, 'Metadata refresh complete', false);
}

export async function clearRefreshNotification(): Promise<void> {
  if (!supportsNotifications) return;
  try {
    await Notifications.dismissNotificationAsync(PROGRESS_ID);
  } catch {
    // Nothing posted yet, or the user already swiped it away.
  }
}
