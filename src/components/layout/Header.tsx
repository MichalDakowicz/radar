import { Plus, Share2, Shuffle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Logo from '@/assets/brand/logo.svg';
import { useQuickAddSheetStore } from '@/store/quickAddSheet';

type HeaderProps = {
  onRandomPick?: () => void;
  onShare?: () => void;
  refreshingLabel?: string;
};

// Global top bar (ported from legacy Navbar.jsx) - logo/title on the left,
// "Add Movie" (global) + "Pick Random" (Library only, via prop) + Share
// (public shelf, Phase 8) on the right. Legacy's desktop nav-link icons stay
// out of scope here - the bottom Tabs already cover that on mobile.
export function Header({ onRandomPick, onShare, refreshingLabel }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const presentQuickAdd = useQuickAddSheetStore((s) => s.present);

  return (
    <View
      className="flex-row items-center justify-between gap-3 border-b border-border bg-background/95 px-4 pb-3"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <Logo width={32} height={32} />
        <Text className="text-2xl font-bold tracking-tight text-foreground">Radar</Text>
        {!!refreshingLabel && (
          <View className="rounded bg-secondary px-2 py-1">
            <Text className="text-xs font-medium text-muted-foreground">{refreshingLabel}</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        {!!onRandomPick && (
          <Pressable onPress={onRandomPick} className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-2">
            <Shuffle size={16} color="hsl(0 0% 98%)" />
          </Pressable>
        )}
        <Pressable onPress={() => presentQuickAdd?.()} className="flex-row items-center gap-1.5 rounded-full bg-primary px-3 py-2">
          <Plus size={16} color="#fff" />
        </Pressable>
        {!!onShare && (
          <Pressable onPress={onShare} className="rounded-full p-2">
            <Share2 size={18} color="hsl(0 0% 63.9%)" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
