import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';

import { NavIslands } from '@/components/layout/NavIslands';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBrowsePreload } from '@/features/browse/useBrowsePreload';
import { FriendRequestListener } from '@/features/friends/FriendRequestListener';
import { QuickAddSheet } from '@/features/movies/add/QuickAddSheet';
import { StreakSnapshot } from '@/features/notifications/StreakSnapshot';
import { StatsPeriodSheet } from '@/features/stats/StatsPeriodSheet';
import { useQuickAddSheetStore } from '@/store/quickAddSheet';
import { useStatsPeriodSheet } from '@/store/statsPeriod';

// Bottom tab shell (doc 05 proposed route tree). Swipe-between-main-tabs was
// confirmed as wanted but is deferred - standard bottom tabs first, revisit
// with material-top-tabs once Browse/Stats/Social/Profile have real content
// (switching the nav primitive later, once four more screens exist, is a
// bigger refactor than doing it now for one real tab).
//
// The bar is the floating nav islands on every viewport, phone and desktop web
// alike - it is the app's only navigation chrome now that the top bar is gone.
// It drives itself off the route rather than off this navigator (so it can also
// render on /settings and /inbox), which is why there are no tabPress
// listeners here any more: NavIslands owns the double-press-to-reload window.
// Keep the screen order below in sync with NAV_DESTINATIONS all the same - the
// web digit shortcuts index into it.
export default function TabsLayout() {
  const { user } = useAuth();
  const quickAddRef = useRef<BottomSheetModal>(null);
  const periodRef = useRef<BottomSheetModal>(null);
  const setPresentQuickAdd = useQuickAddSheetStore((s) => s.setPresent);
  const setPresentPeriod = useStatsPeriodSheet((s) => s.setPresent);

  // Warm the Browse discovery feed in the background so its first open is instant.
  useBrowsePreload();

  // Both sheets mount once here rather than per-screen, so anything on any route
  // can open the same instance: Add from the nav's left action on Library, the
  // period picker from both that action on Stats and the pill on the screen.
  useEffect(() => {
    setPresentQuickAdd(() => quickAddRef.current?.present());
    return () => setPresentQuickAdd(null);
  }, [setPresentQuickAdd]);

  useEffect(() => {
    setPresentPeriod(() => periodRef.current?.present());
    return () => setPresentPeriod(null);
  }, [setPresentPeriod]);

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      <Tabs
        tabBar={() => <NavIslands />}
        // No scene animation: react-navigation cross-fades over the navigator's
        // own background, which flashes white on every swap. The movement that
        // makes a tab change feel smooth lives in the nav bar instead, where the
        // marker slides between destinations.
        //
        // sceneStyle pins the app background anyway, so nothing can show through
        // between screens.
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'hsl(0 0% 3.9%)' } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Library' }} />
        <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
        <Tabs.Screen name="social" options={{ title: 'Social' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <QuickAddSheet ref={quickAddRef} />
      <StatsPeriodSheet ref={periodRef} onPicked={() => periodRef.current?.dismiss()} />
      <FriendRequestListener />
      <StreakSnapshot />
    </>
  );
}
