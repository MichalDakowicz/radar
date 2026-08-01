import { Star } from 'lucide-react-native';
import { View } from 'react-native';

import { formatScore } from '@/lib/socialFeed';

type StarRowProps = { score: number; size?: number };

/**
 * Five stars with a half-star clip, announced as a single "Rated 4.5 out of 5"
 * rather than as five unlabelled icons.
 */
export function StarRow({ score, size = 13 }: StarRowProps) {
  return (
    <View
      className="flex-row gap-0.5"
      accessibilityRole="image"
      accessibilityLabel={`Rated ${formatScore(score)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = score >= i ? 1 : score > i - 1 ? score - (i - 1) : 0;
        return (
          <View key={i} className="relative">
            <Star size={size} color="hsl(0 0% 22%)" fill="hsl(0 0% 22%)" />
            {fill > 0 && (
              <View className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} color="#fbbf24" fill="#fbbf24" />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
