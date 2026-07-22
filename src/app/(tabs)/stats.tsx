import { BarChart3 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Header } from '@/components/layout/Header';

// Placeholder - real Stats screen (streaks, breakdowns, Hall of Fame) lands
// in Phase 7 (doc 03, doc 06 #4).
export default function Stats() {
  return (
    <View className="flex-1 bg-background">
      <Header />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <BarChart3 size={40} color="hsl(0 0% 45%)" />
        <Text className="text-lg font-semibold text-foreground">Stats</Text>
        <Text className="text-center text-muted-foreground">Streaks, breakdowns, and Hall of Fame land in Phase 7.</Text>
      </View>
    </View>
  );
}
