import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { notificationHref } from '@/lib/notificationRouting';
import { supabase } from '@/lib/supabase';
import type { NotificationData } from '@/types/notification';

/**
 * Tapping a banner takes you to what it was about.
 *
 * useLastNotificationResponse rather than an event listener, because the two
 * cases are not the same event: a warm tap fires a listener, a cold start does
 * not — the response is already waiting by the time any JS runs. This hook
 * covers both, and remembers what it has already acted on so a re-render does
 * not navigate a second time.
 */
export function useNotificationTaps(enabled: boolean) {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  // The root navigator has no key until it has mounted; pushing before then is
  // dropped, which on a cold start is exactly when the tap arrives.
  const navigationReady = !!useRootNavigationState()?.key;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !navigationReady || !response) return;

    const request = response.notification.request;
    if (handled.current === request.identifier) return;

    const data = request.content.data as (NotificationData & { kind?: string }) | null | undefined;
    // No kind means it is not one of ours to route — the metadata sweep's
    // progress row and its Stop action both land here too.
    if (!data?.kind) return;
    handled.current = request.identifier;

    // A tapped banner has been seen, whatever happens next. Fire-and-forget:
    // the realtime subscription on notifications repaints the badge, and a
    // failure here should not swallow the navigation.
    if (data.notificationId) {
      void supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', data.notificationId)
        .is('read_at', null);
    }

    const href = notificationHref({ kind: data.kind, data });
    if (href) router.push(href as Href);
  }, [enabled, navigationReady, response, router]);
}
