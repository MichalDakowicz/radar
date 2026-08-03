import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { SLIDE_SECONDS } from '@/features/recap/recapTheme';

const TICK_MS = 80;

type RecapProgressBarsProps = {
  count: number;
  index: number;
  /** True while a finger is held down or a sheet is open. */
  paused: boolean;
  /** Called once the current segment fills. Not called on the last slide. */
  onAdvance: () => void;
};

/**
 * The story bars, and the clock that drives autoplay. The ticker lives here
 * rather than in the player so a 12fps fill does not re-render the deck — the
 * yearly heatmap alone is 370-odd views, and redrawing it twelve times a second
 * is exactly the jank the recap cannot afford.
 *
 * Mounted with `key={index}` by the player, so each slide gets a fresh instance
 * and the fill starts at zero without an effect having to reset it.
 */
export function RecapProgressBars({ count, index, paused, onAdvance }: RecapProgressBarsProps) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    // The last slide holds: the story is over, and advancing off the end would
    // close the player without the reader asking.
    if (paused || index >= count - 1) return;
    const step = TICK_MS / (SLIDE_SECONDS * 1000);
    const timer = setInterval(() => {
      setFill((current) => {
        const next = current + step;
        if (next >= 1) {
          onAdvance();
          return 1;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, index, count, onAdvance]);

  return (
    <View className="flex-row gap-1">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="h-[2.5px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,.24)' }}>
          <View
            className="h-full rounded-full"
            style={{
              backgroundColor: '#fafafa',
              width: `${i < index ? 100 : i === index ? Math.min(100, fill * 100) : 0}%`,
            }}
          />
        </View>
      ))}
    </View>
  );
}
