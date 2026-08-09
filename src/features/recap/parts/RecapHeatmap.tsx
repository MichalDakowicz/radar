import { Text, View, useWindowDimensions } from 'react-native';

import { HEAT_COLORS, MONO, RECAP } from '@/features/recap/recapTheme';
import type { HeatLevel } from '@/lib/recap';

const GAP = 2.2;
const H_PADDING = 52; // the slide card's 26px each side

type RecapHeatmapProps = { weeks: HeatLevel[][] };

/**
 * The year grid. Cell size is solved from the real screen width rather than
 * fixed: 53 columns have to fit exactly, and a hardcoded 3.4px cell would either
 * wrap or leave a gutter depending on the device.
 */
export function RecapHeatmap({ weeks }: RecapHeatmapProps) {
  const { width } = useWindowDimensions();
  const columns = Math.max(1, weeks.length);
  const cell = Math.max(2, (width - H_PADDING - (columns - 1) * GAP) / columns);

  return (
    <View>
      <View className="flex-row" style={{ gap: GAP }}>
        {weeks.map((week, w) => (
          <View key={w} style={{ gap: GAP }}>
            {week.map((level, d) => (
              <View
                key={d}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 1,
                  // -1 is padding either side of 1 January / 31 December: drawn as
                  // nothing at all rather than as a quiet day.
                  backgroundColor: level < 0 ? 'transparent' : HEAT_COLORS[level],
                }}
              />
            ))}
          </View>
        ))}
      </View>

      <View className="flex-row justify-between pt-2.5">
        {['JAN', 'APR', 'JUL', 'OCT', 'DEC'].map((month) => (
          <Text key={month} style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: '600', letterSpacing: 0.7, color: RECAP.faint }}>
            {month}
          </Text>
        ))}
      </View>

      <View className="mt-3.5 flex-row items-center" style={{ gap: 16 }}>
        <Key color={RECAP.movie} label="Film" />
        <Key color={RECAP.tv} label="Episodes" />
        <Key color={HEAT_COLORS[0]} label="Nothing" />
      </View>
    </View>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: '500', color: RECAP.muted }}>{label}</Text>
    </View>
  );
}
