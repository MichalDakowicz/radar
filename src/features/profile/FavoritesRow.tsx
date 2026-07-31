import { Pencil, Star } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { FavoritePoster } from '@/features/profile/FavoritePoster';
import { MAX_FAVORITES } from '@/lib/favorites';
import type { FavoriteItem } from '@/types/movie';

const MUTED = 'hsl(0 0% 63.9%)';

type FavoritesRowProps = {
  favorites: FavoriteItem[];
  /** Tapping a filled slot — normally opens the detail page. */
  onPressItem?: (item: FavoriteItem) => void;
  /** Owner-only. Absent on someone else's profile, which makes the row read-only. */
  onEdit?: () => void;
  title?: string;
};

/**
 * The profile top 4 (Letterboxd's favourite films strip). Always renders four
 * slots side by side, so a half-filled row still reads as "four picks, two
 * chosen" rather than as two loose posters.
 *
 * Read-only and empty renders nothing: four dashed boxes on a stranger's
 * profile advertise a feature the viewer cannot use there.
 */
export function FavoritesRow({ favorites, onPressItem, onEdit, title = 'Favourites' }: FavoritesRowProps) {
  const editable = !!onEdit;
  if (!editable && favorites.length === 0) return null;

  const slots = Array.from({ length: MAX_FAVORITES }, (_, i) => favorites[i] ?? null);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Star size={14} color={MUTED} />
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</Text>
        </View>
        {editable && (
          <Pressable
            onPress={onEdit}
            accessibilityLabel="Edit favourites"
            className="flex-row items-center gap-1.5 rounded-full border border-border px-2.5 py-1 active:opacity-80"
            style={{ cursor: 'pointer' }}
          >
            <Pencil size={12} color="hsl(0 0% 98%)" />
            <Text className="text-xs font-medium text-foreground">Edit</Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-2">
        {slots.map((item, index) => (
          <View key={item ? `${item.type}:${item.tmdbId}` : `empty-${index}`} className="flex-1">
            <FavoritePoster
              item={item}
              slot={index + 1}
              onPress={item ? (onPressItem ? () => onPressItem(item) : undefined) : onEdit}
            />
          </View>
        ))}
      </View>

      {editable && favorites.length === 0 && (
        <Text className="text-xs text-muted-foreground">
          Pin up to {MAX_FAVORITES} titles you&apos;ve watched to the top of your profile.
        </Text>
      )}
    </View>
  );
}
