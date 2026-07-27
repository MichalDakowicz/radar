import { Redirect, Tabs } from 'expo-router';
import { BarChart3, Compass, LibraryBig, Settings as SettingsIcon, Users } from 'lucide-react-native';
import { useEffect, useRef } from 'react';

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
// with material-top-tabs once Browse/Stats/Friends/Settings have real content
// (switching the nav primitive later, once four more screens exist, is a
// bigger refactor than doing it now for one real tab).
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
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: 'hsl(217 91% 60%)',
          tabBarInactiveTintColor: 'hsl(0 0% 63.9%)',
          tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#262626' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Library', tabBarIcon: ({ color, size }) => <LibraryBig color={color} size={size} /> }}
          listeners={{ tabPress: () => handleTabPress('index') }}
        />
        <Tabs.Screen
          name="browse"
          options={{ title: 'Browse', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }}
          listeners={{ tabPress: () => handleTabPress('browse') }}
        />
        <Tabs.Screen
          name="stats"
          options={{ title: 'Stats', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }}
          listeners={{ tabPress: () => handleTabPress('stats') }}
        />
        <Tabs.Screen
          name="friends"
          options={{ title: 'Friends', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
          listeners={{ tabPress: () => handleTabPress('friends') }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} /> }}
          listeners={{ tabPress: () => handleTabPress('settings') }}
        />
      </Tabs>
      <QuickAddSheet ref={quickAddRef} />
      <FriendRequestListener />
    </>
  );
}
