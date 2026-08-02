import type { FlashListRef } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useToast } from '@/components/ui/Toast';
import { BottomSheetModal } from '@/components/ui/Sheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { BrowseHero } from '@/features/browse/BrowseHero';
import { BrowseResultFilterSheet } from '@/features/browse/BrowseResultFilterSheet';
import { BrowseSearchBar } from '@/features/browse/BrowseSearchBar';
import { BrowseTabs } from '@/features/browse/BrowseTabs';
import { DiscoveryRow } from '@/features/browse/DiscoveryRow';
import { heroPopularOptions } from '@/features/browse/heroQuery';
import { ReleaseCalendar } from '@/features/browse/ReleaseCalendar';
import { SearchResultsGrid } from '@/features/browse/SearchResultsGrid';
import { useBrowseSearch } from '@/features/browse/useBrowseSearch';
import { type BrowseTabId, useDiscoveryFeed } from '@/features/browse/useDiscoveryFeed';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useCenteredContentStyle } from '@/hooks/useResponsive';
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { BrowseSearchResult } from '@/lib/tmdb';
import { withTabReload } from '@/store/tabReload';
import type { Movie } from '@/types/movie';

// Thin composition layer only (doc 10) - discovery logic lives in
// useDiscoveryFeed, search in useBrowseSearch, mutation in useQuickAdd.
export default withTabReload(Browse, 'browse');

function Browse() {
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<BrowseTabId>('movies');
  const [rerollNonce, setRerollNonce] = useState(0);
  const search = useBrowseSearch();
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const region = useUserSettings().settings.watchProviderCountry;

  // A new query or result-type filter replaces the grid's contents, so it
  // starts at the top rather than keeping the previous search's offset.
  const searchListRef = useScrollToTopOnChange<FlashListRef<BrowseSearchResult>>(`${search.query}|${search.resultFilter}`);

  const quickAdd = useQuickAdd();
  // Feed stays edge-to-edge on phones; on desktop it's a centred column so the
  // hero and the rows don't stretch across an ultrawide monitor.
  const feedContentStyle = useCenteredContentStyle(MAX_W.grid);
  const navBarSpace = useNavBarSpace();
  // Calendar isn't a discovery feed - keep the feed/hero on the last media tab
  // so switching back to Movies/TV hits warm cache instead of refetching.
  const feedTab = tab === 'calendar' ? 'movies' : tab;
  const feed = useDiscoveryFeed(feedTab, rerollNonce, quickAdd.movies);
  const categories = feed.data?.pages.flat() ?? [];

  // Hero shows popular titles for the active tab, independent of the seeded
  // first discovery row (which reshuffles on every reroll).
  const heroQuery = useQuery(heroPopularOptions(feedTab));
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
        <ScreenTop />
        <LoadingState label="Loading discover feed…" />
      </View>
    );
  }
  if (feed.isError && categories.length === 0 && tab !== 'calendar') {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <ErrorState message="Failed to load Browse" onRetry={() => feed.refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.grid}>
        <BrowseSearchBar
          value={search.query}
          onChange={search.setQuery}
          loading={search.isLoading}
          activeFilterCount={search.resultFilter === 'All' ? 0 : 1}
          onOpenFilters={() => filterSheetRef.current?.present()}
        />
      </ContentShell>

      {search.isSearching ? (
        <ContentShell fill maxWidth={MAX_W.grid}>
          <SearchResultsGrid
            listRef={searchListRef}
            results={search.results}
            onSelectMedia={openMedia}
            onSelectPerson={openPerson}
            onSelectGenre={openGenre}
            onAdd={handleAdd}
            onRemove={handleRemove}
            isAdded={isAdded}
          />
        </ContentShell>
      ) : tab === 'calendar' ? (
        <ContentShell fill maxWidth={MAX_W.grid}>
          <View className="bg-background px-4 pb-2 pt-3">
            <View className="mx-auto w-full max-w-md">
              <BrowseTabs active={tab} onChange={setTab} />
            </View>
          </View>
          <ReleaseCalendar onPress={openMedia} onAdd={handleAdd} onRemove={handleRemove} isAdded={isAdded} />
        </ContentShell>
      ) : (
        <ScrollView
          contentContainerClassName="gap-8"
          contentContainerStyle={[feedContentStyle, { paddingBottom: navBarSpace + 16 }]}
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
