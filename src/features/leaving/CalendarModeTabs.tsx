import { CalendarPlus, CalendarX } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export type CalendarMode = 'coming' | 'leaving';

const MODES: { id: CalendarMode; label: string; icon: typeof CalendarPlus }[] = [
  { id: 'coming', label: 'Coming', icon: CalendarPlus },
  { id: 'leaving', label: 'Leaving', icon: CalendarX },
];

type CalendarModeTabsProps = { active: CalendarMode; onChange: (mode: CalendarMode) => void };

// Second-level switch inside Browse → Calendar. A fourth top-level tab would not
// fit the segmented control on a phone, and the two views answer the same
// question from opposite ends anyway: what arrives, what disappears.
export function CalendarModeTabs({ active, onChange }: CalendarModeTabsProps) {
  return (
    <View className="flex-row rounded-lg border border-border bg-secondary p-1">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = active === mode.id;
        return (
          <Pressable
            key={mode.id}
            onPress={() => onChange(mode.id)}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-md py-1.5 ${isActive ? 'bg-card' : ''}`}
          >
            <Icon size={14} color={isActive ? 'hsl(217 91% 60%)' : 'hsl(0 0% 63.9%)'} />
            <Text className={isActive ? 'text-sm font-semibold text-foreground' : 'text-sm text-muted-foreground'}>
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
