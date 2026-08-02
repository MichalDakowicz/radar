import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';

import { NavIslands } from '@/components/layout/NavIslands';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBrowsePreload } from '@/features/browse/useBrowsePreload';
import { FriendRequestListener } from '@/features/friends/FriendRequestListener';
import { QuickAddSheet } from '@/features/movies/add/QuickAddSheet';
import { useQuickAddSheetStore } from '@/store/quickAddSheet';
import { useTabReload } from '@/store/tabReload';

// A second press on a tab within this window counts as a "double press" and
// reloads that screen. The first press just switches to (or stays on) the tab,
// so a lone stray tap on the current tab never wipes its state by accident.
const DOUBLE_PRESS_MS = 400;

// Bottom tab shell (doc 05 proposed route tree). Swipe-between-main-tabs was
// confirmed as wanted but is deferred - standard bottom tabs first, revisit
// with material-top-tabs once Browse/Stats/Social/Profile have real content
// (switching the nav primitive later, once four more screens exist, is a
// bigger refactor than doing it now for one real tab).
//
// The bar is the floating nav islands on every viewport, phone and desktop web
// alike - it is the app's only navigation chrome now that the top bar is gone.
// Keep the screen order below in sync with NAV_DESTINATIONS, which the islands
// and the web digit shortcuts both index into.
export default function TabsLayout() {
  const { user } = useAuth();
  const quickAddRef = useRef<BottomSheetModal>(null);
  const setPresent = useQuickAddSheetStore((s) => s.setPresent);
  const bump = useTabReload((s) => s.bump);
  const lastPress = useRef<{ name: string; time: number } | null>(null);

  // Warm the Browse discovery feed in the background so its first open is instant.
  useBrowsePreload();

  // Reload only on the *second* press of the same tab inside the window - by
  // then the tab is already focused, so this fires both when you switch to a
  // tab and immediately tap again, and when you double-tap the tab you're on.
  const handleTabPress = (name: string) => {
    const now = Date.now();
    const prev = lastPress.current;
    lastPress.current = { name, time: now };
    if (prev && prev.name === name && now - prev.time < DOUBLE_PRESS_MS) {
      bump(name);
    }
  };

  // Mounted once here (not per-tab) so every screen's Header can open the
  // same "Add Movie" sheet, matching legacy Navbar's global Add button.
  useEffect(() => {
    setPresent(() => quickAddRef.current?.present());
    return () => setPresent(null);
  }, [setPresent]);

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      <Tabs
        tabBar={(props) => <NavIslands {...props} />}
        // No scene animation: react-navigation cross-fades over the navigator's
        // own background, which flashes white on every swap. The movement that
        // makes a tab change feel smooth lives in the nav bar instead, where the
        // active plate and glyph tween (see NavDestinationButton).
        //
        // sceneStyle pins the app background anyway, so nothing can show through
        // between screens.
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'hsl(0 0% 3.9%)' } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Library' }} listeners={{ tabPress: () => handleTabPress('index') }} />
        <Tabs.Screen name="browse" options={{ title: 'Browse' }} listeners={{ tabPress: () => handleTabPress('browse') }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats' }} listeners={{ tabPress: () => handleTabPress('stats') }} />
        <Tabs.Screen name="social" options={{ title: 'Social' }} listeners={{ tabPress: () => handleTabPress('social') }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} listeners={{ tabPress: () => handleTabPress('profile') }} />
      </Tabs>
      <QuickAddSheet ref={quickAddRef} />
      <FriendRequestListener />
    </>
  );
}
