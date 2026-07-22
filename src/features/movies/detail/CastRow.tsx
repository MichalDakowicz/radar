import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';

import type { NamedRef } from '@/types/movie';

type CastRowProps = {
  cast: NamedRef[];
};

// Cast chips, tap-through to /actor/[id] when TMDB gave us a person id
// (doc 03 Movie Detail `CastRow`). Cast isn't a Movie, so this stays a
// small dedicated row rather than stretching MovieCard/MediaCarousel.
export function CastRow({ cast }: CastRowProps) {
  const router = useRouter();
  if (cast.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {cast.map((actor, i) => (
        <Pressable
          key={actor.id ?? `${actor.name}-${i}`}
          disabled={!actor.id}
          onPress={() => actor.id && router.push({ pathname: '/actor/[id]', params: { id: String(actor.id) } })}
          className="rounded-full border border-border bg-secondary px-4 py-2"
        >
          <Text className="font-medium text-foreground">{actor.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
