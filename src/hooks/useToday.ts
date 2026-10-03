import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { msUntilNextDay } from '@/lib/dayRollover';
import { dateKey } from '@/lib/stats';

/**
 * The local calendar day as `YYYY-MM-DD`, re-read when midnight passes and when
 * the app comes back to the foreground. Anything computed "as of today" - the
 * streak above all - depends on it, so a screen left open overnight, or an app
 * that was backgrounded across midnight, moves on without a watch to nudge it.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(sync, msUntilNextDay(new Date()));
    };
    function sync() {
      setToday(dateKey(new Date()));
      arm();
    }

    arm();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
