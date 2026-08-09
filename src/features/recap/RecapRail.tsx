import { Archive, ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RecapTile, TILE_H, TILE_W } from '@/features/recap/RecapTile';
import type { RecapKind } from '@/lib/recapPeriod';

export type RecapRailItem = { kind: RecapKind; key: string };

type RecapRailProps = {
  /** Newest first. Empty renders nothing — no recap has been earned yet. */
  items: RecapRailItem[];
  /** True when the archive holds more than the rail is showing. */
  hasMore: boolean;
  onOpen: (kind: RecapKind, key: string) => void;
  onOpenArchive: () => void;
};

/**
 * "Your recaps" as a rail of cover tiles rather than a boxed card. Recaps are a
 * short, growing collection, and a horizontal shelf says that in a way a panel
 * with two buttons in it cannot — it also stops the section from being capped at
 * whatever fits inside one box as the months pile up.
 */
export function RecapRail({ items, hasMore, onOpen, onOpenArchive }: RecapRailProps) {
  if (items.length === 0) return null;

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your recaps</Text>
        <Text className="ml-auto text-[11px] text-muted-foreground">Out when the period ends</Text>
      </View>

      {/* Bleeds past the shelf's own 16px gutter so the rail runs to the edge of
          the screen, which is what makes it read as a shelf and not as a row
          inside a card. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-4"
        contentContainerClassName="gap-2.5 px-4"
      >
        {items.map((item) => (
          <RecapTile key={`${item.kind}:${item.key}`} kind={item.kind} periodKey={item.key} onPress={() => onOpen(item.kind, item.key)} />
        ))}

        {hasMore && (
          <Pressable
            onPress={onOpenArchive}
            accessibilityRole="button"
            accessibilityLabel="Open the recap archive"
            className="items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/30 active:opacity-70"
            style={{ width: TILE_W, height: TILE_H }}
          >
            <Archive size={20} color="hsl(0 0% 63.9%)" />
            <Text className="text-[12.5px] font-semibold text-foreground/85">Archive</Text>
            <View className="flex-row items-center">
              <Text className="text-[11px] text-muted-foreground">See all</Text>
              <ChevronRight size={13} color="hsl(0 0% 63.9%)" />
            </View>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
