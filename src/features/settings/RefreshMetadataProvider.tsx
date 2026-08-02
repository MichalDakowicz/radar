import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUserSettings } from '@/hooks/useUserSettings';
import { registerMetadataRefreshTask } from '@/lib/backgroundRefreshTask';
import { ensureRefreshNotifications } from '@/lib/refreshNotifications';
import { getFullRefreshSince, getLastRunAt, requestRefreshStop } from '@/lib/refreshState';
import { beginFullRefresh, runMetadataRefresh } from '@/lib/runMetadataRefresh';
import { useTheme } from '@/theme/ThemeProvider';

// Thin foreground shell over lib/runMetadataRefresh. The sweep itself is
// headless so WorkManager can run it with the app closed; this only provides
// the in-app progress readout, kicks off a manual run, and makes sure the
// background task is registered.

type RefreshProgress = { current: number; total: number };

type RefreshMetadataContextValue = {
  refreshing: boolean;
  progress: RefreshProgress;
  /** A manual sweep the OS has to finish in the background. */
  pending: boolean;
  lastRunAt: number | null;
  /** A stop has been asked for but the title in flight hasn't finished yet. */
  stopping: boolean;
  refresh: () => Promise<void>;
  /** Abandons the running sweep after the title in flight finishes. */
  stop: () => void;
};

const RefreshMetadataContext = createContext<RefreshMetadataContextValue>({
  refreshing: false,
  progress: { current: 0, total: 0 },
  pending: false,
  lastRunAt: null,
  stopping: false,
  refresh: async () => {},
  stop: () => {},
});

export function RefreshMetadataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { show } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Cross-device theme sync: the runtime theme lives in ThemeProvider (MMKV,
  // instant/offline) but user_settings.theme is the durable source. Once the
  // server row loads, apply it if it differs from the local pick. One-way
  // (server -> local); changing the theme in Settings write-throughs to both,
  // so this never fights a local change.
  useEffect(() => {
    if (settingsLoading) return;
    if (settings.theme !== theme) setTheme(settings.theme);
    // Intentionally excludes `theme`: this reacts to the loaded server value,
    // not to every local toggle (which already persists itself).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.theme, settingsLoading, setTheme]);

  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<RefreshProgress>({ current: 0, total: 0 });
  const [pending, setPending] = useState(() => getFullRefreshSince() != null);
  const [lastRunAt, setLastRunAt] = useState(() => getLastRunAt());
  const [stopping, setStopping] = useState(false);
  const runningRef = useRef(false);
  const signedInRef = useRef(!!user);

  useEffect(() => {
    signedInRef.current = !!user;
  }, [user]);

  // Registration is persisted by the OS, but re-asserting it on every start is
  // how the task survives a reinstall or a user who cleared the app's data.
  useEffect(() => {
    if (user) void registerMetadataRefreshTask();
  }, [user]);

  const run = useCallback(
    async (start: boolean) => {
      if (runningRef.current) return null;
      runningRef.current = true;
      setRefreshing(true);
      setStopping(false);
      setProgress({ current: 0, total: 0 });

      await ensureRefreshNotifications();
      if (start) beginFullRefresh();
      setPending(getFullRefreshSince() != null);

      try {
        return await runMetadataRefresh({
          mode: 'manual',
          notify: true,
          onProgress: setProgress,
          isCancelled: () => !signedInRef.current,
        });
      } finally {
        runningRef.current = false;
        setRefreshing(false);
        setStopping(false);
        setProgress({ current: 0, total: 0 });
        setPending(getFullRefreshSince() != null);
        setLastRunAt(getLastRunAt());
        queryClient.invalidateQueries({ queryKey: ['movies'] });
      }
    },
    [queryClient],
  );

  // A sweep the OS never got to finish picks straight back up the next time the
  // app is open, rather than waiting on another WorkManager window.
  useEffect(() => {
    if (user && getFullRefreshSince() != null) void run(false);
  }, [user, run]);

  const refresh = useCallback(async () => {
    const outcome = await run(true);
    if (!outcome) return;

    if (outcome.skipped === 'nothing-due') show('Metadata is already up to date.');
    else if (outcome.skipped) show('A refresh is already running.');
    else if (outcome.stopped) show(`Stopped after ${outcome.ok} titles.`);
    else if (outcome.remaining > 0) show(`Paused with ${outcome.remaining} left — Radar will finish in the background.`);
    else if (outcome.failed > 0) show(`Refreshed ${outcome.ok} titles · ${outcome.failed} failed.`);
    else show(`Refreshed ${outcome.ok} titles.`);
  }, [run, show]);

  // The runner checks between titles, so the sweep winds down within one TMDB
  // round-trip rather than instantly. Flipping `stopping` keeps the row from
  // reading as if the press did nothing.
  const stop = useCallback(() => {
    if (!runningRef.current) return;
    requestRefreshStop();
    setStopping(true);
  }, []);

  return (
    <RefreshMetadataContext.Provider value={{ refreshing, progress, pending, lastRunAt, stopping, refresh, stop }}>
      {children}
    </RefreshMetadataContext.Provider>
  );
}

export function useRefreshMetadata() {
  return useContext(RefreshMetadataContext);
}
