import { useMemo, useState } from 'react';

import { useMovies } from '@/hooks/useMovies';
import { duplicateRowCount, findDuplicates } from '@/lib/duplicates';

/**
 * The merge half of the duplicates tool: reads the cached library, and on
 * demand folds each group's history onto one row and deletes the rest.
 *
 * Sequential rather than parallel - the writes are few (a handful of groups at
 * most) and a burst of concurrent deletes against the same table buys nothing
 * but a harder failure to explain.
 */
export function useDuplicateCleanup() {
  const { movies, updateMovie, removeMovie } = useMovies();
  const [merging, setMerging] = useState(false);

  const groups = useMemo(() => findDuplicates(movies), [movies]);
  const extraRows = duplicateRowCount(groups);

  const merge = async () => {
    if (merging || groups.length === 0) return { merged: 0 };
    setMerging(true);
    try {
      let merged = 0;
      for (const group of groups) {
        // The patch lands first: if a delete fails after it, the survivor
        // already holds the history and the leftover row can be merged again.
        if (Object.keys(group.patch).length > 0) {
          await updateMovie(group.keep.id, group.patch, { silent: true });
        }
        for (const row of group.remove) {
          await removeMovie(row.id);
          merged += 1;
        }
      }
      return { merged };
    } finally {
      setMerging(false);
    }
  };

  return { groups, extraRows, merging, merge };
}
