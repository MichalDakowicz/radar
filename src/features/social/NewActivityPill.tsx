import { ChevronUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type NewActivityPillProps = { count: number; onPress: () => void };

/**
 * Floats over the feed when friends log something while you are reading.
 * Merging is a tap, never automatic — re-sorting the list under someone is how
 * feeds lose your place.
 */
export function NewActivityPill({ count, onPress }: NewActivityPillProps) {
  if (count <= 0) return null;

  return (
    <View className="absolute left-0 right-0 top-2.5 z-10 items-center" pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="h-11 flex-row items-center gap-1.5 rounded-full bg-primary px-4 shadow-lg active:opacity-80"
      >
        <ChevronUp size={14} color="#fff" />
        <Text className="text-[12.5px] font-bold text-white">
          {count} new {count === 1 ? 'update' : 'updates'}
        </Text>
      </Pressable>
    </View>
  );
}
