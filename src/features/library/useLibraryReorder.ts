import { useCallback } from 'react';

import { useMovies } from '@/hooks/useMovies';
import type { Movie } from '@/types/movie';

// Drag-to-reorder persistence - only meaningful while isReorderEnabled (custom
// sort, no group/search/filters, doc 03 Library). Replaces @dnd-kit's arrayMove
// + persisted customOrder with a plain RN reorderable list (doc 04 issue F/A).
export function useLibraryReorder() {
  const { updateMovie } = useMovies();

  const handleDragEnd = useCallback(
    (reordered: Movie[]) => {
      reordered.forEach((movie, index) => {
        if (movie.customOrder !== index) {
          void updateMovie(movie.id, { customOrder: index }, { silent: true });
        }
      });
    },
    [updateMovie],
  );

  return { handleDragEnd };
}
