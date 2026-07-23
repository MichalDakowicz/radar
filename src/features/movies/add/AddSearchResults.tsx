import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { MovieCard } from '@/components/media/MovieCard';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import type { MediaSummary } from '@/lib/tmdb';

type AddSearchResultsProps = {
  results: MediaSummary[];
  onSelect: (item: MediaSummary) => void;
};

// FlashList isn't a gorhom bottom-sheet scrollable, so gorhom won't auto-pad it
// for the keyboard - the last rows would sit under the keyboard, unreachable.
// This spacer footer grows to the live keyboard height so every result can
// scroll clear of it (reanimated tracks the keyboard on both platforms).
function KeyboardSpacer() {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => ({ height: keyboard.height.value }));
  return <Animated.View style={style} />;
}

// List of MovieCard(variant="row") results for the Quick-Add search step
// (doc 12 part 2) - the same row card everywhere, never bespoke markup.
export function AddSearchResults({ results, onSelect }: AddSearchResultsProps) {
  return (
    <FlashList
      data={results}
      keyExtractor={(item) => `${item.type}-${item.tmdbId}`}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-2 px-4 pb-6"
      ListFooterComponent={KeyboardSpacer}
      renderItem={({ item }) => (
        <MovieCard
          movie={toDiscoveryMovie(item)}
          variant="row"
          onPress={() => onSelect(item)}
          showStatus={false}
          showRatings={false}
        />
      )}
    />
  );
}
