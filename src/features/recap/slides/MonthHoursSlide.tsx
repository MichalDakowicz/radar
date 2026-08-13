import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { leading, MONO, RECAP } from '@/features/recap/recapTheme';
import { ratioOf, type MonthlyRecap } from '@/lib/recap';

type MonthHoursSlideProps = { recap: MonthlyRecap };

/** How long a day and a half really is, plus the month before for scale. */
export function MonthHoursSlide({ recap }: MonthHoursSlideProps) {
  const { previous, deltaPercent } = recap;
  const peak = Math.max(recap.hours, previous?.hours ?? 0);
  const up = (deltaPercent ?? 0) >= 0;
  const accent = up ? RECAP.up : '#f87171';

  return (
    <View className="gap-7">
      <View>
        <Text style={{ fontSize: 20, lineHeight: 27, fontWeight: '500', color: RECAP.muted }}>
          You gave {recap.display.charAt(0) + recap.display.slice(1).toLowerCase()}
        </Text>
        <View className="mt-0.5 flex-row items-baseline gap-2">
          <Text
            style={{
              fontSize: 100,
              lineHeight: leading(100, 92),
              fontWeight: '700',
              letterSpacing: -5,
              color: RECAP.ink,
            }}
          >
            {recap.hours}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '600', color: RECAP.muted }}>hrs</Text>
        </View>
        <Text className="mt-1.5" style={{ fontSize: 20, lineHeight: 27, fontWeight: '500', color: RECAP.muted }}>
          {hoursInWords(recap.hours)}
        </Text>
      </View>

      {previous && deltaPercent != null && (
        <View className="gap-3.5">
          <View
            className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5"
            style={{ borderWidth: 1, borderColor: `${accent}73`, backgroundColor: `${accent}24` }}
          >
            {up ? <ChevronUp size={13} color={accent} strokeWidth={2.6} /> : <ChevronDown size={13} color={accent} strokeWidth={2.6} />}
            <Text style={{ fontSize: 12, fontWeight: '600', color: accent }}>
              {Math.abs(deltaPercent)}% {up ? 'more' : 'less'} than {previous.short}
            </Text>
          </View>

          <View className="mt-1 gap-2.5">
            <CompareBar label={previous.short} hours={previous.hours} ratio={ratioOf(previous.hours, peak)} />
            <CompareBar label={recap.display.slice(0, 3)} hours={recap.hours} ratio={ratioOf(recap.hours, peak)} current />
          </View>
        </View>
      )}
    </View>
  );
}

/** "That is a day and a half. Gone." — scaled to whatever the number is. */
function hoursInWords(hours: number): string {
  if (hours < 6) return 'Barely a sitting. Restrained of you.';
  if (hours < 24) return `That is ${hours} hours you are not getting back.`;
  const days = hours / 24;
  return `That is ${days < 1.75 ? 'a day and a half' : `${days.toFixed(1)} days`}. Gone.`;
}

function CompareBar({ label, hours, ratio, current }: { label: string; hours: number; ratio: number; current?: boolean }) {
  const ink = current ? RECAP.ink : RECAP.muted;
  return (
    <View className="flex-row items-center gap-2.5">
      <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '600', color: ink, width: 32 }}>{label}</Text>
      <View className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: RECAP.line }}>
        <View className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: current ? RECAP.movie : '#404040' }} />
      </View>
      <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '600', color: ink, width: 30, textAlign: 'right' }}>{hours}h</Text>
    </View>
  );
}
