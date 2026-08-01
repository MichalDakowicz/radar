import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { TasteComparison } from '@/lib/compareTaste';

type CompareSummaryProps = { comparison: TasteComparison; headline: string; subtitle: string };

const SIZE = 84;
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The overlap ring and the sentence that explains what the number means. */
export function CompareSummary({ comparison, headline, subtitle }: CompareSummaryProps) {
  const filled = (comparison.overlapPct / 100) * CIRCUMFERENCE;

  return (
    <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-primary/5 p-4">
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="hsl(0 0% 16%)" strokeWidth={7} />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(217 91% 60%)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-[21px] font-bold tracking-tight text-foreground">{comparison.overlapPct}%</Text>
        </View>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-bold text-foreground">{headline}</Text>
        <Text className="mt-1 text-xs leading-[18px] text-muted-foreground">{subtitle}</Text>
      </View>
    </View>
  );
}
