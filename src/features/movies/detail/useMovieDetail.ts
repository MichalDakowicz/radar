import { useRouter } from 'expo-router';

import { useToast } from '@/components/ui/Toast';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { useEditMovieForm } from '@/features/movies/edit/useEditMovieForm';
import { useMovies } from '@/hooks/useMovies';
import { useMediaMetadata, useSimilarMedia } from '@/hooks/useTmdb';
import { goBackOrHome } from '@/lib/utils';
import type { MediaType, NamedRef, ProductionCompany } from '@/types/movie';

// Everything the catalogue side of the screen renders, merged from TMDB and
// the stored row. TMDB wins where both have an answer: since none of these
// fields are user-editable anymore, the live catalogue is simply more current
// than whatever was cached when the title was added.
export type DetailDisplay = {
  title: string;
  tagline: string;
  coverUrl: string | null;
  releaseDate: string | null;
  director: NamedRef[];
  overview: string;
  runtime: number;
  genres: NamedRef[];
  cast: NamedRef[];
  availability: string[];
  budget: number;
  voteAverage: number;
  productionCompanies: ProductionCompany[];
};

type UseMovieDetailArgs = {
  tmdbId: number | null;
  type: MediaType;
  movieId?: string;
};

export function useMovieDetail({ tmdbId, type, movieId }: UseMovieDetailArgs) {
  const router = useRouter();
  const { show } = useToast();
  const { movies } = useMovies();
  const quickAdd = useQuickAdd();

  const owned = movieId ? (movies.find((m) => m.id === movieId) ?? null) : quickAdd.findByTmdbId(tmdbId);
  const mediaType = owned?.type ?? type;
  // Owned titles fetch their metadata too - that is what closes the gap where
  // the library view was missing budget, production companies and cast.
  const catalogueId = owned?.tmdbId ?? tmdbId;
  const { data: metadata, isLoading, isError, refetch } = useMediaMetadata(catalogueId, mediaType);
  const { data: similar = [] } = useSimilarMedia(catalogueId, mediaType);

  const editForm = useEditMovieForm(owned ?? undefined);
  const form = editForm.form;

  const display: DetailDisplay = {
    title: metadata?.title || form?.title || owned?.title || '',
    tagline: metadata?.tagline || owned?.tagline || '',
    coverUrl: metadata?.coverUrl || form?.coverUrl || owned?.coverUrl || null,
    releaseDate: metadata?.releaseDate || form?.releaseDate || null,
    director: metadata?.director?.length ? metadata.director : (form?.director ?? owned?.director ?? []),
    overview: metadata?.overview || form?.overview || '',
    runtime: metadata?.runtime || form?.runtime || 0,
    genres: metadata?.genres?.length ? metadata.genres : (form?.genres ?? owned?.genres ?? []),
    cast: metadata?.cast?.length ? metadata.cast : (form?.cast ?? owned?.cast ?? []),
    availability: metadata?.availability?.length ? metadata.availability : (form?.availability ?? []),
    budget: metadata?.budget || owned?.budget || 0,
    voteAverage: metadata?.voteAverage || form?.voteAverage || 0,
    productionCompanies: metadata?.productionCompanies?.length
      ? metadata.productionCompanies
      : (owned?.productionCompanies ?? []),
  };

  const addToLibrary = async () => {
    if (!catalogueId) return;
    await quickAdd.add(catalogueId, mediaType);
    show(`Added "${display.title}" to Watchlist`);
  };

  const removeFromLibrary = async () => {
    const target = owned;
    if (!target) return;
    // Stay on the title rather than bouncing back to the library. The same
    // screen re-renders in its not-yet-owned state, so an accidental removal
    // is one tap from being undone - but /edit/[movieId] resolves by local id
    // and would 404 once the row is gone, so that entry point hands over to
    // /movie/[tmdbId]/[type] first. Manual entries have no such route.
    if (movieId && target.tmdbId) {
      router.replace({
        pathname: '/movie/[tmdbId]/[type]',
        params: { tmdbId: String(target.tmdbId), type: target.type },
      });
    }
    await editForm.remove();
    show(`Removed "${target.title}" from your library`);
    if (movieId && !target.tmdbId) goBackOrHome(router);
  };

  return {
    owned,
    form,
    editForm,
    display,
    similar,
    mediaType,
    findOwned: quickAdd.findByTmdbId,
    pending: catalogueId != null && quickAdd.pendingTmdbId === catalogueId,
    // Only titles we have nothing stored for need to block on the network.
    isLoading: !owned && isLoading,
    isError: !owned && (isError || !metadata),
    isFormLoading: !!owned && !form,
    refetch,
    addToLibrary,
    removeFromLibrary,
  };
}
