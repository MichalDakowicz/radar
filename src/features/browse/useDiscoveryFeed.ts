import { type QueryClient, useInfiniteQuery } from '@tanstack/react-query';

import * as tmdb from '@/lib/tmdb';
import type { MediaType, Movie } from '@/types/movie';

import { mulberry32, seededPick, seededShuffle } from './seededRandom';
import { toDiscoveryMovie } from './toDiscoveryMovie';

export type BrowseTabId = 'movies' | 'tv' | 'calendar';

export type DiscoveryCategory = { id: string; title: string; items: Movie[]; badge?: string };

const MAX_BATCHES = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

type CategoryDef = { title: string; badge?: string; fetch: () => Promise<tmdb.CatalogItem[] | tmdb.MediaSummary[]> };

// Counts the user's own genres for the active tab's media type. Movie.genres
// is typed as NamedRef[], but doc 02 warns legacy string[] can still show up
// at runtime - skip anything that isn't the expected shape.
function genreCounts(movies: Movie[], type: MediaType) {
  const counts = new Map<number, { id: number; name: string; count: number }>();
  for (const m of movies) {
    if (m.type !== type) continue;
    for (const g of m.genres) {
      if (typeof g !== 'object' || g.id == null) continue;
      const entry = counts.get(g.id) ?? { id: g.id, name: g.name, count: 0 };
      entry.count++;
      counts.set(g.id, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

async function fetchCategoryItems(fetch: CategoryDef['fetch']): Promise<Movie[]> {
  try {
    const items = await fetch();
    return items.slice(0, 20).map(toDiscoveryMovie);
  } catch {
    return [];
  }
}

const BASE_CANDIDATES: Record<'movies' | 'tv', CategoryDef[]> = {
  movies: [
    { title: 'Trending Now', fetch: () => tmdb.getTrending() },
    { title: 'Top Rated Movies', fetch: () => tmdb.getMovies('top_rated') },
    { title: 'Popular Movies', fetch: () => tmdb.getMovies('popular') },
  ],
  tv: [
    { title: 'Popular TV Shows', fetch: () => tmdb.getTVShows('popular') },
    { title: 'Top Rated TV', fetch: () => tmdb.getTVShows('top_rated') },
    { title: 'Airing Today', fetch: () => tmdb.getTVShows('airing_today') },
    { title: 'Currently Airing', fetch: () => tmdb.getTVShows('on_the_air') },
  ],
};

async function buildBatch(tab: BrowseTabId, movies: Movie[], seed: number): Promise<DiscoveryCategory[]> {
  const type: MediaType = tab === 'tv' ? 'tv' : 'movie';
  const rand = mulberry32(seed);

  const [allGenres, base] = [await tmdb.getGenres(type), seededPick(BASE_CANDIDATES[type === 'tv' ? 'tv' : 'movies'], rand)!];

  const userGenres = genreCounts(movies, type);
  const heavyGenreIds = new Set(userGenres.filter((g) => g.count >= 15).map((g) => g.id));
  const discoveryGenres = seededShuffle(
    allGenres.filter((g) => !heavyGenreIds.has(g.id)),
    rand,
  ).slice(0, 2 + Math.floor(rand() * 2));

  const defs: CategoryDef[] = [
    base,
    ...userGenres.slice(0, 5).map((g) => ({
      title: `${g.name} ${type === 'tv' ? 'Shows' : 'Movies'}`,
      fetch: () => tmdb.getMoviesByGenre(g.id, type),
    })),
    ...discoveryGenres.map((g) => ({
      title: `Discover ${g.name}`,
      badge: 'Discovery',
      fetch: () => tmdb.getMoviesByGenre(g.id, type),
    })),
  ];

  const categories = await Promise.all(
    seededShuffle(defs, rand).map(async (def, i) => ({
      id: `${tab}-${seed}-${i}-${def.title}`,
      title: def.title,
      badge: def.badge,
      items: await fetchCategoryItems(def.fetch),
    })),
  );

  // "Because you liked X" - based on one seeded 4-5* title (doc 03 Browse).
  const topRated = movies.filter((m) => m.type === type && m.watched && (m.ratings.overall ?? 0) >= 4);
  const recSeed = seededPick(topRated, rand);
  if (recSeed?.tmdbId) {
    const similar = await fetchCategoryItems(() => tmdb.getSimilarMovies(recSeed.tmdbId as number, type));
    if (similar.length) {
      categories.push({ id: `${tab}-${seed}-rec`, title: `Because you liked "${recSeed.title}"`, badge: 'For you', items: similar });
    }
  }

  return categories.filter((c) => c.items.length > 0);
}

// Seed is stable per day/tab/reroll so revisiting Browse hits the cache. Note
// `movies` is NOT in the key: personalization rides along inside queryFn, so a
// preload warmed with the real library (see prefetchDiscoveryFeed) is reused by
// the live query under the same key.
function discoverySeed(rerollNonce: number) {
  return Math.floor(Date.now() / DAY_MS) * 1000 + rerollNonce;
}

function discoveryFeedOptions(tab: BrowseTabId, movies: Movie[], rerollNonce: number) {
  const seed = discoverySeed(rerollNonce);
  return {
    queryKey: ['discovery', tab, seed],
    initialPageParam: 0,
    getNextPageParam: (_last: DiscoveryCategory[], pages: DiscoveryCategory[][]) =>
      pages.length < MAX_BATCHES ? pages.length : undefined,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: ({ pageParam }: { pageParam: number }) => buildBatch(tab, movies, seed + pageParam * 7919),
  };
}

/**
 * Seeded + react-query cached discovery feed (doc 04-B fix): the legacy
 * `generateCategories()` reshuffled with `Math.random()`/`Date.now()` on every
 * mount, so content (and scroll restore) broke on every Browse visit. Here the
 * shuffle seed is `day * 1000 + rerollNonce`, so the same day/tab/reroll always
 * produces the same pages - revisiting Browse hits the cache, and pull-to-
 * refresh (bumping rerollNonce) is the only way to get new rows.
 */
export function useDiscoveryFeed(tab: BrowseTabId, rerollNonce: number, movies: Movie[]) {
  return useInfiniteQuery<DiscoveryCategory[], Error, { pages: DiscoveryCategory[][] }, unknown[], number>(
    discoveryFeedOptions(tab, movies, rerollNonce),
  );
}

// Warm the first Browse page before the user ever taps the tab. Uses reroll 0
// (the default the screen mounts with) so the warmed pages are exactly what
// useDiscoveryFeed asks for. prefetchInfiniteQuery only fetches the first page.
export function prefetchDiscoveryFeed(queryClient: QueryClient, tab: BrowseTabId, movies: Movie[]) {
  return queryClient.prefetchInfiniteQuery(discoveryFeedOptions(tab, movies, 0));
}
