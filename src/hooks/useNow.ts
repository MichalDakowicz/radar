import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time as state, so a memo can depend on it instead of calling
 * Date.now() during render. Re-read when the app returns to the foreground,
 * which is when a screen left open overnight is next looked at.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);

  return now;
}
