import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { Header } from '@/components/layout/Header';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { LibraryFilterSheet } from '@/features/library/LibraryFilterSheet';
import { LibraryMainList } from '@/features/library/LibraryMainList';
import { LibrarySection } from '@/features/library/LibrarySection';
import { LibraryToolbar } from '@/features/library/LibraryToolbar';
import { RandomPickSheet } from '@/features/library/RandomPickSheet';
import { useLibraryFilters } from '@/features/library/useLibraryFilters';
import { useMovies } from '@/hooks/useMovies';
import { MAX_W } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useLibraryPrefs } from '@/store/libraryPrefs';
import { withTabReload } from '@/store/tabReload';
import type { Movie } from '@/types/movie';

// Thin composition layer only (doc 10) - all derive logic lives in
// useLibraryFilters, all durable prefs in the zustand+MMKV store, all
// rendering in the Library* components.
export default withTabReload(LibraryScreen, 'index');

function LibraryScreen() {
  const router = useRouter();
  const { movies, loading, error } = useMovies();
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const {
    viewMode,
    gridSize,
    statusFilter,
    selectedServices,
    selectedGenres,
    selectedDirectors,
    selectedYears,
    sortBy,
    sortDir,
    comingSoonCollapsed,
    toggleComingSoonCollapsed,
  } = useLibraryPrefs();
  const { settings } = useUserSettings();
  const filters = useLibraryFilters({
    movies,
    searchQuery,
    statusFilter,
    selectedServices,
    selectedGenres,
    selectedDirectors,
    selectedYears,
    sortBy,
    sortDir,
    recentlyAddedDays: settings.recentlyAddedDays,
    showRecentlyAdded: settings.showRecentlyAdded,
  });

  const filterSheetRef = useRef<BottomSheetModal>(null);
  const randomPickRef = useRef<BottomSheetModal>(null);

  const openMovie = (movie: Movie) => router.push({ pathname: '/edit/[movieId]', params: { movieId: movie.id } });

  const handleRandomSelect = (movie: Movie) => {
    randomPickRef.current?.dismiss();
    setHighlightedId(movie.id);
    openMovie(movie);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <LoadingState label="Loading your library…" />
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load your library'} />
      </View>
    );
  }

  const sections = (
    <>
      <LibrarySection title="Continue watching" movies={filters.continueWatching} onPress={openMovie} highlightedId={highlightedId} />
      <LibrarySection title="Recently added" movies={filters.recentlyAdded} onPress={openMovie} highlightedId={highlightedId} />
      <LibrarySection
        title="Coming soon"
        movies={filters.comingSoon}
        onPress={openMovie}
        highlightedId={highlightedId}
        collapsible
        collapsed={comingSoonCollapsed}
        onToggleCollapse={toggleComingSoonCollapsed}
        showFullDate
      />
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <Header onRandomPick={() => randomPickRef.current?.present()} maxWidth={MAX_W.grid} />
      <ContentShell maxWidth={MAX_W.grid}>
        <LibraryToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFilters={() => filterSheetRef.current?.present()}
        />
      </ContentShell>

      <ContentShell fill maxWidth={MAX_W.grid}>
        <LibraryMainList
          movies={filters.mainMovies}
          viewMode={viewMode}
          gridSize={gridSize}
          highlightedId={highlightedId}
          onPress={openMovie}
          ListHeaderComponent={sections}
        />
      </ContentShell>

      <LibraryFilterSheet ref={filterSheetRef} />
      <RandomPickSheet ref={randomPickRef} movies={filters.validPickMovies} onSelect={handleRandomSelect} />
    </View>
  );
}
