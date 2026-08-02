import { ChevronRight, Shuffle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

/**
 * The random picker's new home. It used to be a bare shuffle icon in the
 * Library's top bar, where nothing said what it did; on your own shelf it can
 * ask the question out loud, which is the whole appeal of the feature.
 */
export function RandomPickCard({ count, onPress }: { count: number; onPress: () => void }) {
  const disabled = count === 0;

  return (
    <View className="px-4 pt-4">
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Pick something to watch at random"
        className="flex-row items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-3.5 active:opacity-70"
        style={disabled ? { opacity: 0.45 } : undefined}
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/20">
          <Shuffle size={20} color="hsl(217 91% 60%)" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[14.5px] font-bold text-foreground">Don&rsquo;t know what to watch?</Text>
          <Text className="mt-0.5 text-[12px] text-muted-foreground">
            {disabled ? 'Add something to your watchlist first' : `Let me pick from your ${count} unwatched titles`}
          </Text>
        </View>
        <ChevronRight size={18} color="hsl(0 0% 63.9%)" />
      </Pressable>
    </View>
  );
}
