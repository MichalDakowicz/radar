import { Star } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PosterThumb } from '@/features/social/PosterThumb';
import { formatScore } from '@/lib/socialFeed';

export const RANK_W = 84;

type RankedPosterProps = {
  title: string;
  coverUrl: string | null;
  rank: number;
  score: number;
  onPress: () => void;
};

/**
 * One entry in a year's ranking: the poster carries it, the number underneath
 * says where it placed, and the score rides on the artwork so a rank can be
 * read as "1st, and it was a 4.5" without a second line of text.
 */
export function RankedPoster({ title, coverUrl, rank, score, onPress }: RankedPosterProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, number ${rank}, rated ${formatScore(score)} out of 5`}
      className="items-center gap-1.5 active:opacity-70"
      style={{ width: RANK_W }}
    >
      <View>
        <PosterThumb coverUrl={coverUrl} title={title} width={RANK_W} height={126} radius={7} />
        <View className="absolute bottom-1 left-1 flex-row items-center gap-0.5 rounded-full bg-black/75 px-1.5 py-0.5">
          <Star size={9} color="#fbbf24" fill="#fbbf24" />
          <Text className="text-[10px] font-bold text-white">{formatScore(score)}</Text>
        </View>
      </View>
      <Text className="text-[12px] font-bold text-muted-foreground">{rank}</Text>
    </Pressable>
  );
}
