import { Text, View, useWindowDimensions } from 'react-native';

import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { SlideBody } from '@/features/recap/parts/SlideBody';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearMasterpiecesSlideProps = { recap: YearlyRecap };

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** Everything you gave five stars to, and how rarely that happened. */
export function YearMasterpiecesSlide({ recap }: YearMasterpiecesSlideProps) {
  const { width } = useWindowDimensions();
  const shown = recap.masterpieces;
  const count = shown.length;
  // Three across the card's inner width (26px padding each side, 11px gutters).
  const poster = Math.floor((width - 52 - 22) / 3);

  return (
    <View className="gap-5">
      <View>
        <View className="mb-3.5">
          <SlideLabel color={RECAP.star}>06 — THE MASTERPIECES</SlideLabel>
        </View>
        <SlideHeadline>{count === 1 ? 'One perfect\nscore.' : `${WORDS[count] ?? count} perfect\nscores.`}</SlideHeadline>
        <View className="mt-2.5">
          <SlideBody>
            {count === 0
              ? 'Not one five-star rating all year. Either standards or opportunity — you know which.'
              : `Out of ${recap.titles}. You gave five stars to ${recap.masterpiecePercent}% of what you watched.`}
          </SlideBody>
        </View>
      </View>

      {count > 0 && (
        <View className="flex-row flex-wrap" style={{ rowGap: 12, columnGap: 11 }}>
          {shown.map((item) => (
            <View key={`${item.tmdbId}-${item.title}`} style={{ width: poster }}>
              <RecapPoster coverUrl={item.coverUrl} title={item.title} width={poster} radius={7} />
              <Text numberOfLines={2} className="mt-1.5" style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: RECAP.muted }}>
                {item.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
