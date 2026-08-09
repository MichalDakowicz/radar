import { View } from 'react-native';

import { RankedPoster } from '@/features/profile/RankedPoster';
import type { RankedEntry } from '@/lib/rankedYears';

type RankedGridProps = {
  entries: RankedEntry[];
  onOpen: (entry: RankedEntry) => void;
};

/**
 * A whole year's ranking as a wrapping poster grid — the shape a "best of"
 * list is read in. Wrapping rather than one long horizontal rail because a
 * ranking is scanned from the top down, and #14 should not be off-screen to
 * the right.
 */
export function RankedGrid({ entries, onOpen }: RankedGridProps) {
  return (
    <View className="flex-row flex-wrap justify-center" style={{ rowGap: 14, columnGap: 10 }}>
      {entries.map((entry) => (
        <RankedPoster
          key={entry.movie.id}
          title={entry.movie.title}
          coverUrl={entry.movie.coverUrl}
          rank={entry.rank}
          score={entry.score}
          onPress={() => onOpen(entry)}
        />
      ))}
    </View>
  );
}
