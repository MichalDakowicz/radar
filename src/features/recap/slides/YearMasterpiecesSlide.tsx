import { Text, View, useWindowDimensions } from 'react-native';

import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { SlideBody } from '@/features/recap/parts/SlideBody';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearMasterpiecesSlideProps = { recap: YearlyRecap };

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/**
 * Three genuinely different pages, because "how many fives did you give" has
 * three genuinely different answers:
 *
 * - several → the grid
 * - exactly one → that poster, large. One masterpiece treated as a six-up cell
 *   reads as a shortage; treated as the whole page it reads as a verdict.
 * - none → the highest scores you *did* give, named as such. Nothing is
 *   promoted to masterpiece to fill the space — the year did not have one, and
 *   picking a title to stand in would be inventing the result.
 */
export function YearMasterpiecesSlide({ recap }: YearMasterpiecesSlideProps) {
  const { width } = useWindowDimensions();
  const inner = width - 52;
  const count = recap.masterpieces.length;

  if (count === 1) return <SinglePage recap={recap} width={Math.min(inner, 210)} />;
  if (count === 0) return <NonePage recap={recap} poster={Math.floor((inner - 22) / 3)} />;
  return <GridPage recap={recap} poster={Math.floor((inner - 22) / 3)} />;
}

function Header({ children, label = '06 — THE MASTERPIECES' }: { children: React.ReactNode; label?: string }) {
  return (
    <View>
      <View className="mb-3.5">
        <SlideLabel color={RECAP.star}>{label}</SlideLabel>
      </View>
      {children}
    </View>
  );
}

function SinglePage({ recap, width }: { recap: YearlyRecap; width: number }) {
  const [only] = recap.masterpieces;
  return (
    <View className="gap-6">
      <Header>
        <SlideHeadline>{'One perfect\nscore.'}</SlideHeadline>
        <View className="mt-2.5">
          <SlideBody>
            {`Out of ${recap.titles}. Nothing else came close enough to earn the fifth star.`}
          </SlideBody>
        </View>
      </Header>

      <View className="items-center">
        <RecapPoster coverUrl={only.coverUrl} title={only.title} width={width} radius={12} />
        <Text
          className="mt-4 text-center"
          style={{ fontSize: 24, lineHeight: 27, fontWeight: '700', letterSpacing: -0.7, color: RECAP.ink }}
        >
          {only.title}
        </Text>
        <View
          className="mt-3 rounded-full px-3 py-1.5"
          style={{ borderWidth: 1, borderColor: 'rgba(251,191,36,.45)', backgroundColor: 'rgba(251,191,36,.12)' }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: RECAP.star }}>FILM OF THE YEAR</Text>
        </View>
      </View>
    </View>
  );
}

function GridPage({ recap, poster }: { recap: YearlyRecap; poster: number }) {
  const count = recap.masterpieces.length;
  return (
    <View className="gap-5">
      <Header>
        <SlideHeadline>{`${WORDS[count] ?? count} perfect\nscores.`}</SlideHeadline>
        <View className="mt-2.5">
          <SlideBody>{`Out of ${recap.titles}. You gave five stars to ${recap.masterpiecePercent}% of what you watched.`}</SlideBody>
        </View>
      </Header>
      <PosterGrid items={recap.masterpieces} poster={poster} />
    </View>
  );
}

function NonePage({ recap, poster }: { recap: YearlyRecap; poster: number }) {
  const ceiling = recap.topRated[0];
  return (
    <View className="gap-5">
      <Header label={ceiling ? '06 — THE CLOSEST YOU CAME' : '06 — UNSCORED'}>
        <SlideHeadline>{ceiling ? `Nothing quite\nreached five.` : 'You rated\nnothing.'}</SlideHeadline>
        <View className="mt-2.5">
          <SlideBody>
            {ceiling
              ? `Your ceiling this year was ${ceiling.rating}, and ${recap.topRated.length === 1 ? 'one title' : `${recap.topRated.length} titles`} got there or close to it.`
              : `${recap.titles} titles finished and not one score given. The archive is a little quiet on the question of taste.`}
          </SlideBody>
        </View>
      </Header>
      {recap.topRated.length > 0 && <PosterGrid items={recap.topRated} poster={poster} showRating />}
    </View>
  );
}

function PosterGrid({
  items,
  poster,
  showRating,
}: {
  items: { title: string; coverUrl: string | null; tmdbId: number | null; rating?: number | null }[];
  poster: number;
  showRating?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ rowGap: 12, columnGap: 11 }}>
      {items.map((item) => (
        <View key={`${item.tmdbId}-${item.title}`} style={{ width: poster }}>
          <RecapPoster coverUrl={item.coverUrl} title={item.title} width={poster} radius={7} />
          <Text numberOfLines={2} className="mt-1.5" style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '600', color: RECAP.muted }}>
            {item.title}
          </Text>
          {showRating && item.rating != null && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: RECAP.star }}>{item.rating}★</Text>
          )}
        </View>
      ))}
    </View>
  );
}
