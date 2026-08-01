import { useCallback, useEffect, useRef, useState } from 'react';

import { frameDelayMs } from '@/lib/randomPick';

/** Short enough to feel like a flourish rather than a loading state. */
const FRAMES = 14;

/**
 * "Pick one for tonight" — cycles the highlight through the shared list and
 * decelerates onto a winner, reusing the Library reel's easing so the two
 * random pickers feel like the same gesture.
 */
export function useTonightPick(keys: string[], rand: () => number = Math.random) {
  const [picked, setChosen] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // Validated on read rather than synced in an effect: a list that changed
  // under a spin (a watchlist edit landing mid-animation) would otherwise leave
  // the highlight pointing at a row that is no longer there.
  const chosen = picked && keys.includes(picked) ? picked : null;

  const spin = useCallback(
    (onDone?: (key: string) => void) => {
      if (keys.length === 0 || spinning) return;
      stop();
      setSpinning(true);

      const winner = keys[Math.min(keys.length - 1, Math.floor(rand() * keys.length))];
      let frame = 0;

      const step = () => {
        if (frame >= FRAMES - 1) {
          setChosen(winner);
          setSpinning(false);
          timer.current = null;
          onDone?.(winner);
          return;
        }
        setChosen(keys[frame % keys.length]);
        frame += 1;
        timer.current = setTimeout(step, frameDelayMs(frame, FRAMES));
      };

      step();
    },
    [keys, spinning, rand, stop],
  );

  return { chosen, spinning, spin };
}
