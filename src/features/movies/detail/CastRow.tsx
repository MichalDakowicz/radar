import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { CastMember } from '@/types/movie';

type CastRowProps = {
  cast: CastMember[];
};

// One card per billed performer: face, name, and the part they played, the way
// a film page is read everywhere else. It scrolls sideways like the Browse rows
// so a twenty-name billing costs one card's worth of vertical space instead of
// a screenful. Tap-through to /actor/[id] survives from the old chip row - the
// whole card is the target now.
//
// Cast isn't a Movie, so this stays a dedicated row rather than stretching
// MovieCard/MediaCarousel (doc 03 Movie Detail `CastRow`).
const CARD_WIDTH = 96;

export function CastRow({ cast }: CastRowProps) {
  const router = useRouter();
  if (cast.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 py-1">
      {cast.map((actor, i) => (
        <Pressable
          key={actor.id ?? `${actor.name}-${i}`}
          disabled={!actor.id}
          onPress={() => actor.id && router.push({ pathname: '/actor/[id]', params: { id: String(actor.id) } })}
          className="items-center gap-2"
          style={{ width: CARD_WIDTH }}
        >
          <View
            className="items-center justify-center overflow-hidden rounded-full border border-border bg-secondary"
            style={{ width: CARD_WIDTH - 8, height: CARD_WIDTH - 8 }}
          >
            {actor.profileUrl ? (
              <Image source={{ uri: actor.profileUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <User size={30} color="#525252" />
            )}
          </View>
          <Text numberOfLines={2} className="text-center text-xs font-semibold leading-tight text-foreground">
            {actor.name}
          </Text>
          {!!actor.character && (
            <Text numberOfLines={2} className="text-center text-[11px] leading-tight text-muted-foreground">
              {actor.character}
            </Text>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}
