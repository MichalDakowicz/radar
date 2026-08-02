import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { personalScore } from '@/components/media/RatingStars';
import { FavoritesRow } from '@/features/profile/FavoritesRow';
import { PosterThumb } from '@/features/social/PosterThumb';
import { StarRow } from '@/features/social/StarRow';
import type { TasteTag } from '@/lib/tasteTags';
import type { FavoriteItem, Movie } from '@/types/movie';

type ShelfSectionsProps = {
  /** Their pinned top 4. Read-only unless `onEditFavorites` is passed. */
  favorites: FavoriteItem[];
  inProgress: Movie[];
  recent: Movie[];
  /** Shared taste, which only exists when two libraries are being compared. */
  tags?: TasteTag[];
  onOpenTitle: (movie: Movie) => void;
  onOpenFavorite: (item: FavoriteItem) => void;
  /**
   * Jump to the whole library behind the shelf. Omitted on your own Profile,
   * where the Library tab is already one tap away and the button is noise.
   */
  onOpenCollection?: () => void;
  /** Owner-only: turns the top 4 into an editable row on your own profile. */
  onEditFavorites?: () => void;
  collectionLabel?: string;
};

/**
 * Everything under a shelf header: what they're on, what they finished, what
 * you share. Also drives your own Profile tab — a shelf is a shelf, and the
 * owner-only bits (editing the top 4) arrive as optional props.
 */
export function ShelfSections({
  favorites,
  inProgress,
  recent,
  tags = [],
  onOpenTitle,
  onOpenFavorite,
  onOpenCollection,
  onEditFavorites,
  collectionLabel = 'See full collection',
}: ShelfSectionsProps) {
  return (
    <View className="gap-6 px-4 pb-10 pt-5">
      {/* Leads the shelf: a pinned top 4 is what someone chose to say about
          themselves, where everything below is just what they happened to log. */}
      <FavoritesRow favorites={favorites} onPressItem={onOpenFavorite} onEdit={onEditFavorites} />

      {inProgress.length > 0 && (
        <View className="gap-2.5">
          <SectionLabel>In progress</SectionLabel>
          {inProgress.map((movie) => (
            <Pressable
              key={movie.id}
              onPress={() => onOpenTitle(movie)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${movie.title}`}
              className="flex-row items-center gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-2.5 active:opacity-70"
            >
              <PosterThumb coverUrl={movie.coverUrl} title={movie.title} width={42} radius={5} />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-[14.5px] font-bold text-foreground">
                  {movie.title}
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {movie.type === 'tv' ? 'Series' : 'Film'}
                  {movie.releaseDate ? ` · ${movie.releaseDate.slice(0, 4)}` : ''}
                </Text>
              </View>
              <View className="h-[7px] w-[7px] rounded-full bg-yellow-400" />
            </Pressable>
          ))}
        </View>
      )}

      <View className="gap-3">
        <View className="flex-row items-baseline gap-2">
          <SectionLabel>Recently logged</SectionLabel>
          <Text className="ml-auto text-[11px] text-muted-foreground">{recent.length} shown</Text>
        </View>
        {recent.length === 0 ? (
          <Text className="text-[13px] text-muted-foreground">Nothing finished yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
            {recent.map((movie) => {
              const score = personalScore(movie.ratings);
              return (
                <Pressable
                  key={movie.id}
                  onPress={() => onOpenTitle(movie)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${movie.title}`}
                  className="w-[82px] gap-1.5 active:opacity-70"
                >
                  <PosterThumb coverUrl={movie.coverUrl} title={movie.title} width={82} height={123} radius={7} />
                  <Text numberOfLines={1} className="text-[11.5px] font-semibold text-foreground">
                    {movie.title}
                  </Text>
                  {score != null && score > 0 && <StarRow score={score} size={10} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {tags.length > 0 && (
        <View className="gap-3">
          <SectionLabel>You both like</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <View key={`${tag.kind}:${tag.label}`} className="rounded-full border border-border bg-card px-3 py-1.5">
                <Text className="text-[12.5px] text-foreground/85">{tag.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!!onOpenCollection && (
        <Pressable
          onPress={onOpenCollection}
          accessibilityRole="button"
          className="h-11 flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border active:opacity-70"
        >
          <Text className="text-[13px] font-semibold text-foreground/80">{collectionLabel}</Text>
          <ChevronRight size={16} color="hsl(0 0% 70%)" />
        </Pressable>
      )}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</Text>
  );
}
