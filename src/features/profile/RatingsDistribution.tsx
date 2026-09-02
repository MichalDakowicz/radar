import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { RatingDistribution } from '@/lib/ratingDistribution';
import { formatScore } from '@/lib/socialFeed';

const AMBER = '#fbbf24';
/** Tallest a bar can draw, in px - the row is a fixed band, not a page-scaled one. */
const BAR_HEIGHT = 64;
/** An empty bucket still draws a hairline, so the gaps in the curve read as gaps. */
const BAR_FLOOR = 2;

type RatingsDistributionProps = {
  distribution: RatingDistribution;
};

/**
 * How you rate, as a curve: one half-star bucket per bar, one star at the low
 * end and five at the high end instead of a numbered axis (Letterboxd's shape).
 *
 * Bars are scaled against the fullest bucket rather than against the library
 * size - a shelf that rates almost everything 4 would otherwise be one bar and
 * nine flat lines.
 */
export function RatingsDistribution({ distribution }: RatingsDistributionProps) {
  const { buckets, rated, average } = distribution;
  // Nothing rated is not a flat histogram, it is no histogram: an empty card
  // would read as "you rate everything 0".
  if (rated === 0) return null;

  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ratings</Text>
        <Text className="ml-auto text-[11px] text-muted-foreground">
          {rated} rated{average == null ? '' : ` · ${formatScore(average)} avg`}
        </Text>
      </View>

      <View
        className="flex-row items-end gap-2"
        accessibilityRole="image"
        accessibilityLabel={
          average == null
            ? `Ratings spread across ${rated} titles`
            : `Ratings spread across ${rated} titles, averaging ${formatScore(average)} out of 5`
        }
      >
        <Star size={13} color={AMBER} fill={AMBER} />
        <View className="flex-1 flex-row items-end gap-[3px]" style={{ height: BAR_HEIGHT }}>
          {buckets.map((bucket) => (
            <View
              key={bucket.value}
              className="flex-1 rounded-t-[3px] bg-foreground/70"
              style={{ height: Math.max(Math.round((bucket.count / max) * BAR_HEIGHT), BAR_FLOOR) }}
            />
          ))}
        </View>
        <View className="flex-row gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={13} color={AMBER} fill={AMBER} />
          ))}
        </View>
      </View>
    </View>
  );
}
