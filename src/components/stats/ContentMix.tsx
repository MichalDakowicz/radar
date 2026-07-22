import { Text, View } from 'react-native';

// Movies-vs-TV split (legacy ContentMix inline block): big-number legend +
// a single segmented ratio bar.
type ContentMixProps = {
  movieCount: number;
  tvCount: number;
  total: number;
};

export function ContentMix({ movieCount, tvCount, total }: ContentMixProps) {
  const moviePct = total > 0 ? Math.round((movieCount / total) * 100) : 0;
  const tvPct = total > 0 ? Math.round((tvCount / total) * 100) : 0;

  return (
    <View>
      <View className="mb-6 flex-row gap-10">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-foreground" />
            <Text className="text-sm font-semibold text-muted-foreground">Movies</Text>
          </View>
          <Text className="text-4xl font-light tracking-tight text-foreground">{movieCount}</Text>
        </View>
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            <Text className="text-sm font-semibold text-muted-foreground">TV Shows</Text>
          </View>
          <Text className="text-4xl font-light tracking-tight text-muted-foreground">{tvCount}</Text>
        </View>
      </View>

      <View className="h-2 w-full flex-row gap-1 overflow-hidden rounded-full">
        <View className="rounded-full bg-foreground" style={{ width: `${moviePct}%` }} />
        <View className="rounded-full bg-muted-foreground" style={{ width: `${tvPct}%` }} />
      </View>
    </View>
  );
}
