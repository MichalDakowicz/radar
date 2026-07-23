import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { MediaCarousel } from '@/components/media/MediaCarousel';
import type { Movie } from '@/types/movie';

// "Masterpieces" (formerly Hall of Fame, doc 06 #4) - the perfect-score shelf.
// Criterion: overall rounds to exactly 5.0 (4.9 / 5.1 auto-calc noise excluded).
// Sort: most recently perfected first (completedAt desc), addedAt asc fallback.
export function selectMasterpieces(movies: Movie[]): Movie[] {
  return movies
    .filter((m) => {
      const overall = m.ratings?.overall;
      return overall != null && Math.round(overall * 10) / 10 >= 5;
    })
    .sort((a, b) => {
      if (a.completedAt && b.completedAt) return b.completedAt.localeCompare(a.completedAt);
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return a.addedAt.localeCompare(b.addedAt);
    });
}

type MasterpiecesProps = {
  movies: Movie[];
  onPress?: (movie: Movie) => void;
};

export function Masterpieces({ movies, onPress }: MasterpiecesProps) {
  const [view, setView] = useState<'movie' | 'tv'>('movie');
  const isMovieView = view === 'movie';
  const items = selectMasterpieces(movies).filter((m) => m.type === view);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <Trophy size={20} color="white" />
          <Text className="text-xl font-bold text-foreground">Masterpieces</Text>
          {items.length > 0 && <Text className="text-sm font-normal text-muted-foreground">({items.length})</Text>}
        </View>
        <Text
          onPress={() => setView(isMovieView ? 'tv' : 'movie')}
          className={`overflow-hidden rounded-lg px-3 py-1.5 text-xs font-medium ${
            isMovieView ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
          }`}
        >
          {isMovieView ? 'Movies' : 'TV Shows'}
        </Text>
      </View>

      {items.length === 0 ? (
        <View className="mx-4 rounded-xl border border-border bg-secondary/30 px-4 py-6">
          <Text className="text-center text-sm text-muted-foreground">
            No perfect {isMovieView ? 'movies' : 'TV shows'} yet — rate something 5/5 to induct it.
          </Text>
        </View>
      ) : (
        <MediaCarousel movies={items} cardVariant="poster" showRatings onPress={onPress} readOnly />
      )}
    </View>
  );
}
