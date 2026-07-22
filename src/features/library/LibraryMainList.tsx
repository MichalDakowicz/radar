import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';

import { columnsFor, gapForSize } from '@/components/media/MediaGrid';
import { MovieCard } from '@/components/media/MovieCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { GridSize, ViewMode } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

// The one main-list body (doc 03 `LibraryGrid`/`LibraryList`, doc 10 file-size
// rule) - swaps between a virtualized FlashList and a draggable list depending
// on whether reorder is eligible (doc 03 Library "drag-to-reorder").
type LibraryMainListProps = {
  movies: Movie[];
  viewMode: ViewMode;
  gridSize: GridSize;
  reorderEnabled: boolean;
  highlightedId?: string | null;
  onPress: (movie: Movie) => void;
  onReorder: (movies: Movie[]) => void;
  ListHeaderComponent?: ReactElement;
};

export function LibraryMainList({
  movies,
  viewMode,
  gridSize,
  reorderEnabled,
  highlightedId,
  onPress,
  onReorder,
  ListHeaderComponent,
}: LibraryMainListProps) {
  const { width } = useWindowDimensions();
  const columns = viewMode === 'grid' ? columnsFor(gridSize, width) : 1;
  const cardVariant = viewMode === 'grid' ? 'poster' : 'row';
  const emptyState = <EmptyState title="Your library is empty" description="Add a title to start tracking." />;
  // Legacy gridClasses gap (Home.jsx): gap-4 (16px) compact, gap-6 (24px)
  // normal/large. Applied as half-gap padding on both the item and the
  // container so edge gaps match inter-card gaps.
  const halfGap = viewMode === 'grid' ? gapForSize(gridSize) / 2 : 6;

  // react-native-draggable-flatlist doesn't scroll on web at all (verified
  // live: wheel-scroll is a no-op in reorder mode, works the moment a filter
  // falls back to plain FlashList) - it's built on PanGestureHandler +
  // Reanimated with no web scroll fallback. Drag-to-reorder degrades to a
  // plain scrollable grid on web; native keeps full reorder.
  if (reorderEnabled && Platform.OS !== 'web') {
    // DraggableFlatList (unlike plain FlashList) can't resolve a poster card's
    // `aspect-[2/3]` sizing on its own - the row wrapper never gets a definite
    // height to hand down, so the card measures 0x0 and silently disappears.
    // Verified live: search-filtered plain FlashList renders the same card at
    // 238x357; the default (unfiltered, custom-sort) reorder list renders it
    // at 0x0. Give the grid item an explicit computed width/height instead of
    // depending on aspect-ratio here.
    const itemOuterWidth = viewMode === 'grid' ? (width - halfGap * 2) / columns : undefined;
    const itemInnerWidth = itemOuterWidth != null ? itemOuterWidth - halfGap * 2 : undefined;

    return (
      <DraggableFlatList
        key={`reorder-${viewMode}-${columns}-${gridSize}`}
        data={movies}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => onReorder(data)}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={emptyState}
        contentContainerStyle={{ padding: halfGap }}
        renderItem={({ item, drag, isActive }: RenderItemParams<Movie>) => (
          <ScaleDecorator>
            <Pressable onLongPress={drag} disabled={isActive} style={{ width: itemOuterWidth, padding: halfGap }}>
              {itemInnerWidth != null ? (
                <View style={{ width: itemInnerWidth, height: itemInnerWidth * 1.5 }}>
                  <MovieCard movie={item} variant={cardVariant} onPress={onPress} highlighted={highlightedId === item.id} />
                </View>
              ) : (
                <MovieCard movie={item} variant={cardVariant} onPress={onPress} highlighted={highlightedId === item.id} />
              )}
            </Pressable>
          </ScaleDecorator>
        )}
      />
    );
  }

  return (
    <FlashList
      key={`main-${viewMode}-${columns}-${gridSize}`}
      data={movies}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={emptyState}
      contentContainerStyle={{ padding: halfGap }}
      renderItem={({ item }) => (
        <View style={viewMode === 'grid' ? { flex: 1, padding: halfGap } : { paddingHorizontal: halfGap, paddingBottom: halfGap * 2 }}>
          <MovieCard movie={item} variant={cardVariant} onPress={onPress} highlighted={highlightedId === item.id} />
        </View>
      )}
    />
  );
}
