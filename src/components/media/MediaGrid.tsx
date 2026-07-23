import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { MovieCard } from '@/components/media/MovieCard';
import type { Movie } from '@/types/movie';

// The 3 size presets ported from legacy Home.jsx `gridClasses` (doc 12 part 1) -
// the only poster grid container (Library, search results, person/genre pages).
export type GridSize = 'compact' | 'normal' | 'large';

const COLUMN_TABLE: Record<GridSize, { base: number; sm?: number; md?: number; lg?: number; xl?: number }> = {
  compact: { base: 3, sm: 4, md: 5, lg: 6, xl: 7 },
  normal: { base: 2, md: 3, lg: 4, xl: 5 },
  large: { base: 1, sm: 2, md: 3, lg: 4, xl: 5 },
};

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 };

export function columnsFor(size: GridSize, width: number): number {
  const table = COLUMN_TABLE[size];
  if (width >= BREAKPOINTS.xl && table.xl) return table.xl;
  if (width >= BREAKPOINTS.lg && table.lg) return table.lg;
  if (width >= BREAKPOINTS.md && table.md) return table.md;
  if (width >= BREAKPOINTS.sm && table.sm) return table.sm;
  return table.base;
}

// Exact legacy `gridClasses` gap values (Home.jsx): compact=gap-4 (16px),
// normal/large=gap-6 (24px). Measured live: without this, FlashList's own
// numColumns layout gives ~12px between cards regardless of size - visibly
// tighter than legacy and identical across all 3 presets.
export function gapForSize(size: GridSize): number {
  return size === 'compact' ? 16 : 24;
}

type MediaGridProps = {
  movies: Movie[];
  size?: GridSize;
  variant?: 'poster' | 'compact';
  onPress?: (movie: Movie) => void;
  onAdd?: (movie: Movie) => void;
  onRemove?: (movie: Movie) => void;
  isAdded?: (movie: Movie) => boolean;
  highlightedId?: string | null;
  showStatus?: boolean;
  showRatings?: boolean;
  readOnly?: boolean;
  ListHeaderComponent?: ReactElement;
  ListFooterComponent?: ReactElement;
  ListEmptyComponent?: ReactElement;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
};

export function MediaGrid({
  movies,
  size = 'normal',
  variant = 'poster',
  onPress,
  onAdd,
  onRemove,
  isAdded,
  highlightedId,
  showStatus,
  showRatings,
  readOnly,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  onEndReached,
  onEndReachedThreshold,
}: MediaGridProps) {
  const { width } = useWindowDimensions();
  const columns = columnsFor(size, width);
  const halfGap = gapForSize(size) / 2;

  return (
    <FlashList
      key={`grid-${columns}-${size}`}
      data={movies}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: halfGap }}
      ListHeaderComponent={
        // Cancel the container padding so full-bleed headers (PersonHero) reach
        // the screen edges instead of being framed by a halfGap border.
        ListHeaderComponent ? (
          <View style={{ marginHorizontal: -halfGap, marginTop: -halfGap }}>{ListHeaderComponent}</View>
        ) : undefined
      }
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      renderItem={({ item }) => (
        <View style={{ flex: 1, padding: halfGap }}>
          <MovieCard
            movie={item}
            variant={variant}
            onPress={onPress}
            onAdd={onAdd}
            onRemove={onRemove}
            isAdded={isAdded?.(item)}
            highlighted={highlightedId === item.id}
            showStatus={showStatus}
            showRatings={showRatings}
            readOnly={readOnly}
          />
        </View>
      )}
    />
  );
}
