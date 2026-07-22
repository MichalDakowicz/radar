import { FlashList } from '@shopify/flash-list';

import { MovieCard } from '@/components/media/MovieCard';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import type { MediaSummary } from '@/lib/tmdb';

type AddSearchResultsProps = {
  results: MediaSummary[];
  onSelect: (item: MediaSummary) => void;
};

// List of MovieCard(variant="row") results for the Quick-Add search step
// (doc 12 part 2) - the same row card everywhere, never bespoke markup.
export function AddSearchResults({ results, onSelect }: AddSearchResultsProps) {
  return (
    <FlashList
      data={results}
      keyExtractor={(item) => `${item.type}-${item.tmdbId}`}
      contentContainerClassName="gap-2 px-4 pb-6"
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
