// react-navigation is vendored inside expo-router rather than installed
// alongside it, so the tab-bar prop type has to come from there.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavAction, useSocialAlert } from '@/components/layout/navActions';
import { NAV_DESTINATIONS } from '@/components/layout/navDestinations';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { useAuth } from '@/features/auth/AuthProvider';
import { Avatar } from '@/features/friends/Avatar';
import { StatsPeriodSheet } from '@/features/stats/StatsPeriodSheet';
import { NAV_ISLAND_GAP, NAV_ISLAND_HEIGHT } from '@/hooks/useNavBarSpace';
import { useProfile } from '@/hooks/useProfile';
import { useStatsPeriodSheet } from '@/store/statsPeriod';

const ACCENT = 'hsl(217 91% 60%)';
const FILL = 'rgba(22,22,22,0.72)';
const HAIRLINE = 'rgba(255,255,255,0.09)';
const ACTIVE_PLATE = 'rgba(255,255,255,0.12)';
const ICON_ON = '#fafafa';
const ICON_OFF = '#a3a3a3';

// Real backdrop blur on Android needs the Dimezis backend; without it BlurView
// falls back to a flat tint, which would leave the islands looking painted on.
const BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : 'none';

const DESTINATIONS = NAV_DESTINATIONS.slice(0, 4);
const PROFILE = NAV_DESTINATIONS[NAV_DESTINATIONS.length - 1];

/**
 * The bottom navigation: three floating islands in a 1–4–1 rhythm — the current
 * screen's one action on the left, the four destinations in the middle, you on
 * the right (Claude Design "Nav Islands", take 1a Glass).
 *
 * It replaced the top bar outright. Every control that used to live up there is
 * either the left action now (see navActions) or moved onto the page it belongs
 * to, which is why screens no longer render chrome of their own.
 *
 * Absolutely positioned on purpose: the glass is only glass if posters scroll
 * under it. Bodies pad for it with `useNavBarSpace`.
 */
export function NavIslands({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const activeName = state.routes[state.index]?.name ?? 'index';
  const action = useNavAction(activeName);
  const socialAlert = useSocialAlert();

  const periodSheetRef = useRef<BottomSheetModal>(null);
  const setPresentPeriod = useStatsPeriodSheet((s) => s.setPresent);
  useEffect(() => {
    setPresentPeriod(() => periodSheetRef.current?.present());
    return () => setPresentPeriod(null);
  }, [setPresentPeriod]);

  const go = (tabName: string) => {
    const route = state.routes.find((r) => r.name === tabName);
    if (!route) return;
    // Emitted even when the tab is already focused: the layout's tabPress
    // listener is what turns a second press into a reload.
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    const isFocused = state.routes[state.index]?.key === route.key;
    if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
  };

  const profileActive = activeName === PROFILE.tabName;

  return (
    <>
      <View
        style={[styles.bar, { bottom: insets.bottom + NAV_ISLAND_GAP }]}
        // The row spans the screen so the islands can centre in it, but only the
        // islands themselves may swallow taps — the rest is scrolling content.
        pointerEvents="box-none"
      >
        <Island style={styles.round}>
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.roundPress}
          >
            <action.Icon size={19} color={ICON_ON} strokeWidth={2.2} />
            {action.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.badge > 9 ? '9+' : action.badge}</Text>
              </View>
            )}
          </Pressable>
        </Island>

        <Island style={styles.pill}>
          {DESTINATIONS.map((destination) => {
            const active = destination.tabName === activeName;
            return (
              <Pressable
                key={destination.tabName}
                onPress={() => go(destination.tabName)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={destination.label}
                style={[styles.dest, { backgroundColor: active ? ACTIVE_PLATE : 'transparent' }]}
              >
                {destination.icon(active ? ICON_ON : ICON_OFF, 18)}
                {destination.tabName === 'social' && socialAlert && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </Island>

        <Island style={[styles.round, { borderColor: profileActive ? ACCENT : HAIRLINE }]}>
          <Pressable
            onPress={() => go(PROFILE.tabName)}
            accessibilityRole="tab"
            accessibilityState={{ selected: profileActive }}
            accessibilityLabel={PROFILE.label}
            style={styles.roundPress}
          >
            <Avatar profile={profile} size={38} />
          </Pressable>
        </Island>
      </View>

      {/* Mounted by the bar, not by the Stats screen: the nav's left action has
          to reach it from Stats whether or not that screen is the one asking. */}
      <StatsPeriodSheet ref={periodSheetRef} onPicked={() => periodSheetRef.current?.dismiss()} />
    </>
  );
}

/** One glass plate: blurred backdrop, translucent fill, hairline edge. */
function Island({ children, style }: { children: ReactNode; style?: object | object[] }) {
  return (
    <View style={[styles.island, style]}>
      <BlurView
        intensity={38}
        tint="dark"
        experimentalBlurMethod={BLUR_METHOD}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  island: {
    height: NAV_ISLAND_HEIGHT,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: FILL,
    overflow: 'hidden',
  },
  round: { width: NAV_ISLAND_HEIGHT },
  roundPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  dest: { width: 44, height: 38, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 5,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: ACCENT,
    borderWidth: 1.5,
    borderColor: '#161616',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1.5,
    borderColor: '#161616',
  },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
});
