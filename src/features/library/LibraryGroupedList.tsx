import type { ReactElement } from 'react';
import { ScrollView, View } from 'react-native';

import { MovieCard } from '@/components/media/MovieCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { LibraryGroup } from '@/features/library/useLibraryFilters';
import type { ViewMode } from '@/store/libraryPrefs';
import type { Movie } from '@/types/movie';

// Grouped view (director/year/genre/availability/status, doc 03 Library
// group-by) - not virtualized like LibraryMainList. Personal libraries are a
// few hundred titles at most, so a plain ScrollView trades a little scroll
// perf for a much simpler render than flattening groups into FlashList spans.
type LibraryGroupedListProps = {
  groups: LibraryGroup[];
  viewMode: ViewMode;
  onPress: (movie: Movie) => void;
  highlightedId?: string | null;
  header?: ReactElement;
};

export function LibraryGroupedList({ groups, viewMode, onPress, highlightedId, header }: LibraryGroupedListProps) {
  if (groups.length === 0) {
    return (
      <ScrollView contentContainerClassName="flex-1">
        {header}
        <EmptyState title="Nothing matches" description="Try clearing filters or search." />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerClassName="gap-6 p-3">
      {header}
      {groups.map((group) => (
        <View key={group.title} className="gap-2">
          <SectionHeader title={group.title} count={group.movies.length} />
          {viewMode === 'grid' ? (
            <View className="flex-row flex-wrap gap-4">
              {group.movies.map((movie) => (
                <View key={movie.id} style={{ width: 110 }}>
                  <MovieCard movie={movie} variant="poster" onPress={onPress} highlighted={highlightedId === movie.id} />
                </View>
              ))}
            </View>
          ) : (
            <View className="gap-2">
              {group.movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} variant="row" onPress={onPress} highlighted={highlightedId === movie.id} />
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
