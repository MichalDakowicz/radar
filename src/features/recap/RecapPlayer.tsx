import { Share2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecapProgressBars } from '@/features/recap/RecapProgressBars';
import { RecapSlideCard } from '@/features/recap/RecapSlideCard';
import { PUSH_EASING, PUSH_MS, RECAP } from '@/features/recap/recapTheme';
import type { RecapSlide } from '@/features/recap/slideTypes';

/** Drag distance, in px, that counts as "put this away". */
const DISMISS_DISTANCE = 130;
/** Horizontal travel that counts as a swipe between pages. */
const SWIPE_DISTANCE = 55;

type RecapPlayerProps = {
  slides: RecapSlide[];
  onClose: () => void;
  /** True while something is open over the player, which has to hold the clock. */
  paused?: boolean;
};

/**
 * The story player both recaps run on: a deck of pushed cards with segmented
 * progress bars. Tap right to advance, left to go back, hold to pause, swipe
 * sideways to page, drag down to put it away. No header and no close button —
 * the bars say where you are and the gesture says how to leave, and a story is
 * the one screen that can afford to be nothing but its content.
 *
 * Touch layering, the only subtle part: the tap zones are rendered *under* the
 * cards and the cards are `pointerEvents="none"`, so every pixel of content
 * falls through to the zones while the one real button per page — declared as a
 * slide `action` and drawn above — still gets its own taps.
 */
export function RecapPlayer({ slides, onClose, paused = false }: RecapPlayerProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  // Autoplay stops the moment someone goes back and stays stopped until they ask
  // to move on again: going back means they want to read the page, and having it
  // slide away five seconds later is the player arguing with them.
  const [autoplay, setAutoplay] = useState(true);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(index, { duration: PUSH_MS, easing: Easing.bezier(...PUSH_EASING) });
  }, [index, progress]);

  const next = useCallback(() => {
    setAutoplay(true);
    // Past the last page the story is over — closing is what the reader wants,
    // rather than a loop back to page one.
    if (index < slides.length - 1) setIndex(index + 1);
    else onClose();
  }, [index, slides.length, onClose]);

  const previous = useCallback(() => {
    setAutoplay(false);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  // A right swipe means "back" in the Android sense: back a page, or out of the
  // story when there is no page behind. The left tap zone deliberately does not
  // do this — a mistimed tap should not close the player.
  const swipeBack = useCallback(() => {
    if (index > 0) previous();
    else onClose();
  }, [index, previous, onClose]);

  const action = slides[index]?.action;

  // minDistance keeps taps out of the pan's way: a press has to travel before it
  // is treated as a drag, so tap-to-advance and hold-to-pause still work.
  const pan = Gesture.Pan()
    .minDistance(14)
    .onUpdate((event) => {
      // Downward only, and only while the drag is more vertical than horizontal —
      // paging sideways must not drag the deck off the bottom of the screen.
      dragY.value = event.translationY > 0 && event.translationY > Math.abs(event.translationX) ? event.translationY : 0;
    })
    .onEnd((event) => {
      const vertical = event.translationY > Math.abs(event.translationX);
      if (vertical && (event.translationY > DISMISS_DISTANCE || event.velocityY > 1000)) {
        runOnJS(onClose)();
        return;
      }
      if (!vertical && Math.abs(event.translationX) > SWIPE_DISTANCE) {
        runOnJS(event.translationX < 0 ? next : swipeBack)();
      }
      dragY.value = withTiming(0, { duration: 200 });
    });

  const shell = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }, { scale: 1 - Math.min(dragY.value / 2600, 0.06) }],
    borderRadius: Math.min(dragY.value / 4, 28),
  }));

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1" style={{ backgroundColor: '#000' }}>
        <Animated.View className="flex-1 overflow-hidden" style={[{ backgroundColor: RECAP.bg }, shell]}>
          <View className="absolute inset-0 flex-row">
            <Pressable
              className="w-[32%]"
              onPress={previous}
              onPressIn={() => setHeld(true)}
              onPressOut={() => setHeld(false)}
              accessibilityRole="button"
              accessibilityLabel="Previous page"
            />
            <Pressable
              className="flex-1"
              onPress={next}
              onPressIn={() => setHeld(true)}
              onPressOut={() => setHeld(false)}
              accessibilityRole="button"
              accessibilityLabel="Next page"
            />
          </View>

          {slides.map((slide, i) => (
            <RecapSlideCard
              key={i}
              index={i}
              progress={progress}
              width={width}
              justify={slide.justify}
              reserveAction={!!slide.action}
            >
              {slide.content}
            </RecapSlideCard>
          ))}

          {action && (
            <Pressable
              onPress={action.onPress}
              className="absolute left-[26px] right-[26px] h-[52px] flex-row items-center justify-center gap-2.5 rounded-full active:opacity-80"
              style={{ bottom: insets.bottom + 26, backgroundColor: RECAP.ink }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Share2 size={16} color="#0a0a0a" strokeWidth={2.4} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0a0a0a' }}>{action.label}</Text>
            </Pressable>
          )}

          <View pointerEvents="none" className="absolute left-0 right-0 top-0 px-4" style={{ paddingTop: insets.top + 12 }}>
            <RecapProgressBars
              key={index}
              count={slides.length}
              index={index}
              paused={held || paused || !autoplay}
              onAdvance={next}
            />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
