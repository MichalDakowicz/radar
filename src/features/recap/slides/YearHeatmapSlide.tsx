import { Text, View } from 'react-native';

import { RecapHeatmap } from '@/features/recap/parts/RecapHeatmap';
import { SlideBody } from '@/features/recap/parts/SlideBody';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearHeatmapSlideProps = { recap: YearlyRecap };

/** The year as 365 squares, with the run that stands out named underneath. */
export function YearHeatmapSlide({ recap }: YearHeatmapSlideProps) {
  const { streakRange, longestStreak } = recap;

  return (
    <View className="gap-5">
      <View>
        <View className="mb-3.5">
          <SlideLabel>02 — THE YEAR, DAY BY DAY</SlideLabel>
        </View>
        <SlideHeadline>{longestStreak > 1 ? `${longestStreak} days\nin a row.` : 'One day\nat a time.'}</SlideHeadline>
        <View className="mt-2.5">
          <SlideBody>
            {streakRange
              ? `Your longest streak ran ${streakRange.from} to ${streakRange.to}.`
              : 'No two days back to back. You watch when you feel like it.'}
          </SlideBody>
        </View>
      </View>

      <RecapHeatmap weeks={recap.weeks} />

      <View className="flex-row gap-2.5">
        {recap.busiestMonth && <MonthCard label="Busiest month" name={recap.busiestMonth.name} count={recap.busiestMonth.count} />}
        {recap.quietestMonth && <MonthCard label="Quietest" name={recap.quietestMonth.name} count={recap.quietestMonth.count} />}
      </View>
    </View>
  );
}

function MonthCard({ label, name, count }: { label: string; name: string; count: number }) {
  return (
    <View className="flex-1 rounded-xl px-3 py-3" style={{ borderWidth: 1, borderColor: RECAP.line }}>
      <Text
        className="mb-1.5"
        style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase', color: RECAP.muted }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: RECAP.ink }}>{name}</Text>
      <Text className="mt-1" style={{ fontSize: 11, color: RECAP.muted }}>
        {count} {count === 1 ? 'title' : 'titles'}
      </Text>
    </View>
  );
}
