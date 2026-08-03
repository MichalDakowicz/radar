import { Text, View } from 'react-native';

import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { SlideBody } from '@/features/recap/parts/SlideBody';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { MONO, RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearRewatchSlideProps = { recap: YearlyRecap };

/** The one you went back to, and the label the year earns you. */
export function YearRewatchSlide({ recap }: YearRewatchSlideProps) {
  const { rewatch, classification } = recap;

  return (
    <View className="gap-6">
      {rewatch ? (
        <View>
          <View className="mb-3.5">
            <SlideLabel>07 — THE ONE YOU KEPT GOING BACK TO</SlideLabel>
          </View>
          <View className="flex-row items-center gap-4">
            <RecapPoster coverUrl={rewatch.coverUrl} title={rewatch.title} width={96} />
            <View className="min-w-0 flex-1">
              <Text style={{ fontSize: 24, lineHeight: 26, fontWeight: '700', letterSpacing: -0.6, color: RECAP.ink }}>
                {rewatch.title}
              </Text>
              <Text className="mt-1.5" style={{ fontSize: 12.5, color: RECAP.muted }}>
                {[rewatch.director, rewatch.year].filter(Boolean).join(' · ')}
              </Text>
              <View
                className="mt-2.5 self-start rounded-full px-2.5 py-1.5"
                style={{ borderWidth: 1, borderColor: 'rgba(251,191,36,.45)', backgroundColor: 'rgba(251,191,36,.12)' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: RECAP.star }}>Watched {rewatch.times} times</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View>
          <View className="mb-3.5">
            <SlideLabel>07 — NO SECOND HELPINGS</SlideLabel>
          </View>
          <SlideBody size={15}>Nothing was watched twice this year. Once each, and on to the next.</SlideBody>
        </View>
      )}

      <View className="py-5" style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: RECAP.line }}>
        <Text
          className="mb-3"
          style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.7, color: RECAP.muted }}
        >
          YOUR CLASSIFICATION
        </Text>
        <Text style={{ fontSize: 30, lineHeight: 32, fontWeight: '700', letterSpacing: -0.9, color: RECAP.tvSoft }}>
          {classification.name}
        </Text>
        <View className="mt-3">
          <SlideBody size={13}>{classification.blurb}</SlideBody>
        </View>
      </View>
    </View>
  );
}
