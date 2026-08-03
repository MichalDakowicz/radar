import { Text, View, useWindowDimensions } from 'react-native';

import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import { StarRow } from '@/features/social/StarRow';
import type { MonthlyRecap } from '@/lib/recap';

type MonthFilmSlideProps = { recap: MonthlyRecap };

/**
 * The verdict and the guilt pile. The share button belongs to the player, which
 * draws it over the card — see slideTypes.
 */
export function MonthFilmSlide({ recap }: MonthFilmSlideProps) {
  const { width } = useWindowDimensions();
  const { film } = recap;
  // Four aging posters across the card's inner width, 10px gutters.
  const aging = Math.floor((width - 52 - 30) / 4);

  return (
    <View className="gap-5">
      {film && (
        <View>
          <View className="mb-3.5">
            <SlideLabel color={RECAP.muted}>{film.type === 'tv' ? 'SHOW OF THE MONTH' : 'FILM OF THE MONTH'}</SlideLabel>
          </View>
          <View className="flex-row items-end gap-4">
            <RecapPoster coverUrl={film.coverUrl} title={film.title} width={112} />
            <View className="min-w-0 flex-1">
              <Text style={{ fontSize: 26, lineHeight: 28, fontWeight: '700', letterSpacing: -0.65, color: RECAP.ink }}>
                {film.title}
              </Text>
              <Text className="mt-1.5" style={{ fontSize: 12.5, lineHeight: 18, color: RECAP.muted }}>
                {[film.director, film.year].filter(Boolean).join(' · ')}
              </Text>
              {film.rating != null && (
                <View className="mt-2">
                  <StarRow score={film.rating} size={14} />
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {recap.aging.length > 0 && (
        <View className="pt-4" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.1)' }}>
          <Text style={{ fontSize: 14, lineHeight: 22, color: RECAP.muted }}>
            {recap.agingSince
              ? `Sitting in your watchlist since ${recap.agingSince}:`
              : 'Still sitting in your watchlist:'}
          </Text>
          <View className="mt-3.5 flex-row gap-2.5">
            {recap.aging.map((item) => (
              <RecapPoster key={`${item.tmdbId}-${item.title}`} coverUrl={item.coverUrl} title={item.title} width={aging} radius={7} />
            ))}
          </View>
        </View>
      )}

    </View>
  );
}
