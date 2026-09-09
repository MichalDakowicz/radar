import { View } from 'react-native';

import { useMeasuredWidth } from '@/hooks/useResponsive';
import type { LeavingTitle } from '@/lib/leaving';
import { POSTER_GRID_GAP, posterGridMetrics } from '@/lib/posterGrid';

import { LeavingCard } from './LeavingCard';

// Measures itself rather than taking a width. Handing it a width measured on
// some ancestor is how the grid ended up three narrow posters and a column of
// dead space: the node that was measured included padding the grid never gets.
// The container that lays the cards out is the only one whose width is the
// right answer.

type LeavingGridProps = {
  titles: LeavingTitle[];
  onPress: (entry: LeavingTitle) => void;
};

export function LeavingGrid({ titles, onPress }: LeavingGridProps) {
  const { width, onLayout } = useMeasuredWidth();
  const { cardWidth } = posterGridMetrics(width);

  return (
    <View onLayout={onLayout} className="flex-row flex-wrap" style={{ gap: POSTER_GRID_GAP }}>
      {titles.map((entry) => (
        <LeavingCard
          key={`${entry.mediaType}-${entry.tmdbId}`}
          entry={entry}
          width={cardWidth}
          onPress={onPress}
        />
      ))}
    </View>
  );
}
