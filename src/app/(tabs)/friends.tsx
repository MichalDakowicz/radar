import { Users } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Header } from '@/components/layout/Header';

// Placeholder - real Friends screen (requests, search, public shelf) lands
// in Phase 8 (doc 03, doc 11 §rls).
export default function Friends() {
  return (
    <View className="flex-1 bg-background">
      <Header />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Users size={40} color="hsl(0 0% 45%)" />
        <Text className="text-lg font-semibold text-foreground">Friends</Text>
        <Text className="text-center text-muted-foreground">Friend requests and public shelves land in Phase 8.</Text>
      </View>
    </View>
  );
}
