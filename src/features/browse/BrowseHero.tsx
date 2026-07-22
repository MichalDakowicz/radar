import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Info, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Movie } from '@/types/movie';

type BrowseHeroProps = {
  items: Movie[];
  onPress: (movie: Movie) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

// Full-bleed featured carousel (doc 03 Browse `BrowseHero`) - ported from the
// legacy HeroCarousel.jsx look: one backdrop at a time, auto-advancing every
// 8s with a crossfade (expo-image `transition` on source swap), tappable dot
// indicators, and Watchlist / Details actions over a darkened gradient.
export function BrowseHero({ items, onPress, onAdd, onRemove, isAdded }: BrowseHeroProps) {
  const { height } = useWindowDimensions();
  const heroItems = items.slice(0, 6);
  const [index, setIndex] = useState(0);

  // Reset to the first slide whenever the underlying set changes (tab / reroll).
  useEffect(() => setIndex(0), [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % heroItems.length), 8000);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  if (heroItems.length === 0) return null;

  const current = heroItems[index] ?? heroItems[0];
  const heroHeight = Math.round(Math.min(480, Math.max(360, height * 0.58)));
  const added = isAdded(current);
  const match = current.voteAverage ? Math.round(current.voteAverage * 10) : 0;
  const year = current.releaseDate ? current.releaseDate.slice(0, 4) : '';

  return (
    <View style={{ height: heroHeight }} className="relative w-full overflow-hidden bg-neutral-900">
      <Image
        source={{ uri: current.backdropUrl || current.coverUrl || undefined }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={800}
      />
      {/* Bottom-up veil blends the banner into the feed; left veil anchors text. */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.95)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="absolute inset-x-0 bottom-0 gap-3 px-4 pb-8">
        <Text numberOfLines={2} className="text-3xl font-black text-white">
          {current.title}
        </Text>
        <View className="flex-row items-center gap-3">
          {match > 0 && <Text className="text-sm font-bold text-green-400">{match}% Match</Text>}
          {!!year && <Text className="text-sm text-neutral-200">{year}</Text>}
          <View className="rounded border border-neutral-500 px-1">
            <Text className="text-[10px] uppercase text-neutral-200">{current.type}</Text>
          </View>
        </View>
        {!!current.overview && (
          <Text numberOfLines={3} className="max-w-xl text-sm leading-snug text-neutral-300">
            {current.overview}
          </Text>
        )}
        <View className="flex-row items-center gap-2 pt-1">
          <Pressable
            onPress={() => (added ? onRemove(current) : onAdd(current))}
            className="flex-row items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 active:opacity-80"
          >
            {added ? <Check size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
            <Text className="font-bold text-white">{added ? 'Added' : 'Watchlist'}</Text>
          </Pressable>
          <Pressable
            onPress={() => onPress(current)}
            className="flex-row items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 active:opacity-80"
          >
            <Info size={18} color="#fff" />
            <Text className="font-bold text-white">Details</Text>
          </Pressable>
        </View>
      </View>

      {heroItems.length > 1 && (
        <View className="absolute bottom-32 right-4 gap-2">
          {heroItems.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => setIndex(i)}
              hitSlop={6}
              className="rounded-full"
              style={{ width: i === index ? 9 : 7, height: i === index ? 9 : 7, backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
