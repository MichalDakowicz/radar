import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { MovieCard, type MovieCardVariant } from '@/components/media/MovieCard';
import type { Movie } from '@/types/movie';

// Horizontal row of MovieCards - ported from ScrollingRow.jsx (doc 12 part 1).
// Nested scrolling is native here: no global swipe listener to fight with
// (doc 04 issue L), so this is the one horizontal-list primitive everywhere
// (Browse rows, Continue watching, Hall of Fame, Stats history).
type MediaCarouselProps = {
  title?: string;
  badge?: string;
  movies: Movie[];
  cardVariant?: MovieCardVariant;
  cardWidth?: number;
  onPress?: (movie: Movie) => void;
  onAdd?: (movie: Movie) => void;
  onRemove?: (movie: Movie) => void;
  isAdded?: (movie: Movie) => boolean;
  highlightedId?: string | null;
  showStatus?: boolean;
  showRatings?: boolean;
  showFullDate?: boolean;
  readOnly?: boolean;
};

export function MediaCarousel({
  title,
  badge,
  movies,
  cardVariant = 'poster',
  cardWidth = 140,
  onPress,
  onAdd,
  onRemove,
  isAdded,
  highlightedId,
  showStatus,
  showRatings,
  showFullDate,
  readOnly,
}: MediaCarouselProps) {
  if (movies.length === 0) return null;

  // Full-width featured cards page one-at-a-time (Continue watching / Coming
  // soon); poster rows scroll freely. Gap here must match the item marginRight below.
  const isFeatured = cardVariant === 'featured';
  const GAP = 16;
  const snapInterval = isFeatured ? cardWidth + GAP : undefined;

  return (
    <View className="gap-3">
      {!!title && (
        <View className="flex-row items-center gap-2 px-4">
          <Text className="text-xl font-semibold text-foreground">{title}</Text>
          {!!badge && (
            <View className="rounded-full bg-primary/20 px-2 py-0.5">
              <Text className="text-xs font-medium text-primary">{badge}</Text>
            </View>
          )}
        </View>
      )}
      <View className="relative">
        <FlashList
          horizontal
          data={movies}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate={isFeatured ? 'fast' : 'normal'}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: cardVariant === 'hero' ? cardWidth * 2 : cardWidth,
                marginRight: index === movies.length - 1 ? 0 : GAP,
              }}
            >
              <MovieCard
                movie={item}
                variant={cardVariant}
                onPress={onPress}
                onAdd={onAdd}
                onRemove={onRemove}
                isAdded={isAdded?.(item)}
                highlighted={highlightedId === item.id}
                showStatus={showStatus}
                showRatings={showRatings}
                showFullDate={showFullDate}
                readOnly={readOnly}
              />
            </View>
          )}
        />
        {/* Right-edge fade (ported from ScrollingRow.jsx's scroll-affordance
            gradient) - the visual cue that this row scrolls, without needing
            to track live scroll offset the way the hover-only arrows did. */}
        {movies.length > 1 && !isFeatured && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 44 }}
            pointerEvents="none"
          />
        )}
      </View>
    </View>
  );
}
