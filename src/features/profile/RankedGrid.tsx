import { useState } from 'react';
import { View } from 'react-native';

import { RankedPoster } from '@/features/profile/RankedPoster';
import type { RankedEntry } from '@/lib/rankedYears';

type RankedGridProps = {
  entries: RankedEntry[];
  onOpen: (entry: RankedEntry) => void;
};

const GAP = 10;
/** Smallest poster that still reads as artwork; the column count follows from it. */
const MIN_POSTER = 84;

/**
 * A whole year's ranking as a wrapping poster grid — the shape a "best of"
 * list is read in. Wrapping rather than one long horizontal rail because a
 * ranking is scanned from the top down, and #14 should not be off-screen to
 * the right.
 *
 * The columns are measured off the grid's own width so the row fills it edge to
 * edge and stays left-aligned: a fixed poster width leaves a ragged margin on
 * anything wider than the phone it was picked on.
 */
export function RankedGrid({ entries, onOpen }: RankedGridProps) {
  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridWidth > 0 ? Math.max(3, Math.floor((gridWidth + GAP) / (MIN_POSTER + GAP))) : 3;
  const posterWidth = gridWidth > 0 ? Math.floor((gridWidth - GAP * (columns - 1)) / columns) : MIN_POSTER;

  return (
    <View
      className="w-full flex-row flex-wrap justify-start"
      style={{ rowGap: 14, columnGap: GAP }}
      onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
    >
      {entries.map((entry) => (
        <RankedPoster
          key={entry.movie.id}
          title={entry.movie.title}
          coverUrl={entry.movie.coverUrl}
          rank={entry.rank}
          score={entry.score}
          width={posterWidth}
          onPress={() => onOpen(entry)}
        />
      ))}
    </View>
  );
}
