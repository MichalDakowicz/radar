import { CalendarDays, Film, Tv } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { BrowseTabId } from './useDiscoveryFeed';

const TABS: { id: BrowseTabId; label: string; icon: typeof Film }[] = [
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'tv', label: 'TV Shows', icon: Tv },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

type BrowseTabsProps = { active: BrowseTabId; onChange: (tab: BrowseTabId) => void };

// Movies/TV sticky segmented switch (doc 03 Browse `BrowseTabs`).
export function BrowseTabs({ active, onChange }: BrowseTabsProps) {
  return (
    <View className="flex-row rounded-lg border border-border bg-secondary p-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-md py-2 ${isActive ? 'bg-card' : ''}`}
          >
            <Icon size={16} color={isActive ? 'hsl(217 91% 60%)' : 'hsl(0 0% 63.9%)'} />
            <Text className={isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
