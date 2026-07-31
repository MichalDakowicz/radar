import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { columnsFor } from '@/components/media/MediaGrid';
import { MovieCard } from '@/components/media/MovieCard';
import { SheetFlatList } from '@/components/ui/Sheet';
import { useMeasuredWidth } from '@/hooks/useResponsive';
import type { Movie } from '@/types/movie';

const GAP = 8;

// The list is a gorhom scrollable (SheetFlatList), which pads for the keyboard
// on its own only for its *own* content inset - this footer guarantees the last
// row can still clear the keyboard once the search field is focused.
function KeyboardSpacer() {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => ({ height: keyboard.height.value }));
  return <Animated.View style={style} />;
}

type FavoritePickerGridProps = {
  movies: Movie[];
  /** 1-based pick order, or null when the title isn't pinned. */
  orderOf: (movie: Movie) => number | null;
  onToggle: (movie: Movie) => void;
  ListEmptyComponent?: ReactElement;
};

/**
 * Library picker for the favourites editor. Not MediaGrid: that grid's
 * selection prop (`highlightedId`) is single-valued, and this needs to show
 * four picks at once *with their order*, since the order is what the profile
 * row renders. It also has to scroll inside a bottom sheet, which rules out
 * MediaGrid's FlashList.
 */
export function FavoritePickerGrid({ movies, orderOf, onToggle, ListEmptyComponent }: FavoritePickerGridProps) {
  const { width, onLayout } = useMeasuredWidth();
  const columns = columnsFor('compact', width);

  return (
    <View className="flex-1" onLayout={onLayout}>
      <SheetFlatList
        // numColumns can't change on a mounted list; the key remounts it.
        key={`favorite-picker-${columns}`}
        data={movies}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: GAP / 2, paddingBottom: 16 }}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={KeyboardSpacer}
        renderItem={({ item }) => {
          const order = orderOf(item);
          return (
            <View style={{ flex: 1 / columns, padding: GAP / 2 }}>
              <View className="relative">
                {/* Deliberately not MovieCard's `highlighted`: that adds a
                    borderWidth to the poster container, and the poster image is
                    an absoluteFill child, so the border resizes it on every
                    select/deselect - which blanks the cell on Android. The ring
                    below is an overlay sibling and never touches layout. */}
                <MovieCard movie={item} variant="compact" showStatus={false} onPress={() => onToggle(item)} readOnly />
                {order != null && (
                  <>
                    <View
                      className="absolute inset-0 rounded-md border-2 border-primary"
                      style={{ pointerEvents: 'none' }}
                    />
                    <View
                      className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-primary"
                      style={{ pointerEvents: 'none' }}
                    >
                      <Text className="text-[10px] font-bold text-primary-foreground">{order}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
