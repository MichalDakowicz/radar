import { CalendarRange, ChevronDown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { periodShortLabel, type StatsPeriodId } from '@/lib/statsPeriod';

/**
 * The window the numbers below are for. Doubles as the on-screen way into the
 * picker — the nav bar's left action opens the same sheet, but nothing on the
 * page would otherwise say which period you are reading.
 */
export function StatsPeriodPill({ period, onPress }: { period: StatsPeriodId; onPress: () => void }) {
  return (
    <View className="flex-row px-4 pt-4">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Time period: ${periodShortLabel(period)}. Change it`}
        className="min-h-[36px] flex-row items-center gap-2 rounded-full border border-border bg-secondary/60 pl-3 pr-2.5 active:opacity-70"
      >
        <CalendarRange size={14} color="hsl(0 0% 63.9%)" />
        <Text className="text-[12.5px] font-semibold text-foreground">{periodShortLabel(period)}</Text>
        <ChevronDown size={14} color="hsl(0 0% 63.9%)" />
      </Pressable>
    </View>
  );
}
