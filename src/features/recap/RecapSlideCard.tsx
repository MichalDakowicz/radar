import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RECAP } from '@/features/recap/recapTheme';

type RecapSlideCardProps = {
  index: number;
  /** Animated position of the deck, in slides. Shared by every card. */
  progress: SharedValue<number>;
  width: number;
  justify?: 'center' | 'space-between';
  /** Leaves room for the player's action button, which floats over the card. */
  reserveAction?: boolean;
  children: ReactNode;
};

/**
 * One card in the push transition. The deck's `progress` is a slide index, so a
 * card's offset is just how far it is from it — the outgoing card slides fully
 * off to the left as the incoming one arrives from the right, which is the
 * directional feel the design picked for swiping (card push, .55s).
 *
 * Each card is opaque: a translucent one would show its neighbour sliding
 * underneath and turn the push into a smear.
 */
export function RecapSlideCard({ index, progress, width, justify = 'center', reserveAction, children }: RecapSlideCardProps) {
  const insets = useSafeAreaInsets();
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (index - progress.value) * width }] }));

  return (
    <Animated.View
      // The whole deck is transparent to touch. On Android a nested View becomes
      // the hit target and the responder search only walks *up*, so any content
      // view left touchable would silently swallow the tap instead of letting the
      // zones underneath advance the story. Slides that need a real button
      // declare an `action` and the player draws it in its own layer above.
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: RECAP.bg,
          // Only the progress bars sit above the content now, so the card starts
          // just under them rather than under a header row.
          paddingTop: insets.top + 34,
          paddingBottom: insets.bottom + 26 + (reserveAction ? 66 : 0),
          paddingHorizontal: 26,
          justifyContent: justify,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
