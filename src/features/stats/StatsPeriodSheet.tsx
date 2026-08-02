import { Check } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BottomSheetModal, Sheet } from '@/components/ui/Sheet';
import { STATS_PERIODS, type StatsPeriodId } from '@/lib/statsPeriod';
import { useStatsPeriod } from '@/store/statsPeriod';

// Rough content height: a title block plus one 52pt row per period. Passed to
// the sheet so it shrinks to fit instead of opening half empty.
const CONTENT_HEIGHT = 78 + STATS_PERIODS.length * 56;

type StatsPeriodSheetProps = {
  /** Fired after a pick so the caller can close itself. */
  onPicked?: (period: StatsPeriodId) => void;
};

/**
 * Which window the Stats screen reads. Mounted once by the nav bar and opened
 * from the nav's left action on Stats — the only way in, so the page itself
 * stays all stats.
 */
export const StatsPeriodSheet = forwardRef<BottomSheetModal, StatsPeriodSheetProps>(function StatsPeriodSheet(
  { onPicked },
  ref,
) {
  const period = useStatsPeriod((s) => s.period);
  const setPeriod = useStatsPeriod((s) => s.setPeriod);

  return (
    <Sheet ref={ref} snapPoints={['60%']} contentHeight={CONTENT_HEIGHT} maxWidth={420}>
      <View className="gap-1 px-4 pb-6">
        <Text className="px-1 pb-2 text-lg font-bold tracking-tight text-foreground">Time period</Text>
        <Text className="px-1 pb-3 text-[12.5px] leading-[1.5] text-muted-foreground">
          Narrows every stat to what you watched in the window.
        </Text>

        {STATS_PERIODS.map((option) => {
          const active = option.id === period;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                setPeriod(option.id);
                onPicked?.(option.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className="min-h-[48px] flex-row items-center justify-between rounded-xl border px-3.5 active:opacity-70"
              style={{
                borderColor: active ? 'hsl(217 91% 60%)' : 'hsl(0 0% 14.9%)',
                backgroundColor: active ? 'hsla(217,91%,60%,0.12)' : 'transparent',
              }}
            >
              <Text className={`text-[14.5px] ${active ? 'font-semibold text-primary' : 'text-foreground'}`}>
                {option.label}
              </Text>
              {active && <Check size={17} color="hsl(217 91% 60%)" />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
});
