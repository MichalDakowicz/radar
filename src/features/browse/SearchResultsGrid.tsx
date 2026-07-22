import { FlashList } from '@shopify/flash-list';
import { useWindowDimensions, View } from 'react-native';

import { columnsFor, gapForSize } from '@/components/media/MediaGrid';
import { MovieCard } from '@/components/media/MovieCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BrowseSearchResult } from '@/lib/tmdb';
import type { Movie } from '@/types/movie';

import { BrowseSearchResultTile } from './BrowseSearchResultTile';
import { toDiscoveryMovie } from './toDiscoveryMovie';

type SearchResultsGridProps = {
  results: BrowseSearchResult[];
  onSelectMedia: (movie: Movie) => void;
  onSelectPerson: (personId: number, department: string) => void;
  onSelectGenre: (genreId: number) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

// Browse's own grid (doc 03 `SearchResultsGrid`) - mixes movie/tv results
// (through the shared MovieCard) with person/genre tiles, so it can't route
// entirely through MediaGrid, which is movies-only.
export function SearchResultsGrid({
  results,
  onSelectMedia,
  onSelectPerson,
  onSelectGenre,
  onAdd,
  onRemove,
  isAdded,
}: SearchResultsGridProps) {
  const { width } = useWindowDimensions();
  const columns = columnsFor('normal', width);
  const halfGap = gapForSize('normal') / 2;

  if (results.length === 0) {
    return <EmptyState title="No matches found" description="Try a different search or result-type filter." />;
  }

  return (
    <FlashList
      key={`search-${columns}`}
      data={results}
      numColumns={columns}
      keyExtractor={(item) => item.resultKey}
      contentContainerStyle={{ padding: halfGap }}
      renderItem={({ item }) => (
        <View style={{ flex: 1, padding: halfGap }}>
          {item.resultType === 'person' ? (
            <BrowseSearchResultTile
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              kind="person"
              onPress={() => onSelectPerson(item.personId, item.knownForDepartment)}
            />
          ) : item.resultType === 'genre' ? (
            <BrowseSearchResultTile
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={null}
              kind="genre"
              onPress={() => onSelectGenre(item.genreId)}
            />
          ) : (
            <MediaResultCard item={item} onSelectMedia={onSelectMedia} onAdd={onAdd} onRemove={onRemove} isAdded={isAdded} />
          )}
        </View>
      )}
    />
  );
}

function MediaResultCard({
  item,
  onSelectMedia,
  onAdd,
  onRemove,
  isAdded,
}: {
  item: Extract<BrowseSearchResult, { resultType: 'movie' | 'tv' }>;
  onSelectMedia: (movie: Movie) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
}) {
  const movie = toDiscoveryMovie(item);
  return (
    <MovieCard movie={movie} onPress={onSelectMedia} onAdd={onAdd} onRemove={onRemove} isAdded={isAdded(movie)} showStatus={false} />
  );
}
