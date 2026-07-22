import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useDirectorDetails } from '@/hooks/useTmdb';

// One "most-watched director" row (legacy DirectorItem.jsx). Fetches its own
// profile image via the director id (now carried on Movie.director, so no
// batchSearchDirectors name->id lookup like legacy needed).
type DirectorItemProps = {
  name: string;
  count: number;
  max: number;
  directorId?: number;
};

export function DirectorItem({ name, count, max, directorId }: DirectorItemProps) {
  const router = useRouter();
  const { data } = useDirectorDetails(directorId ?? null);
  const profileUrl = data?.profileUrl ?? null;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const percent = max > 0 ? (count / max) * 100 : 0;

  const goToDirector = () => {
    if (directorId) router.push({ pathname: '/director/[id]', params: { id: String(directorId) } });
  };

  return (
    <Pressable onPress={goToDirector} disabled={!directorId} className="flex-row items-center gap-4 py-3">
      <View className="h-12 w-12 overflow-hidden rounded-full border border-border bg-secondary">
        {profileUrl ? (
          <Image source={{ uri: profileUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-sm font-bold text-muted-foreground">{initials}</Text>
          </View>
        )}
      </View>

      <View className="flex-1 gap-2">
        <View className="flex-row items-end justify-between">
          <Text className="text-base font-semibold text-foreground">{name}</Text>
          <Text className="text-sm font-medium text-muted-foreground">
            {count} <Text className="text-xs uppercase tracking-wider text-muted-foreground/70">titles</Text>
          </Text>
        </View>
        <View className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <View className="h-full rounded-full bg-muted-foreground" style={{ width: `${percent}%` }} />
        </View>
      </View>
    </Pressable>
  );
}
