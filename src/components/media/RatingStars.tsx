import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { TmdbLogo } from '@/components/media/TmdbLogo';
import { personalScore } from '@/lib/personalScore';
import type { Ratings } from '@/types/movie';

// The scoring rule moved to lib/personalScore so non-React callers (the recap
// builders, scripts) can use it. Re-exported here because every existing call
// site imports it from this module.
export { personalScore };

type RatingStarsProps = {
  ratings?: Ratings | null;
  voteAverage?: number | null;
  size?: number;
  boxHeight?: number;
};

export function RatingStars({ ratings, voteAverage, size = 6, boxHeight }: RatingStarsProps) {
  const score = personalScore(ratings);

  if (!score && !(voteAverage && voteAverage > 0)) return null;

  const boxStyle = boxHeight ? { height: boxHeight, paddingVertical: 0 } : undefined;

  return (
    <View className="items-end gap-1">
      {score !== null && (
        <View
          className="flex-row items-center justify-center gap-1 rounded border border-amber-500/30 bg-black/60 px-1.5 py-0.5"
          style={boxStyle}
        >
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((i) => {
              const fill = score >= i ? 1 : score > i - 1 ? score - (i - 1) : 0;
              return (
                <View key={i} className="relative">
                  <Star size={size} color="#525252" />
                  {fill > 0 && (
                    <View className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                      <Star size={size} color="#fbbf24" fill="#fbbf24" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <Text className="text-[10px] font-bold text-amber-400">{score.toFixed(1)}</Text>
        </View>
      )}
      {score === null && voteAverage != null && voteAverage > 0 && (
        <View
          className="flex-row items-center justify-center gap-1 rounded border bg-black/60 px-1.5 py-0.5"
          style={boxStyle}
        >
          <TmdbLogo width={24} />
          <Text className="text-[10px] font-bold text-white">{voteAverage.toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

type DualRatingProps = {
  ratings?: Ratings | null;
  voteAverage?: number | null;
};

// TMDB score left, personal score right - the two ratings side by side below
// a poster card instead of one overwriting the other inside it.
export function DualRating({ ratings, voteAverage }: DualRatingProps) {
  const score = personalScore(ratings);
  const hasTmdb = voteAverage != null && voteAverage > 0;

  if (!hasTmdb && score === null) return null;

  return (
    <View className="flex-row items-center justify-between px-0.5">
      {hasTmdb ? (
        <View className="flex-row items-center gap-1 rounded border bg-black/40 py-0.5">
          <TmdbLogo width={24} />
          <Text className="text-[10px] font-bold text-white">{voteAverage!.toFixed(1)}</Text>
        </View>
      ) : (
        <View />
      )}
      {score !== null ? (
        <View className="flex-row items-center gap-1 rounded border bg-black/40 py-0.5">
          <Star size={10} color="#fbbf24" fill="#fbbf24" />
          <Text className="text-[10px] font-bold text-amber-400">{score.toFixed(1)}</Text>
        </View>
      ) : (
        <View />
      )}
    </View>
  );
}
