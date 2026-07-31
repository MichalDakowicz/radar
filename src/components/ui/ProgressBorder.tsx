import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { progressDash, roundedRectPathReverse, roundedRectPerimeter } from '@/lib/progressBorder';

type ProgressBorderProps = {
  /** 0-1. How far around the card the stroke travels. */
  progress: number;
  color: string;
  /** Match the parent's rounding, or the stroke will not sit on its edge. */
  radius?: number;
  strokeWidth?: number;
};

// Draws a partial border around whatever it is placed inside: the parent keeps
// its own faint full border as the track, and this strokes over it as far as
// the value goes. Sized from onLayout because the dash lengths depend on the
// real pixel perimeter, which Tailwind classes never expose.
export function ProgressBorder({ progress, color, radius = 12, strokeWidth = 2 }: ProgressBorderProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // The stroke straddles the path, so inset by half its width to keep it inside
  // the card rather than bleeding over the edge.
  const inset = strokeWidth / 2;
  const w = Math.max(0, size.width - strokeWidth);
  const h = Math.max(0, size.height - strokeWidth);
  const [filled, gap] = progressDash(roundedRectPerimeter(w, h, radius), progress);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {w > 0 && h > 0 && (
        <Svg width={size.width} height={size.height}>
          <Path
            d={roundedRectPathReverse(inset, inset, w, h, radius)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${gap}`}
          />
        </Svg>
      )}
    </View>
  );
}
