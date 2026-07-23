import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useMovies } from '@/hooks/useMovies';
import { useUserSettings } from '@/hooks/useUserSettings';
import { fetchMediaMetadata } from '@/lib/tmdb';
import { useTheme } from '@/theme/ThemeProvider';
import type { Movie } from '@/types/movie';

// Port of legacy RefreshMetadataContext.jsx: sequentially re-fetches TMDB
// metadata for every owned title and writes it back, keeping user-owned fields
// (ratings/watch flags/notes/dates) untouched. Runs in the provider stack so it
// survives navigation - the user can leave Settings and it keeps going. Writes
// go through updateMovie(..., { silent: true }) so a full refresh doesn't spam
// the activity log.

type RefreshProgress = { current: number; total: number };

type RefreshMetadataContextValue = {
  refreshing: boolean;
  progress: RefreshProgress;
  refresh: () => Promise<void>;
};

const RefreshMetadataContext = createContext<RefreshMetadataContextValue>({
  refreshing: false,
  progress: { current: 0, total: 0 },
  refresh: async () => {},
});

// Only the TMDB-sourced metadata columns are overwritten; everything the user
// owns is preserved by simply not being in the patch.
function metadataPatch(movie: Movie, fresh: NonNullable<Awaited<ReturnType<typeof fetchMediaMetadata>>>): Partial<Movie> {
  return {
    title: fresh.title || movie.title,
    coverUrl: fresh.coverUrl || movie.coverUrl,
    releaseDate: fresh.releaseDate || movie.releaseDate,
    genres: fresh.genres,
    director: fresh.director,
    cast: fresh.cast,
    overview: fresh.overview,
    runtime: fresh.runtime,
    voteAverage: fresh.voteAverage,
    voteCount: fresh.voteCount,
    imdbId: fresh.imdbId || movie.imdbId,
    numberOfSeasons: fresh.number_of_seasons ?? movie.numberOfSeasons,
    numberOfEpisodes: fresh.number_of_episodes ?? movie.numberOfEpisodes,
    tmdbStatus: fresh.tmdbStatus || movie.tmdbStatus,
    tagline: fresh.tagline || movie.tagline,
    budget: fresh.budget ?? movie.budget,
    revenue: fresh.revenue ?? movie.revenue,
    productionCompanies: fresh.productionCompanies?.length ? fresh.productionCompanies : movie.productionCompanies,
    availability: fresh.availability?.length ? fresh.availability : movie.availability,
  };
}

export function RefreshMetadataProvider({ children }: { children: React.ReactNode }) {
  const { movies, updateMovie } = useMovies();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { show } = useToast();
  const { theme, setTheme } = useTheme();

  // Cross-device theme sync: the runtime theme lives in ThemeProvider (MMKV,
  // instant/offline) but user_settings.theme is the durable source. Once the
  // server row loads, apply it if it differs from the local pick. One-way
  // (server -> local); changing the theme in Settings write-throughs to both,
  // so this never fights a local change.
  useEffect(() => {
    if (settingsLoading) return;
    if (settings.theme !== theme) setTheme(settings.theme);
    // Intentionally excludes `theme`: this reacts to the loaded server value,
    // not to every local toggle (which already persists itself).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.theme, settingsLoading, setTheme]);

  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<RefreshProgress>({ current: 0, total: 0 });
  const runningRef = useRef(false);

  const refresh = useCallback(async () => {
    if (runningRef.current) return;
    const list = movies.filter((m) => m.tmdbId != null);
    if (list.length === 0) {
      show('No titles with TMDB data to refresh.');
      return;
    }

    runningRef.current = true;
    setRefreshing(true);
    setProgress({ current: 0, total: list.length });

    let ok = 0;
    let failed = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        const movie = list[i];
        setProgress({ current: i + 1, total: list.length });
        try {
          const fresh = await fetchMediaMetadata(movie.tmdbId!, movie.type, settings.watchProviderCountry);
          if (fresh) {
            await updateMovie(movie.id, metadataPatch(movie, fresh), { silent: true });
            ok++;
          }
        } catch (err) {
          console.error(`Refresh failed for ${movie.title}:`, err);
          failed++;
        }
        // Gentle pacing so a large library doesn't hammer TMDB.
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      show(failed > 0 ? `Refreshed ${ok} titles · ${failed} failed.` : `Refreshed ${ok} titles.`);
    } finally {
      runningRef.current = false;
      setRefreshing(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [movies, settings.watchProviderCountry, updateMovie, show]);

  return (
    <RefreshMetadataContext.Provider value={{ refreshing, progress, refresh }}>{children}</RefreshMetadataContext.Provider>
  );
}

export function useRefreshMetadata() {
  return useContext(RefreshMetadataContext);
}
