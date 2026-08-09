import { Text, View } from 'react-native';

import { SlideBody } from '@/features/recap/parts/SlideBody';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearGenresSlideProps = { recap: YearlyRecap };

/**
 * The type wall (design 1d, third layout): each genre is set at a size taken
 * straight from its share of the leader, so the ranking is legible without a
 * single number or axis. Ranked bars said the same thing and nobody remembered
 * them.
 */
export function YearGenresSlide({ recap }: YearGenresSlideProps) {
  const [top, second] = recap.genres;
  const lead = top && second ? top.count - second.count : 0;

  return (
    <View className="gap-5">
      <View>
        <View className="mb-3.5">
          <SlideLabel>03 — WHAT YOU ACTUALLY LIKE</SlideLabel>
        </View>
        {top && <SlideHeadline>{lead >= 10 ? `${top.name}, by\na landslide.` : `${top.name}, just\nabout.`}</SlideHeadline>}
      </View>

      <View className="flex-row flex-wrap items-baseline" style={{ columnGap: 10 }}>
        {recap.genres.map((genre) => (
          <Text
            key={genre.name}
            style={{
              fontSize: genre.fontSize,
              lineHeight: genre.fontSize * 1.06,
              fontWeight: '700',
              letterSpacing: -genre.fontSize * 0.035,
              color: `rgba(250,250,250,${genre.opacity})`,
            }}
          >
            {genre.name}
          </Text>
        ))}
      </View>

      {top && second && (
        <SlideBody>
          {`${top.name} led with ${top.count} ${top.count === 1 ? 'title' : 'titles'}, ${lead === 0 ? 'tied with' : `${lead} ahead of`} ${second.name}.`}
        </SlideBody>
      )}
      {recap.genres.length === 0 && <Text style={{ color: RECAP.muted }}>No genres tagged this year.</Text>}
    </View>
  );
}
