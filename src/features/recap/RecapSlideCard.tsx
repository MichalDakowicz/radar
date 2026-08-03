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
export function RecapSlideCard({ index, progress, width, justify = 'center', children }: RecapSlideCardProps) {
  const insets = useSafeAreaInsets();
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (index - progress.value) * width }] }));

  return (
    <Animated.View
      // The tap zones sit above the deck and own every touch, so a card never
      // has to compete with them for the gesture.
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: RECAP.bg,
          paddingTop: insets.top + 58,
          paddingBottom: insets.bottom + 26,
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
