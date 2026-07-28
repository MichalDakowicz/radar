import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import { MovieCard } from '@/components/media/MovieCard';
import { BREAKPOINTS, useMeasuredWidth } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

// The 3 size presets ported from legacy Home.jsx `gridClasses` (doc 12 part 1) -
// the only poster grid container (Library, search results, person/genre pages).
export type GridSize = 'compact' | 'normal' | 'large';

// Steps past `xl` exist for the browser build: capping at 5 columns means a
// 1800px content column renders 360px-wide posters, which reads as a list of
// billboards rather than a grid.
type ColumnSteps = { base: number; sm?: number; md?: number; lg?: number; xl?: number; '2xl'?: number; '3xl'?: number; '4xl'?: number };

const COLUMN_TABLE: Record<GridSize, ColumnSteps> = {
  compact: { base: 3, sm: 4, md: 5, lg: 6, xl: 7, '2xl': 9, '3xl': 11, '4xl': 13 },
  normal: { base: 2, md: 3, lg: 4, xl: 5, '2xl': 7, '3xl': 8, '4xl': 9 },
  large: { base: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 5, '3xl': 6, '4xl': 7 },
};

// Widest first: the first step the container is at least as wide as wins.
const STEPS = ['4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'sm'] as const;

/**
 * Column count for a grid `width` *of the grid itself*, not of the window -
 * callers on desktop pass a measured width, since the sidebar and the content
 * cap can take 900px off the window.
 */
export function columnsFor(size: GridSize, width: number): number {
  const table = COLUMN_TABLE[size];
  for (const step of STEPS) {
    const columns = table[step];
    if (columns && width >= BREAKPOINTS[step]) return columns;
  }
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
  const { width, onLayout } = useMeasuredWidth();
  const columns = columnsFor(size, width);
  const halfGap = gapForSize(size) / 2;

  return (
    <View className="flex-1" onLayout={onLayout}>
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
    </View>
  );
}
