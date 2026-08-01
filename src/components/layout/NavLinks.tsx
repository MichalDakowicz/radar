import { usePathname, useRouter, type Href } from 'expo-router';
import { BarChart3, CircleUserRound, Compass, LibraryBig, Users } from 'lucide-react-native';
import { useCallback, useRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import { useTabReload } from '@/store/tabReload';

const ACTIVE = 'hsl(0 0% 98%)';
const INACTIVE = 'hsl(0 0% 63.9%)';

// Same destinations as the bottom tabs, in the same order - the digit shortcuts
// in useWebShortcuts index into this list, so keep it in sync with the
// Tabs.Screen order in (tabs)/_layout.tsx.
type NavDestination = {
  href: Href;
  label: string;
  /** Route name in (tabs) - the key `withTabReload` reloads by. */
  tabName: string;
  icon: (color: string) => ReactNode;
  isActive: (pathname: string) => boolean;
};

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    href: '/',
    label: 'Library',
    tabName: 'index',
    icon: (color) => <LibraryBig color={color} size={18} />,
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/browse',
    label: 'Browse',
    tabName: 'browse',
    icon: (color) => <Compass color={color} size={18} />,
    isActive: (pathname) => pathname.startsWith('/browse'),
  },
  {
    href: '/stats',
    label: 'Stats',
    tabName: 'stats',
    icon: (color) => <BarChart3 color={color} size={18} />,
    isActive: (pathname) => pathname.startsWith('/stats'),
  },
  {
    href: '/social',
    label: 'Social',
    tabName: 'social',
    icon: (color) => <Users color={color} size={18} />,
    // /friend/* (a friend's shelf, compare, watch together) and /friend-requests
    // are pushed from this tab, so the link stays lit while you are down there.
    isActive: (pathname) => pathname.startsWith('/social') || pathname.startsWith('/friend'),
  },
  {
    href: '/profile',
    label: 'Profile',
    tabName: 'profile',
    icon: (color) => <CircleUserRound color={color} size={18} />,
    // /settings is pushed from the gear up here, so the link stays lit there.
    isActive: (pathname) => pathname.startsWith('/profile') || pathname.startsWith('/settings'),
  },
];

// Mirrors the bottom tab bar's double-press-to-reload window.
const DOUBLE_PRESS_MS = 400;

/**
 * The desktop-web destination row that lives in the top bar (ported from legacy
 * Navbar.jsx's right-hand nav links). Route-driven rather than wired into the
 * tab navigator, because the bar is rendered per screen by Header rather than by
 * the navigator itself.
 */
export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const bump = useTabReload((s) => s.bump);
  const lastPress = useRef<{ href: string; time: number } | null>(null);

  const go = useCallback(
    (destination: NavDestination) => {
      const key = String(destination.href);
      const now = Date.now();
      const previous = lastPress.current;
      lastPress.current = { href: key, time: now };
      // Second click on the same destination inside the window reloads it, same
      // contract as double-pressing a tab (and as legacy's resetPage on the
      // already-active link).
      if (previous?.href === key && now - previous.time < DOUBLE_PRESS_MS) bump(destination.tabName);
      router.navigate(destination.href);
    },
    [bump, router],
  );

  return (
    <View className="flex-row items-center gap-1">
      {NAV_DESTINATIONS.map((destination, index) => {
        const active = destination.isActive(pathname);
        // Profile sits after a divider, where Settings used to - it's you, not
        // one of the content destinations.
        const isLast = index === NAV_DESTINATIONS.length - 1;
        return (
          <View key={destination.label} className="flex-row items-center">
            {isLast && <View className="mx-2 h-6 w-px bg-border" />}
            <NavLink
              label={destination.label}
              shortcut={String(index + 1)}
              active={active}
              icon={destination.icon(active ? ACTIVE : INACTIVE)}
              onPress={() => go(destination)}
            />
          </View>
        );
      })}
    </View>
  );
}

function NavLink({
  label,
  shortcut,
  icon,
  active,
  onPress,
}: {
  label: string;
  shortcut: string;
  icon: ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      {...bind}
      onPress={onPress}
      accessibilityRole="link"
      // The digit shortcut rides along in the a11y name rather than taking up bar
      // width the way it did in the sidebar.
      accessibilityLabel={`${label} (${shortcut})`}
      style={[
        { backgroundColor: active ? 'hsl(0 0% 100% / 0.09)' : hovered ? 'hsl(0 0% 100% / 0.05)' : 'transparent' },
        webTransition('background-color'),
      ]}
      className="h-9 flex-row items-center gap-2 rounded-md px-3"
    >
      {icon}
      <Text className={active ? 'text-sm font-semibold text-foreground' : 'text-sm font-medium text-muted-foreground'}>{label}</Text>
    </Pressable>
  );
}
