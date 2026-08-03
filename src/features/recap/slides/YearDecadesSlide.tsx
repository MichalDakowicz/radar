import { Text, View } from 'react-native';

import { SlideBody } from '@/features/recap/parts/SlideBody';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import type { RankedItem, YearlyRecap } from '@/lib/recap';

type YearDecadesSlideProps = { recap: YearlyRecap };

const TRACK = 170;

/** Where the taste lives: release decades, in time order, drawn to scale. */
export function YearDecadesSlide({ recap }: YearDecadesSlideProps) {
  const peak = Math.max(...recap.decades.map((d) => d.count), 0);

  return (
    <View className="gap-6">
      <View>
        <View className="mb-3.5">
          <SlideLabel>05 — WHEN YOUR TASTE LIVES</SlideLabel>
        </View>
        <SlideHeadline>{recap.medianYear ? `Median release\nyear: ${recap.medianYear}.` : 'No release dates\nto go on.'}</SlideHeadline>
      </View>

      <View>
        <View className="flex-row items-end justify-between" style={{ gap: 7, height: TRACK + 46 }}>
          {recap.decades.map((decade) => (
            <DecadeColumn key={decade.name} decade={decade} peak={peak} />
          ))}
        </View>

        {recap.oldest && (
          <View
            className="mt-4 flex-row items-center justify-between pt-3"
            style={{ borderTopWidth: 1, borderTopColor: RECAP.line }}
          >
            <SlideBody size={12.5}>Oldest title watched</SlideBody>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: RECAP.ink }} numberOfLines={1}>
              {recap.oldest.title} · {recap.oldest.year}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function DecadeColumn({ decade, peak }: { decade: RankedItem; peak: number }) {
  const leader = decade.count === peak;
  return (
    <View className="flex-1 items-center" style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: leader ? RECAP.ink : RECAP.muted }}>{decade.count}</Text>
      {/* The bar is the full track with a proportional fill, so a short decade
          still reads against the ones either side of it. */}
      <View className="w-full justify-end overflow-hidden" style={{ height: TRACK, borderRadius: 9, backgroundColor: RECAP.line }}>
        <View
          style={{
            height: Math.max(3, decade.ratio * TRACK),
            borderRadius: 9,
            backgroundColor: leader ? RECAP.movie : `rgba(250,250,250,${(0.3 + 0.5 * decade.ratio).toFixed(2)})`,
          }}
        />
      </View>
      <Text style={{ fontSize: 10, fontWeight: leader ? '700' : '600', color: leader ? RECAP.ink : RECAP.muted }}>
        {decade.name.replace(/^\d\d/, '')}
      </Text>
    </View>
  );
}
