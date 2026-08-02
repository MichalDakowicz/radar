import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { NavDestination } from '@/components/layout/navDestinations';

const ACCENT = 'hsl(217 91% 60%)';
const ACTIVE_PLATE = 'rgba(255,255,255,0.12)';
const ICON_ON = '#fafafa';
const ICON_OFF = '#a3a3a3';
const ICON_SIZE = 20;

// Long enough to read as a move, short enough not to lag the screen transition
// underneath it (Tabs uses `shift`, which is in the same ballpark).
const DURATION = 200;

type NavDestinationButtonProps = {
  destination: NavDestination;
  active: boolean;
  /** Unread marker in the corner — Social wears it when requests are waiting. */
  alert?: boolean;
  onPress: () => void;
};

/**
 * One destination in the centre island. The active plate and the glyph
 * cross-fade rather than snapping: the plate is the only thing marking where you
 * are, so it should look like it slid there with you.
 *
 * Two copies of the glyph is the cheap way to tween a stroke colour — lucide
 * takes `color` as a plain prop, which Reanimated cannot drive.
 */
export function NavDestinationButton({ destination, active, alert, onPress }: NavDestinationButtonProps) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: DURATION });
  }, [active, progress]);

  const plateStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0)', ACTIVE_PLATE]),
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const litStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={destination.label}
      style={styles.button}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.plate, plateStyle]} pointerEvents="none" />
      <Animated.View style={dimStyle}>{destination.icon(ICON_OFF, ICON_SIZE)}</Animated.View>
      <Animated.View style={[styles.overlay, litStyle]} pointerEvents="none">
        {destination.icon(ICON_ON, ICON_SIZE)}
      </Animated.View>
      {alert && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 46, height: 42, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  plate: { borderRadius: 99 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: ACCENT,
    borderWidth: 1.5,
    borderColor: '#161616',
  },
});
