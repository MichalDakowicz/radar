import { FlashList, type FlashListRef } from '@shopify/flash-list';
import type { ReactElement, RefObject } from 'react';
import { View } from 'react-native';

import { columnsFor, gapForSize } from '@/components/media/MediaGrid';
import { MovieCard } from '@/components/media/MovieCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useMeasuredWidth } from '@/hooks/useResponsive';
import type { GridSize, ViewMode } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

// The one main-list body (doc 03 `LibraryGrid`/`LibraryList`, doc 10 file-size
// rule) - a single virtualized FlashList for both grid and list view.
type LibraryMainListProps = {
  movies: Movie[];
  viewMode: ViewMode;
  gridSize: GridSize;
  highlightedId?: string | null;
  onPress: (movie: Movie) => void;
  ListHeaderComponent?: ReactElement;
  /** Overrides "Your library is empty" - a narrowed view is empty for its own reason. */
  ListEmptyComponent?: ReactElement;
  /** Lets the screen scroll the list back to the top when filters change. */
  listRef?: RefObject<FlashListRef<Movie> | null>;
};

export function LibraryMainList({
  movies,
  viewMode,
  gridSize,
  highlightedId,
  onPress,
  ListHeaderComponent,
  ListEmptyComponent,
  listRef,
}: LibraryMainListProps) {
  // Measured, not window width: on desktop the sidebar + centred content column
  // make the window hundreds of pixels wider than this list actually gets.
  const { width, onLayout } = useMeasuredWidth();
  const navBarSpace = useNavBarSpace();
  const columns = viewMode === 'grid' ? columnsFor(gridSize, width) : 1;
  const cardVariant = viewMode === 'grid' ? 'poster' : 'row';
  const emptyState = ListEmptyComponent ?? <EmptyState title="Your library is empty" description="Add a title to start tracking." />;
  // Legacy gridClasses gap (Home.jsx): gap-4 (16px) compact, gap-6 (24px)
  // normal/large. Applied as half-gap padding on both the item and the
  // container so edge gaps match inter-card gaps.
  const halfGap = viewMode === 'grid' ? gapForSize(gridSize) / 2 : 6;

  return (
    <View className="flex-1" onLayout={onLayout}>
      <FlashList
        ref={listRef}
        key={`main-${viewMode}-${columns}-${gridSize}`}
        // Off by default in FlashList v2 terms: anchoring the visible item is
        // for chat, where new rows arrive above what you are reading. Here the
        // data changes because the user re-filtered, and holding their old
        // offset is precisely what strands them mid-list.
        maintainVisibleContentPosition={{ disabled: true }}
        data={movies}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={emptyState}
        contentContainerStyle={{ padding: halfGap, paddingBottom: halfGap + navBarSpace }}
        renderItem={({ item }) => (
          <View style={viewMode === 'grid' ? { flex: 1, padding: halfGap } : { paddingHorizontal: halfGap, paddingBottom: halfGap * 2 }}>
            <MovieCard movie={item} variant={cardVariant} onPress={onPress} highlighted={highlightedId === item.id} />
          </View>
        )}
      />
    </View>
  );
}
