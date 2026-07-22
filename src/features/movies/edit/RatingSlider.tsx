import { useRef } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

type RatingSliderProps = {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  max?: number;
};

// Tap-to-set rating bar (doc 03 `RatingSlider`) - legacy used a drag range
// input; RN has no native range input, so this is 10 discrete tap targets at
// the same 0.5 step. Tapping the current value clears the rating.
export function RatingSlider({ value, onChange, step = 0.5, max = 5 }: RatingSliderProps) {
  const stepCount = Math.round(max / step);
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <View className="gap-2">
      <View className="flex-row gap-1">
        {Array.from({ length: stepCount }, (_, i) => (i + 1) * step).map((s) => (
          <Pressable key={s} onPress={() => onChange(s === value ? 0 : s)} className="h-8 flex-1 items-center justify-center">
            <View className="h-1.5 w-full rounded-full" style={{ backgroundColor: value >= s ? 'hsl(217 91% 60%)' : 'hsl(0 0% 22%)' }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Continuous drag slider for the overall score (0.1 steps) - the tick-line
// above reads great at coarse 0.5 steps but can't express 0.1 without 50
// tap targets, so overall gets a real drag track (PanResponder, page-relative
// via measure() so it tracks correctly inside scrolling parents).
export function RatingSliderPrecise({ value, onChange, step = 0.1, max = 5 }: RatingSliderProps) {
  const trackRef = useRef<View>(null);
  const layout = useRef({ pageX: 0, width: 0 });

  const setFromPageX = (pageX: number) => {
    const { pageX: trackX, width } = layout.current;
    if (width <= 0) return;
    const pct = Math.max(0, Math.min(1, (pageX - trackX) / width));
    const stepped = Math.round((pct * max) / step) * step;
    onChange(Math.max(0, Math.min(max, Number(stepped.toFixed(2)))));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackRef.current?.measure((_x, _y, width, _height, pageX) => {
          layout.current = { pageX, width };
          setFromPageX(evt.nativeEvent.pageX);
        });
      },
      onPanResponderMove: (evt) => setFromPageX(evt.nativeEvent.pageX),
    }),
  ).current;

  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <View className="px-3">
      <View
        ref={trackRef}
        {...responder.panHandlers}
        className="h-8 w-full justify-center"
        onLayout={() => trackRef.current?.measure((_x, _y, width, _height, pageX) => (layout.current = { pageX, width }))}
      >
        <View className="h-2 overflow-hidden rounded-full bg-secondary">
          <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </View>
        <View
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-white"
          style={{ left: `${percent}%`, marginLeft: -10 }}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

export function RatingValue({ value }: { value: number }) {
  return <Text className="text-sm font-semibold text-foreground">{value > 0 ? value.toFixed(1) : '0.0'} / 5</Text>;
}
