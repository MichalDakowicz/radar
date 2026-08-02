import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { MovieCard, type MovieCardVariant } from '@/components/media/MovieCard';
import { ScrollArrow } from '@/components/media/ScrollArrow';
import { useHover, useIsDesktop, useMeasuredWidth } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

// Horizontal row of MovieCards - ported from ScrollingRow.jsx (doc 12 part 1).
// Nested scrolling is native here: no global swipe listener to fight with
// (doc 04 issue L), so this is the one horizontal-list primitive everywhere
// (Browse rows, Continue watching, Hall of Fame, Stats history).
//
// A mouse wheel scrolls the *page*, not a horizontal list, so on desktop web
// the row also gets prev/next buttons - without them these rows are only
// reachable by dragging the scrollbar.
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
  /**
   * Off for the Library's own sections, which live inside another list's
   * header: a FlashList that mounts there measures against a container that is
   * already laid out and can settle on a single visible card until something
   * forces it to measure again. Those rows are capped at 30 short cards, so
   * rendering them all up front costs nothing and is always correct.
   */
  virtualized?: boolean;
};

const GAP = 16;
const EDGE_PADDING = 16;

export function MediaCarousel({
  title,
  badge,
  movies,
  cardVariant = 'poster',
  cardWidth,
  onPress,
  onAdd,
  onRemove,
  isAdded,
  highlightedId,
  showStatus,
  showRatings,
  showFullDate,
  readOnly,
  virtualized = true,
}: MediaCarouselProps) {
  const isDesktop = useIsDesktop();
  const { hovered, bind } = useHover();
  const { width: rowWidth, onLayout } = useMeasuredWidth();
  const listRef = useRef<FlashListRef<Movie>>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);

  if (movies.length === 0) return null;

  // Full-width featured cards page one-at-a-time (Continue watching / Coming
  // soon); poster rows scroll freely. Gap here must match the item marginRight below.
  const isFeatured = cardVariant === 'featured';
  // Posters can afford to be bigger with a mouse - 140px is a thumb-sized target.
  const itemWidth = cardWidth ?? (isDesktop ? 176 : 140);
  const outerWidth = cardVariant === 'hero' ? itemWidth * 2 : itemWidth;
  const snapInterval = isFeatured ? itemWidth + GAP : undefined;

  const contentWidth = movies.length * (outerWidth + GAP) - GAP + EDGE_PADDING * 2;
  const canScrollLeft = offset > 4;
  const canScrollRight = offset + rowWidth < contentWidth - 4;
  const showArrows = isDesktop && (canScrollLeft || canScrollRight);

  // Advance by whole cards so the row never lands mid-poster.
  const step = Math.max(outerWidth + GAP, Math.floor((rowWidth * 0.8) / (outerWidth + GAP)) * (outerWidth + GAP));
  const scrollBy = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(offset + direction * step, contentWidth - rowWidth));
    if (virtualized) listRef.current?.scrollToOffset({ offset: next, animated: true });
    else scrollRef.current?.scrollTo({ x: next, animated: true });
    setOffset(next);
  };

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(nativeEvent.contentOffset.x);

  const renderCard = (item: Movie, index: number) => (
    <View
      key={item.id}
      style={{
        width: outerWidth,
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
  );

  const shared = {
    horizontal: true as const,
    showsHorizontalScrollIndicator: false,
    contentContainerStyle: { paddingHorizontal: EDGE_PADDING },
    snapToInterval: snapInterval,
    snapToAlignment: 'start' as const,
    decelerationRate: isFeatured ? ('fast' as const) : ('normal' as const),
    scrollEventThrottle: 16,
    onScroll,
  };

  return (
    <View className="gap-3" {...bind}>
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
      <View className="relative" onLayout={onLayout}>
        {virtualized ? (
          <FlashList
            {...shared}
            ref={listRef}
            data={movies}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => renderCard(item, index)}
          />
        ) : (
          <ScrollView {...shared} ref={scrollRef}>
            {movies.map(renderCard)}
          </ScrollView>
        )}
        {/* Right-edge fade (ported from ScrollingRow.jsx's scroll-affordance
            gradient) - the visual cue that this row scrolls, without needing
            to track live scroll offset the way the hover-only arrows did. */}
        {movies.length > 1 && !isFeatured && !showArrows && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 44, pointerEvents: 'none' }}
          />
        )}
        {showArrows && (
          <>
            <ScrollArrow side="left" visible={hovered && canScrollLeft} onPress={() => scrollBy(-1)} />
            <ScrollArrow side="right" visible={hovered && canScrollRight} onPress={() => scrollBy(1)} />
          </>
        )}
      </View>
    </View>
  );
}
