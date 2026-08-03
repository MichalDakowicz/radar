import { Text, View, useWindowDimensions } from 'react-native';

import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import { StarRow } from '@/features/social/StarRow';
import type { MonthlyRecap } from '@/lib/recap';

type MonthFilmSlideProps = { recap: MonthlyRecap };

/**
 * The month's verdict, then the rest of its best. Runners-up rather than an
 * unwatched-watchlist row: the recap is about what you did watch, and the pile
 * you ignored is already a section of the Library.
 *
 * The share button belongs to the player, which draws it over the card — see
 * slideTypes.
 */
export function MonthFilmSlide({ recap }: MonthFilmSlideProps) {
  const { width } = useWindowDimensions();
  const { film, runnersUp } = recap;
  // Four posters across the card's inner width, 10px gutters.
  const poster = Math.floor((width - 52 - 30) / 4);

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

      {runnersUp.length > 0 && (
        <View className="pt-4" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.1)' }}>
          <Text style={{ fontSize: 14, lineHeight: 22, color: RECAP.muted }}>
            {runnersUp.length === 1 ? 'Also worth the evening:' : 'The rest of the month, in order:'}
          </Text>
          <View className="mt-3.5 flex-row gap-2.5">
            {runnersUp.map((item) => (
              <View key={`${item.tmdbId}-${item.title}`} style={{ width: poster }}>
                <RecapPoster coverUrl={item.coverUrl} title={item.title} width={poster} radius={7} />
                <Text numberOfLines={2} className="mt-1.5" style={{ fontSize: 10, lineHeight: 12.5, fontWeight: '600', color: RECAP.muted }}>
                  {item.title}
                </Text>
                {item.rating != null && (
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: RECAP.star }}>{item.rating}★</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
