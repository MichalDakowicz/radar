import { useLocalSearchParams } from 'expo-router';

import { MovieDetailScreen } from '@/features/movies/detail/MovieDetailScreen';
import type { MediaType } from '@/types/movie';

// Not-yet-owned movie/show entry point (doc 03 Movie/Show Detail, doc 12
// part 1 unify) - renders the shared MovieDetailScreen, which also takes
// over showing watch-status/rating controls in place the moment Add flips
// this title into the library (no navigation to a separate Edit screen).
export default function MovieDetails() {
  const { tmdbId, type } = useLocalSearchParams<{ tmdbId: string; type: MediaType }>();
  const mediaType: MediaType = type === 'tv' ? 'tv' : 'movie';

  return <MovieDetailScreen tmdbId={Number(tmdbId)} type={mediaType} />;
}
