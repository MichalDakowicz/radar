import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Clapperboard, Plus, Tv, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import type { FavoriteItem } from '@/types/movie';

// One slot of the profile top 4. Deliberately not MovieCard: that card's
// contract is a full `Movie` (status badges, ratings, add/remove), and a
// favourite is a four-field snapshot with no library row behind it — on a
// stranger's profile there is nothing to hydrate it from.

type FavoritePosterProps = {
  item: FavoriteItem | null;
  /** 1-based, shown while editing so the pick order is visible. */
  slot: number;
  onPress?: () => void;
  /** Editing chrome: dashed empty slots and a remove affordance. */
  editable?: boolean;
};

export function FavoritePoster({ item, slot, onPress, editable = false }: FavoritePosterProps) {
  const { hovered, bind } = useHover();

  if (!item) {
    return (
      <Pressable
        {...bind}
        onPress={onPress}
        disabled={!onPress}
        accessibilityLabel={editable ? `Add a favourite to slot ${slot}` : `Empty favourite slot ${slot}`}
        className="aspect-[2/3] items-center justify-center rounded-md border border-dashed border-border bg-secondary/40"
        style={[onPress ? { cursor: 'pointer' } : null, webTransition('opacity'), hovered ? { opacity: 0.75 } : null]}
      >
        {editable ? <Plus size={18} color="hsl(0 0% 45%)" /> : <Clapperboard size={18} color="hsl(0 0% 30%)" />}
      </Pressable>
    );
  }

  return (
    <Pressable
      {...bind}
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={editable ? `Remove ${item.title} from favourites` : item.title}
      className="relative aspect-[2/3] overflow-hidden rounded-md bg-neutral-900"
      style={[
        onPress ? { cursor: 'pointer' } : null,
        webTransition('transform'),
        hovered ? { transform: [{ scale: 1.035 }], zIndex: 10 } : null,
      ]}
    >
      {item.coverUrl ? (
        <Image
          source={{ uri: item.coverUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={item.coverUrl}
        />
      ) : (
        // No poster: the title is the only thing identifying the pick, so it
        // has to be legible rather than hidden behind a hover.
        <View className="flex-1 items-center justify-center gap-1 bg-neutral-800 p-1.5">
          <Clapperboard size={18} color="#525252" />
          <Text numberOfLines={2} className="text-center text-[10px] font-medium leading-tight text-neutral-400">
            {item.title}
          </Text>
        </View>
      )}

      {item.type === 'tv' && (
        <View className="absolute left-1.5 top-1.5 rounded bg-black/55 p-1">
          <Tv size={10} color="#fff" />
        </View>
      )}

      {editable && (
        <View className="absolute right-1.5 top-1.5 rounded-full bg-black/65 p-1">
          <X size={10} color="#fff" />
        </View>
      )}

      {hovered && !!item.coverUrl && (
        <>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            locations={[0.4, 1]}
            style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          />
          <View className="absolute inset-x-0 bottom-0 p-1.5" style={{ pointerEvents: 'none' }}>
            <Text numberOfLines={2} className="text-[10px] font-semibold leading-tight text-white">
              {item.title}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
