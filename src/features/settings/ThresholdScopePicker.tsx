import { Pressable, Text, View } from 'react-native';

import type { ThresholdScope } from '@/lib/streakThresholds';

const OPTIONS: { scope: ThresholdScope; title: string; detail: string }[] = [
  { scope: 'from-now', title: 'From now on', detail: 'Earlier weeks keep the number they were measured against' },
  { scope: 'whole-history', title: 'Whole history', detail: 'Every week, past ones too, uses the new number — streaks can change' },
];

type ThresholdScopePickerProps = {
  value: ThresholdScope;
  onChange: (scope: ThresholdScope) => void;
};

/** How far a threshold change reaches back. Two segmented options, "from now on" first. */
export function ThresholdScopePicker({ value, onChange }: ThresholdScopePickerProps) {
  return (
    <View className="gap-2">
      {OPTIONS.map((option) => {
        const active = option.scope === value;
        return (
          <Pressable
            key={option.scope}
            onPress={() => onChange(option.scope)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.title}
            className={`gap-0.5 rounded-xl border px-3.5 py-3 active:opacity-70 ${
              active ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <Text className={`text-[14.5px] ${active ? 'font-semibold text-primary' : 'text-foreground'}`}>
              {option.title}
            </Text>
            <Text className="text-xs text-muted-foreground">{option.detail}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
