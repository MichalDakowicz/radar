import { Pressable, ScrollView, Text, View } from 'react-native';

import { getServiceStyle, OTHER_SERVICE_KEY, POPULAR_SERVICES } from '@/lib/services';

type ServiceFilterChipsProps = {
  selected: string[];
  onToggle: (service: string) => void;
  showOther?: boolean;
};

// doc 06 #2 - library filter chips restricted to the confirmed popular set,
// plus an "Other" bucket for everything outside it.
export function ServiceFilterChips({ selected, onToggle, showOther = true }: ServiceFilterChipsProps) {
  const chips = showOther ? [...POPULAR_SERVICES, OTHER_SERVICE_KEY] : POPULAR_SERVICES;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {chips.map((service) => {
        const isSelected = selected.includes(service);
        const style = service === OTHER_SERVICE_KEY ? { color: '#525252', textColor: '#ffffff' } : getServiceStyle(service);

        return (
          <Pressable
            key={service}
            onPress={() => onToggle(service)}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{
              borderColor: isSelected ? style.color : 'transparent',
              backgroundColor: isSelected ? `${style.color}26` : 'rgba(255,255,255,0.06)',
            }}
          >
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.color }} />
            <Text className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>{service}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
