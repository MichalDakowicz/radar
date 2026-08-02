import { useRouter } from 'expo-router';
import { CalendarRange, Inbox, Plus, Search, Settings, type LucideIcon } from 'lucide-react-native';
import { useCallback } from 'react';

import { useIncomingRequestCount } from '@/hooks/useFriends';
import { periodShortLabel } from '@/lib/statsPeriod';
import { useQuickAddSheetStore } from '@/store/quickAddSheet';
import { useSearchFocus } from '@/store/searchFocus';
import { useStatsPeriod, useStatsPeriodSheet } from '@/store/statsPeriod';

export type NavAction = {
  label: string;
  Icon: LucideIcon;
  /** Unread count on the button, 0 for none. */
  badge: number;
  onPress: () => void;
};

const ICONS: Record<string, LucideIcon> = {
  index: Plus,
  browse: Search,
  stats: CalendarRange,
  social: Inbox,
  profile: Settings,
};

/**
 * The one thing the current screen wants you to do, resolved for the nav bar's
 * left island. This is what replaced the top bar: each screen used to hang its
 * own controls off a global header, and now the bar asks for the single action
 * that screen is about.
 *
 * Wiring lives here rather than in the screens because four of the five targets
 * are already global — the Quick-Add sheet, the focused screen's search input,
 * the period sheet the nav itself mounts, and two pushed routes.
 */
export function useNavAction(tabName: string): NavAction {
  const router = useRouter();
  const presentQuickAdd = useQuickAddSheetStore((s) => s.present);
  const presentPeriod = useStatsPeriodSheet((s) => s.present);
  const period = useStatsPeriod((s) => s.period);
  const requestCount = useIncomingRequestCount();

  const onPress = useCallback(() => {
    switch (tabName) {
      case 'index':
        return presentQuickAdd?.();
      case 'browse':
        return useSearchFocus.getState().focus?.();
      case 'stats':
        return presentPeriod?.();
      case 'social':
        return router.push('/friend-requests');
      case 'profile':
        return router.push('/settings');
    }
  }, [tabName, presentQuickAdd, presentPeriod, router]);

  const labels: Record<string, string> = {
    index: 'Add a title',
    browse: 'Search',
    stats: `Time period: ${periodShortLabel(period)}`,
    social: requestCount ? `Friend requests, ${requestCount} pending` : 'Friend requests',
    profile: 'Settings',
  };

  return {
    label: labels[tabName] ?? 'Add a title',
    Icon: ICONS[tabName] ?? Plus,
    badge: tabName === 'social' ? requestCount : 0,
    onPress,
  };
}

/** Pending friend requests — the dot the Social destination wears from any tab. */
export function useSocialAlert(): boolean {
  return useIncomingRequestCount() > 0;
}
