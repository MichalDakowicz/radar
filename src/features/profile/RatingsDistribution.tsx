import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { smoothPath, type CurvePoint } from '@/lib/curvePath';
import type { RatingDistribution } from '@/lib/ratingDistribution';
import { formatScore } from '@/lib/socialFeed';

const AMBER = '#fbbf24';
const LINE = 'hsl(0 0% 92%)';
/** Drawing band, in px. The curve is a shape, not a readable count. */
const CURVE_HEIGHT = 72;
/** Room for the stroke so a peak is not sliced off at the top. */
const STROKE = 2;

type RatingsDistributionProps = {
  distribution: RatingDistribution;
};

/**
 * How you rate, as a curve: one point every tenth of a star, one star at the low
 * end and five at the high end instead of a numbered axis.
 *
 * Scaled against its own tallest point rather than against the library size - a
 * shelf that rates almost everything 4 would otherwise be one spike on a flat
 * line. Width comes from a layout pass because the path is built in px: stretching
 * a fixed viewBox to fit would stretch the stroke with it.
 */
export function RatingsDistribution({ distribution }: RatingsDistributionProps) {
  const { points, rated, average } = distribution;
  const [width, setWidth] = useState(0);

  // Nothing rated is not a flat curve, it is no curve: an empty card would read
  // as "you rate everything 0".
  if (rated === 0) return null;

  const max = Math.max(...points.map((p) => p.density), 1);
  const top = STROKE / 2;
  const bottom = CURVE_HEIGHT - STROKE / 2;
  const curve: CurvePoint[] = points.map((point, i) => ({
    x: (i / (points.length - 1)) * width,
    y: bottom - (point.density / max) * (bottom - top),
  }));

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
        <View
          className="flex-1 border-b border-border/60"
          style={{ height: CURVE_HEIGHT }}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          {width > 0 && (
            <Svg width={width} height={CURVE_HEIGHT}>
              <Path
                d={smoothPath(curve, [top, bottom])}
                stroke={LINE}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          )}
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
