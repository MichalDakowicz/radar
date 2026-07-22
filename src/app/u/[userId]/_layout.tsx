import { Tabs } from 'expo-router';
import { BarChart3, LayoutGrid, Users } from 'lucide-react-native';

import { PublicHeader } from '@/components/layout/PublicHeader';

// Public shelf (doc 05 route tree `u/[userId]/*`). A nested Tabs navigator -
// same primitive as the main (tabs) group - with the profile chrome as a shared
// header. Reachable by anon users (the root AuthGate only gates on auth
// resolving, not on being signed in), so public web shelves work.
export default function PublicShelfLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <PublicHeader />,
        tabBarActiveTintColor: 'hsl(217 91% 60%)',
        tabBarInactiveTintColor: 'hsl(0 0% 63.9%)',
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#262626' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Library', tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
    </Tabs>
  );
}
