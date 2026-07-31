import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clapperboard, Quote } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageViewer } from '@/components/media/ImageViewer';
import { useIsDesktop } from '@/hooks/useResponsive';
import { goBackOrHome } from '@/lib/utils';
import type { NamedRef } from '@/types/movie';

// Legacy rows (migrated from the old Firebase app) can still have `director`
// stored as plain strings instead of `{ name }` objects - same shape
// `directorToDisplayString` (lib/utils) already defends against.
type DirectorEntry = NamedRef | string | null | undefined;

type DetailHeroProps = {
  title: string;
  tagline?: string;
  coverUrl: string | null;
  releaseDate: string | null;
  director: DirectorEntry[];
  action?: ReactNode;
};

// Shared backdrop hero for the unified movie detail/edit screen (doc 03
// `DetailHero`, doc 12 part 1 unify) - poster + title + tagline +
// director(s) (tap-through to /director/[id]) + year + action slot. Renders
// byte-identical for owned and not-yet-owned titles - pulled fully from the
// details screen (full-height blurred backdrop, not the earlier compact
// version), no edit-only branching - so the only thing that differs between
// /movie/[tmdbId]/[type] and /edit/[movieId] is which action button lands
// in the slot.
export function DetailHero({ title, tagline, coverUrl, releaseDate, director, action }: DetailHeroProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const [viewerOpen, setViewerOpen] = useState(false);
  const year = releaseDate ? releaseDate.slice(0, 4) : null;

  return (
    <View className="relative">
      <View className={isDesktop ? "h-96 w-full overflow-hidden bg-neutral-900" : "h-72 w-full overflow-hidden bg-neutral-900"}>
        {coverUrl && <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />}
        <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
      </View>

      <Pressable
        onPress={() => goBackOrHome(router)}
        className="absolute left-4 z-10 rounded-full bg-black/50 p-2.5"
        style={{ top: insets.top + 8 }}
      >
        <ArrowLeft size={22} color="#fff" />
      </Pressable>

      {/* Poster sits on the right: the title/tagline/director block reads
          left-aligned with the rest of the page, which frees the whole right
          edge for a noticeably larger piece of artwork. */}
      <View className={isDesktop ? '-mt-72 flex-row gap-6 px-8' : '-mt-40 flex-row gap-4 px-4'}>
        <View className="flex-1 justify-end gap-1.5 pb-1">
          <Text className={isDesktop ? 'text-4xl font-bold leading-tight text-white' : 'text-2xl font-bold leading-tight text-white'}>{title}</Text>
          {!!tagline && (
            <View className="flex-row items-center gap-1.5">
              <Quote size={12} color="#a3a3a3" />
              <Text numberOfLines={1} className="flex-1 text-sm italic text-neutral-400">
                {tagline}
              </Text>
            </View>
          )}
          <View className="flex-row flex-wrap items-center gap-1.5">
            {director.map((d, i) => {
              const name = typeof d === 'string' ? d : d?.name ?? '';
              const id = typeof d === 'string' ? undefined : d?.id;
              if (!name) return null;
              return (
                <Pressable
                  key={`${id ?? name}-${i}`}
                  onPress={() => id && router.push({ pathname: '/director/[id]', params: { id: String(id) } })}
                >
                  <Text className="text-sm text-neutral-300">
                    {name}
                    {i < director.length - 1 ? ',' : ''}
                  </Text>
                </Pressable>
              );
            })}
            {director.length > 0 && !!year && <Text className="text-sm text-neutral-500">•</Text>}
            {!!year && <Text className="text-sm text-neutral-300">{year}</Text>}
          </View>
        </View>

        <Pressable
          onPress={() => coverUrl && setViewerOpen(true)}
          disabled={!coverUrl}
          className={
            isDesktop
              ? 'aspect-[2/3] w-64 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800 shadow-2xl'
              : 'aspect-[2/3] w-40 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800 shadow-2xl'
          }
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ flex: 1 }} contentFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Clapperboard size={28} color="#525252" />
            </View>
          )}
        </Pressable>
      </View>

      {!!action && (
        // The CTA is a full-width bar on phones; at desktop width that reads as
        // a banner, so it shrinks to a button-sized block under the poster.
        <View className={isDesktop ? 'px-8 pt-5' : 'px-4 pt-4'} style={isDesktop ? { maxWidth: 320 } : undefined}>
          {action}
        </View>
      )}

      <ImageViewer visible={viewerOpen} uri={coverUrl} title={title} onClose={() => setViewerOpen(false)} />
    </View>
  );
}
