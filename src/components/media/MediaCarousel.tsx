import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MovieCard, type MovieCardVariant } from '@/components/media/MovieCard';
import { useHover, useIsDesktop, useMeasuredWidth, webTransition } from '@/hooks/useResponsive';
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
}: MediaCarouselProps) {
  const isDesktop = useIsDesktop();
  const { hovered, bind } = useHover();
  const { width: rowWidth, onLayout } = useMeasuredWidth();
  const listRef = useRef<FlashListRef<Movie>>(null);
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
    listRef.current?.scrollToOffset({ offset: next, animated: true });
    setOffset(next);
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
        <FlashList
          ref={listRef}
          horizontal
          data={movies}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: EDGE_PADDING }}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate={isFeatured ? 'fast' : 'normal'}
          scrollEventThrottle={16}
          onScroll={({ nativeEvent }) => setOffset(nativeEvent.contentOffset.x)}
          renderItem={({ item, index }) => (
            <View
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
          )}
        />
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

// Netflix-style edge control: only materializes while the pointer is over the
// row, so a page of rows isn't covered in permanent chrome.
function ScrollArrow({ side, visible, onPress }: { side: 'left' | 'right'; visible: boolean; onPress: () => void }) {
  const { hovered, bind } = useHover();
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;

  return (
    <Pressable
      {...bind}
      onPress={onPress}
      accessibilityLabel={side === 'left' ? 'Scroll left' : 'Scroll right'}
      style={[
        {
          // Hidden arrows must not eat clicks meant for the posters underneath.
          pointerEvents: visible ? 'auto' : 'none',
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 44,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: visible ? 1 : 0,
          backgroundColor: hovered ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
        },
        side === 'left' ? { left: 0 } : { right: 0 },
        webTransition('opacity, background-color'),
      ]}
    >
      <Icon size={26} color="#fff" />
    </Pressable>
  );
}
