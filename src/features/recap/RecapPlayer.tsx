import { X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecapProgressBars } from '@/features/recap/RecapProgressBars';
import { RecapSlideCard } from '@/features/recap/RecapSlideCard';
import { RecapBrandMark } from '@/features/recap/parts/RecapBrandMark';
import { MONO, PUSH_EASING, PUSH_MS, RECAP } from '@/features/recap/recapTheme';
import type { RecapSlide } from '@/features/recap/slideTypes';

type RecapPlayerProps = {
  slides: RecapSlide[];
  /** "Radar Recap" for the monthly, "Annual Report" for the yearly. */
  title: string;
  /** Right-hand stamp, per slide — "JUL 2026" or "PAGE 03 / 09". */
  stamp: (index: number) => string;
  onClose: () => void;
  /** True while a sheet is open over the player, which has to hold the clock. */
  paused?: boolean;
};

/**
 * The story player both recaps run on: a deck of pushed cards, segmented
 * progress bars, tap right to advance and left to go back, hold to pause.
 *
 * Touch layering, which is the only subtle part: the tap zones are rendered
 * *under* the cards and the cards are `box-none`, so a slide's own button (share,
 * open a title) wins the touch while every other pixel falls through to the
 * zones. Rendering the zones on top instead would eat those buttons.
 */
export function RecapPlayer({ slides, title, stamp, onClose, paused = false }: RecapPlayerProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(index, { duration: PUSH_MS, easing: Easing.bezier(...PUSH_EASING) });
  }, [index, progress]);

  const next = useCallback(() => {
    // Past the last page the story is over — closing is what the reader wants,
    // rather than the design canvas's loop back to page one.
    if (index < slides.length - 1) setIndex(index + 1);
    else onClose();
  }, [index, slides.length, onClose]);

  const previous = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  return (
    <View className="flex-1 overflow-hidden" style={{ backgroundColor: RECAP.bg }}>
      <View className="absolute inset-0 flex-row">
        <Pressable
          className="w-[32%]"
          onPress={previous}
          onPressIn={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          accessibilityRole="button"
          accessibilityLabel="Previous slide"
        />
        <Pressable
          className="flex-1"
          onPress={next}
          onPressIn={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          accessibilityRole="button"
          accessibilityLabel="Next slide"
        />
      </View>

      {slides.map((slide, i) => (
        <RecapSlideCard key={i} index={i} progress={progress} width={width} justify={slide.justify}>
          {slide.content}
        </RecapSlideCard>
      ))}

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0 gap-[11px] px-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        <RecapProgressBars key={index} count={slides.length} index={index} paused={held || paused} onAdvance={next} />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <RecapBrandMark />
            <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: -0.1, color: RECAP.ink }}>{title}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text style={{ fontFamily: MONO, fontSize: 10, fontWeight: '600', letterSpacing: 0.6, color: 'rgba(255,255,255,.5)' }}>
              {stamp(index)}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
              style={{ backgroundColor: 'rgba(255,255,255,.08)' }}
              accessibilityRole="button"
              accessibilityLabel="Close recap"
            >
              <X size={16} color={RECAP.muted} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
