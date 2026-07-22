import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

// Favorite-genre chip (legacy GenreTag.jsx). Rank drives emphasis; the genre
// id now rides on Movie.genres so navigation needs no hardcoded name->id map.
export type GenreRank = 'top' | 'high' | 'mid' | 'low';

type GenreTagProps = {
  name: string;
  count: number;
  rank: GenreRank;
  genreId?: number;
};

const RANK_STYLES: Record<GenreRank, string> = {
  top: 'border-muted-foreground bg-secondary',
  high: 'border-border',
  mid: 'border-border/60',
  low: 'border-border/30',
};

const RANK_TEXT: Record<GenreRank, string> = {
  top: 'text-foreground',
  high: 'text-foreground/90',
  mid: 'text-muted-foreground',
  low: 'text-muted-foreground/60',
};

export function GenreTag({ name, count, rank, genreId }: GenreTagProps) {
  const router = useRouter();
  const goToGenre = () => {
    if (genreId) router.push({ pathname: '/genre/[id]', params: { id: String(genreId) } });
  };

  return (
    <Pressable
      onPress={goToGenre}
      disabled={!genreId}
      className={`flex-row items-center gap-2 rounded-full border px-4 py-2.5 ${RANK_STYLES[rank]}`}
    >
      <Text className={`text-sm font-medium ${RANK_TEXT[rank]}`}>{name}</Text>
      <View className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      <Text className={`text-xs font-semibold ${RANK_TEXT[rank]}`} style={{ opacity: 0.7 }}>
        {count}
      </Text>
    </Pressable>
  );
}
