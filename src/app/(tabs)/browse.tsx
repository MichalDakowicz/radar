import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Header } from '@/components/layout/Header';
import { useToast } from '@/components/ui/Toast';
import { BottomSheetModal } from '@/components/ui/Sheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { BrowseHero } from '@/features/browse/BrowseHero';
import { BrowseResultFilterSheet } from '@/features/browse/BrowseResultFilterSheet';
import { BrowseSearchBar } from '@/features/browse/BrowseSearchBar';
import { BrowseTabs } from '@/features/browse/BrowseTabs';
import { DiscoveryRow } from '@/features/browse/DiscoveryRow';
import { ReleaseCalendar } from '@/features/browse/ReleaseCalendar';
import { SearchResultsGrid } from '@/features/browse/SearchResultsGrid';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import { useBrowseSearch } from '@/features/browse/useBrowseSearch';
import { type BrowseTabId, useDiscoveryFeed } from '@/features/browse/useDiscoveryFeed';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { useUserSettings } from '@/hooks/useUserSettings';
import * as tmdb from '@/lib/tmdb';
import type { Movie } from '@/types/movie';

// Thin composition layer only (doc 10) - discovery logic lives in
// useDiscoveryFeed, search in useBrowseSearch, mutation in useQuickAdd.
export default function Browse() {
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<BrowseTabId>('movies');
  const [rerollNonce, setRerollNonce] = useState(0);
  const search = useBrowseSearch();
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const region = useUserSettings().settings.watchProviderCountry;

  const quickAdd = useQuickAdd();
  // Calendar isn't a discovery feed - keep the feed/hero on the last media tab
  // so switching back to Movies/TV hits warm cache instead of refetching.
  const feedTab = tab === 'calendar' ? 'movies' : tab;
  const feed = useDiscoveryFeed(feedTab, rerollNonce, quickAdd.movies);
  const categories = feed.data?.pages.flat() ?? [];

  // Hero shows popular titles for the active tab, independent of the seeded
  // first discovery row (which reshuffles on every reroll).
  const heroQuery = useQuery({
    queryKey: ['hero-popular', feedTab],
    queryFn: async () => {
      const items = feedTab === 'tv' ? await tmdb.getTVShows('popular') : await tmdb.getMovies('popular');
      return items.map(toDiscoveryMovie);
    },
    staleTime: 60 * 60 * 1000,
  });
  const heroItems = heroQuery.data ?? [];
  const isAdded = (movie: Movie) => quickAdd.isAdded(movie.tmdbId);

  const handleAdd = (movie: Movie) => {
    if (!movie.tmdbId) return;
    quickAdd.add(movie.tmdbId, movie.type, region);
    show('Added to Watchlist');
  };

  const handleRemove = (movie: Movie) => {
    if (!movie.tmdbId) return;
    quickAdd.remove(movie.tmdbId);
    show('Removed from library');
  };

  const openMedia = (movie: Movie) => {
    const owned = quickAdd.findByTmdbId(movie.tmdbId);
    if (owned) router.push({ pathname: '/edit/[movieId]', params: { movieId: owned.id } });
    else router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(movie.tmdbId), type: movie.type } });
  };

  const openPerson = (personId: number, department: string) => {
    if (department === 'Directing') router.push({ pathname: '/director/[id]', params: { id: String(personId) } });
    else router.push({ pathname: '/actor/[id]', params: { id: String(personId) } });
  };

  const openGenre = (genreId: number) => router.push({ pathname: '/genre/[id]', params: { id: String(genreId) } });

  if (feed.isLoading && categories.length === 0 && !search.isSearching && tab !== 'calendar') {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <LoadingState label="Loading discover feed…" />
      </View>
    );
  }
  if (feed.isError && categories.length === 0 && tab !== 'calendar') {
    return (
      <View className="flex-1 bg-background">
        <Header />
        <ErrorState message="Failed to load Browse" onRetry={() => feed.refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header />
      <BrowseSearchBar
        value={search.query}
        onChange={search.setQuery}
        loading={search.isLoading}
        activeFilterCount={search.resultFilter === 'All' ? 0 : 1}
        onOpenFilters={() => filterSheetRef.current?.present()}
      />

      {search.isSearching ? (
        <SearchResultsGrid
          results={search.results}
          onSelectMedia={openMedia}
          onSelectPerson={openPerson}
          onSelectGenre={openGenre}
          onAdd={handleAdd}
          onRemove={handleRemove}
          isAdded={isAdded}
        />
      ) : tab === 'calendar' ? (
        <View className="flex-1">
          <View className="bg-background px-4 pb-2 pt-3">
            <View className="mx-auto w-full max-w-md">
              <BrowseTabs active={tab} onChange={setTab} />
            </View>
          </View>
          <ReleaseCalendar onPress={openMedia} onAdd={handleAdd} onRemove={handleRemove} isAdded={isAdded} />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="gap-8 pb-12"
          stickyHeaderIndices={[1]}
          refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => setRerollNonce((n) => n + 1)} />}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 600;
            if (nearBottom && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          scrollEventThrottle={200}
        >
          {/* Legacy Browse order: full-bleed hero at the top, then the Movies/TV
              switch as a centered sticky control below it (Browse.jsx). */}
          <BrowseHero items={heroItems} onPress={openMedia} onAdd={handleAdd} onRemove={handleRemove} isAdded={isAdded} />
          <View className="bg-background px-4 pb-2 pt-3">
            <View className="mx-auto w-full max-w-md">
              <BrowseTabs active={tab} onChange={setTab} />
            </View>
          </View>
          {categories.map((category) => (
            <DiscoveryRow
              key={category.id}
              title={category.title}
              badge={category.badge}
              items={category.items}
              onPress={openMedia}
              onAdd={handleAdd}
              onRemove={handleRemove}
              isAdded={isAdded}
            />
          ))}
          {feed.isFetchingNextPage && <LoadingState label="Loading more…" />}
        </ScrollView>
      )}

      <BrowseResultFilterSheet ref={filterSheetRef} value={search.resultFilter} onChange={search.setResultFilter} />
    </View>
  );
}
