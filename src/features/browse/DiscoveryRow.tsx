import { MediaCarousel } from '@/components/media/MediaCarousel';
import type { Movie } from '@/types/movie';

type DiscoveryRowProps = {
  title: string;
  badge?: string;
  items: Movie[];
  onPress: (movie: Movie) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

// One Browse category row (doc 03 `DiscoveryRow`, was ScrollingRow.jsx).
// showStatus suppressed: these are undiscovered TMDB items, not tracked
// library rows, so the status badge would lie (doc 12 `showStatus` toggle).
export function DiscoveryRow({ title, badge, items, onPress, onAdd, onRemove, isAdded }: DiscoveryRowProps) {
  return (
    <MediaCarousel
      title={title}
      badge={badge}
      movies={items}
      onPress={onPress}
      onAdd={onAdd}
      onRemove={onRemove}
      isAdded={isAdded}
      showStatus={false}
    />
  );
}
