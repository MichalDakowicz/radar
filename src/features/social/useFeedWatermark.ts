import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useSocialWatermark } from '@/store/socialWatermark';

/**
 * The "since your last visit" line the rail counts against.
 *
 * Frozen for as long as you are on the screen: reading the live store would
 * clear every ring the instant the tab painted, which is exactly when you are
 * looking at them. The marker moves forward on blur instead.
 */
export function useFeedWatermark() {
  const markSeen = useSocialWatermark((state) => state.markSeen);
  // Read once, off the store's initial value — a subscription here would
  // re-render (and un-freeze) the moment the blur handler writes.
  const [since] = useState(() => useSocialWatermark.getState().lastSeenAt);
  const visitedAt = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Stamped on focus rather than on blur so activity that lands *while* you
      // are reading still counts as new next time — you never actually saw it.
      visitedAt.current = new Date().toISOString();
      return () => {
        if (visitedAt.current) markSeen(visitedAt.current);
      };
    }, [markSeen]),
  );

  return since;
}
