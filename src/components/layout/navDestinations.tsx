import { type Href } from 'expo-router';
import { BarChart3, CircleUserRound, Compass, LibraryBig, Users } from 'lucide-react-native';
import { type ReactNode } from 'react';

// The five destinations, in bar order. Two consumers read this list and they
// must not drift: the nav islands render it (components/layout/NavIslands) and
// the web digit shortcuts index into it (hooks/useWebShortcuts via the root
// layout). Keep it in sync with the Tabs.Screen order in (tabs)/_layout.tsx.
export type NavDestination = {
  href: Href;
  label: string;
  /** Route name in (tabs) — the key the navigator and `withTabReload` use. */
  tabName: string;
  icon: (color: string, size: number) => ReactNode;
};

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    href: '/',
    label: 'Library',
    tabName: 'index',
    icon: (color, size) => <LibraryBig color={color} size={size} />,
  },
  {
    href: '/browse',
    label: 'Browse',
    tabName: 'browse',
    icon: (color, size) => <Compass color={color} size={size} />,
  },
  {
    href: '/stats',
    label: 'Stats',
    tabName: 'stats',
    icon: (color, size) => <BarChart3 color={color} size={size} />,
  },
  {
    href: '/social',
    label: 'Social',
    tabName: 'social',
    icon: (color, size) => <Users color={color} size={size} />,
  },
  {
    href: '/profile',
    label: 'Profile',
    tabName: 'profile',
    icon: (color, size) => <CircleUserRound color={color} size={size} />,
  },
];
