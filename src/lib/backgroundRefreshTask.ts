import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getFullRefreshSince, getLastRunAt } from '@/lib/refreshState';
import { runMetadataRefresh } from '@/lib/runMetadataRefresh';

// Android WorkManager wakes the app roughly every few hours, boots a headless
// JS context and calls this task. Registration is persisted by the OS, so this
// keeps working after a reboot without the user opening Radar.
//
// defineTask has to run at module scope: the headless launch imports the bundle
// and looks the task up by name, with no React tree involved. This module is
// imported from src/app/_layout.tsx purely to guarantee that happens.

export const METADATA_REFRESH_TASK = 'radar-metadata-refresh';

/** Ask often; most wakeups find nothing due and exit in a single query. */
const WAKEUP_INTERVAL_MINUTES = 4 * 60;

/** Don't sweep for merely-stale titles more than once a day. */
const AUTO_RUN_COOLDOWN_MS = 20 * 60 * 60 * 1000;

const supported = Platform.OS !== 'web';

if (supported) {
  TaskManager.defineTask(METADATA_REFRESH_TASK, async () => {
    try {
      // A pending full sweep is the user's own manual refresh finishing off, so
      // it ignores the cooldown and keeps its progress notification. A plain
      // staleness top-up stays silent.
      const resuming = getFullRefreshSince() != null;
      if (!resuming) {
        const lastRun = getLastRunAt();
        if (lastRun && Date.now() - lastRun < AUTO_RUN_COOLDOWN_MS) return BackgroundTask.BackgroundTaskResult.Success;
      }

      await runMetadataRefresh({ mode: 'background', notify: resuming });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.error('Background metadata refresh failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Idempotent - re-registering an already-registered task just refreshes its
 * options, so this can run on every app start.
 */
export async function registerMetadataRefreshTask(): Promise<void> {
  if (!supported) return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
    await BackgroundTask.registerTaskAsync(METADATA_REFRESH_TASK, {
      minimumInterval: WAKEUP_INTERVAL_MINUTES,
    });
  } catch (error) {
    console.warn('Could not register the background metadata refresh', error);
  }
}
