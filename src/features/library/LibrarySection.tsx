import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { MediaCarousel } from '@/components/media/MediaCarousel';
import { MovieCard } from '@/components/media/MovieCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { Movie } from '@/types/movie';

// Continue watching / Coming soon (doc 06 #1) - full-width featured cards. A
// lone card renders as a plain full-width block (centered, no wasted edge); 2+
// go through the paging carousel, shrunk a touch so the next one peeks in.
// Coming soon can collapse (state persisted).
type LibrarySectionProps = {
  title: string;
  movies: Movie[];
  onPress: (movie: Movie) => void;
  highlightedId?: string | null;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showFullDate?: boolean;
};

export function LibrarySection({
  title,
  movies,
  onPress,
  highlightedId,
  collapsible,
  collapsed,
  onToggleCollapse,
  showFullDate,
}: LibrarySectionProps) {
  const { width } = useWindowDimensions();
  if (movies.length === 0) return null;

  const Chevron = collapsed ? ChevronDown : ChevronUp;
  const action = collapsible ? (
    <Pressable onPress={onToggleCollapse} hitSlop={10} className="p-1 active:opacity-70">
      <Chevron size={20} color="hsl(0 0% 63.9%)" />
    </Pressable>
  ) : undefined;

  return (
    <View className="gap-2 pb-8 pt-2">
      <SectionHeader title={title} count={movies.length} action={action} />
      {!collapsed &&
        (movies.length === 1 ? (
          <View className="px-4">
            <MovieCard
              movie={movies[0]}
              variant="featured"
              onPress={onPress}
              highlighted={highlightedId === movies[0].id}
              showFullDate={showFullDate}
            />
          </View>
        ) : (
          // 2+ → cards narrower than the viewport so ~32px of the next peeks.
          <MediaCarousel
            movies={movies}
            cardVariant="featured"
            cardWidth={width - 64}
            onPress={onPress}
            highlightedId={highlightedId}
            showFullDate={showFullDate}
          />
        ))}
    </View>
  );
}
