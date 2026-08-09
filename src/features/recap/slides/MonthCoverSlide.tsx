import { Text, View } from 'react-native';

import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import type { MonthlyRecap } from '@/lib/recap';

type MonthCoverSlideProps = { recap: MonthlyRecap };

/** The month's name at full volume, with the three numbers that justify it. */
export function MonthCoverSlide({ recap }: MonthCoverSlideProps) {
  return (
    <View>
      <View className="mb-5">
        <SlideLabel>YOUR MONTH IN RADAR</SlideLabel>
      </View>
      <Text style={{ fontSize: 74, lineHeight: 64, fontWeight: '700', letterSpacing: -3.3, color: RECAP.ink }}>
        {recap.display}
      </Text>
      {/* The design outlines the year; React Native has no text stroke, so it
          drops to a ghosted fill at the same weight. */}
      <Text style={{ fontSize: 74, lineHeight: 68, fontWeight: '300', letterSpacing: -3.3, color: 'rgba(255,255,255,.3)' }}>
        {recap.year}
      </Text>

      <View className="mt-8 gap-[11px]">
        <CoverStat value={recap.titles} label="titles finished" />
        <CoverStat value={recap.hours} label="hours in the dark" />
        <CoverStat value={recap.activeDays} label="days you pressed play" />
      </View>

      <Text className="mt-9" style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,.42)' }}>
        Tap to keep going →
      </Text>
    </View>
  );
}

function CoverStat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.6, color: RECAP.ink }}>{value}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500', color: RECAP.muted }}>{label}</Text>
    </View>
  );
}
