import { useRouter } from 'expo-router';

import { MediaCarousel } from '@/components/media/MediaCarousel';
import { toDiscoveryMovie } from '@/features/browse/toDiscoveryMovie';
import type { MediaSummary } from '@/lib/tmdb';
import type { Movie } from '@/types/movie';

type SimilarRowProps = {
  title: string;
  items: MediaSummary[];
  findOwned: (tmdbId: number | null) => Movie | null;
};

// "Similar movies/shows" carousel (doc 03 Movie Detail `SimilarRow`) - reuses
// the one MediaCarousel/MovieCard, adapting raw TMDB summaries via toDiscoveryMovie.
export function SimilarRow({ title, items, findOwned }: SimilarRowProps) {
  const router = useRouter();
  if (items.length === 0) return null;

  const openSimilar = (movie: Movie) => {
    const owned = findOwned(movie.tmdbId);
    if (owned) router.push({ pathname: '/edit/[movieId]', params: { movieId: owned.id } });
    else router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(movie.tmdbId), type: movie.type } });
  };

  return (
    <MediaCarousel title={title} movies={items.map(toDiscoveryMovie)} onPress={openSimilar} showStatus={false} showRatings={false} />
  );
}
