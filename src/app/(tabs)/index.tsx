import type { FlashListRef } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { LibraryFilterSheet } from '@/features/library/LibraryFilterSheet';
import { LibraryMainList } from '@/features/library/LibraryMainList';
import { LibrarySection } from '@/features/library/LibrarySection';
import { LibraryToolbar } from '@/features/library/LibraryToolbar';
import { useLibraryFilters } from '@/features/library/useLibraryFilters';
import { useMovies } from '@/hooks/useMovies';
import { MAX_W } from '@/hooks/useResponsive';
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useLibraryPrefs } from '@/store/libraryPrefs';
import { withTabReload } from '@/store/tabReload';
import type { Movie } from '@/types/movie';

// Thin composition layer only (doc 10) - all derive logic lives in
// useLibraryFilters, all durable prefs in the zustand+MMKV store, all
// rendering in the Library* components.
//
// Double-pressing the tab is "give me my library back", so it clears the
// persisted filters as well as the remount-scoped state (search, scroll). View
// mode, grid size and sort are deliberately left alone: those are how you like
// to look at the library, not a narrowing you need undone.
export default withTabReload(LibraryScreen, 'index', () => useLibraryPrefs.getState().resetFilters());

function LibraryScreen() {
  const router = useRouter();
  const { movies, loading, error } = useMovies();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    viewMode,
    gridSize,
    statusFilter,
    typeFilter,
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
    typeFilter,
    selectedServices,
    selectedGenres,
    selectedDirectors,
    selectedYears,
    sortBy,
    sortDir,
    recentlyAddedDays: settings.recentlyAddedDays,
    showRecentlyAdded: settings.showRecentlyAdded,
    ownedServices: settings.ownedServices,
  });

  // Searching, filtering or re-sorting replaces what the list is showing, so it
  // goes back to the top instead of leaving the user parked at an offset that
  // now points into the middle of a different result set.
  const listRef = useScrollToTopOnChange<FlashListRef<Movie>>(
    [searchQuery, statusFilter, typeFilter, sortBy, sortDir, selectedServices, selectedGenres, selectedDirectors, selectedYears]
      .map((part) => (Array.isArray(part) ? part.join(',') : part))
      .join('|'),
  );

  const filterSheetRef = useRef<BottomSheetModal>(null);

  const openMovie = (movie: Movie) => router.push({ pathname: '/edit/[movieId]', params: { movieId: movie.id } });

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState label="Loading your library…" />
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load your library'} />
      </View>
    );
  }

  const sections = (
    <>
      <LibrarySection title="Continue watching" movies={filters.continueWatching} onPress={openMovie} />
      <LibrarySection title="Recently added" movies={filters.recentlyAdded} onPress={openMovie} />
      <LibrarySection
        title="Coming soon"
        movies={filters.comingSoon}
        onPress={openMovie}
        collapsible
        collapsed={comingSoonCollapsed}
        onToggleCollapse={toggleComingSoonCollapsed}
        showFullDate
      />
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.grid}>
        <LibraryToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFilters={() => filterSheetRef.current?.present()}
        />
      </ContentShell>

      <ContentShell fill maxWidth={MAX_W.grid}>
        <LibraryMainList
          listRef={listRef}
          movies={filters.mainMovies}
          viewMode={viewMode}
          gridSize={gridSize}
          onPress={openMovie}
          ListHeaderComponent={sections}
        />
      </ContentShell>

      <LibraryFilterSheet ref={filterSheetRef} />
    </View>
  );
}
