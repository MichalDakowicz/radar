import { Text, View } from 'react-native';

import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { leading, RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearTotalsSlideProps = { recap: YearlyRecap };

/** Page one of the report: the four numbers, then the movie/TV split. */
export function YearTotalsSlide({ recap }: YearTotalsSlideProps) {
  const { movie, tv } = recap.typeCounts;

  return (
    <View className="gap-6">
      <View>
        <View className="mb-4">
          <SlideLabel>01 — THE TOTALS</SlideLabel>
        </View>
        <View className="flex-row flex-wrap" style={{ rowGap: 24, columnGap: 18 }}>
          <Total label="Titles finished" value={String(recap.titles)} />
          <Total label="Hours watched" value={String(recap.hours)} />
          <Total label="Active days" value={String(recap.activeDays)} />
          <Total label="Average rating" value={recap.avgRating} suffix="/5" />
        </View>
      </View>

      <View>
        <View className="mb-3 flex-row" style={{ gap: 30 }}>
          <Split label="Movies" count={movie} color={RECAP.movie} />
          <Split label="TV seasons" count={tv} color={RECAP.tv} valueColor={RECAP.tvSoft} />
        </View>
        <View className="h-2.5 flex-row" style={{ gap: 4 }}>
          <View style={{ flexGrow: recap.moviePercent || 1, borderRadius: 99, backgroundColor: RECAP.movie }} />
          <View style={{ flexGrow: 100 - recap.moviePercent || 1, borderRadius: 99, backgroundColor: RECAP.tv }} />
        </View>
        <Text className="mt-3.5" style={{ fontSize: 12.5, lineHeight: 19, color: RECAP.muted }}>
          {inPerspective(recap.hours)}
        </Text>
      </View>
    </View>
  );
}

/** "412 hours is 17 days and 4 hours." — computed, not written. */
function inPerspective(hours: number): string {
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  const percent = ((hours / (365 * 24)) * 100).toFixed(1).replace(/\.0$/, '');
  if (days === 0) return `${hours} hours, all told. Less than a day of the year, facing a screen on purpose.`;
  return `${hours} hours is ${days} days and ${rest} hours. ${percent}% of your year, spent facing a screen on purpose.`;
}

function Total({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View className="gap-1.5" style={{ width: '47%' }}>
      <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: RECAP.muted }}>
        {label}
      </Text>
      <Text style={{ fontSize: 38, lineHeight: leading(38, 40), fontWeight: '700', letterSpacing: -1.1, color: RECAP.ink }}>
        {value}
        {suffix && <Text style={{ fontSize: 17, fontWeight: '500', color: RECAP.muted }}>{suffix}</Text>}
      </Text>
    </View>
  );
}

function Split({ label, count, color, valueColor }: { label: string; count: number; color: string; valueColor?: string }) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: color }} />
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: RECAP.muted }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 34, lineHeight: leading(34, 36), fontWeight: '300', letterSpacing: -0.7, color: valueColor ?? RECAP.ink }}>
        {count}
      </Text>
    </View>
  );
}
