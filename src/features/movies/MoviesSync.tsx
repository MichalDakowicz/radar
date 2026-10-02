import { useMoviesRealtime } from '@/hooks/useMoviesRealtime';

// Renders nothing; mounted once from the root layout so the library has exactly
// one realtime channel however many screens read it.
export function MoviesSync() {
  useMoviesRealtime();
  return null;
}
