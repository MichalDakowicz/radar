import { Star } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MY_SERVICES_KEY } from '@/lib/serviceFilter';
import { getServiceStyle, OTHER_SERVICE_KEY, POPULAR_SERVICES } from '@/lib/services';

type ServiceFilterChipsProps = {
  selected: string[];
  onToggle: (service: string) => void;
  showOther?: boolean;
  /** Settings' "my services" list. Empty hides the "My services" chip. */
  ownedServices?: string[];
};

// Hex, not the hsl() token: the chip tints its own background with an alpha
// suffix (`${color}26`), which only concatenates onto a hex value.
const MINE_COLOR = '#3b82f6';

// doc 06 #2 - library filter chips restricted to the confirmed popular set,
// plus an "Other" bucket for everything outside it, plus a leading "My
// services" shorthand for whatever the user set in Settings.
export function ServiceFilterChips({ selected, onToggle, showOther = true, ownedServices = [] }: ServiceFilterChipsProps) {
  const chips = showOther ? [...POPULAR_SERVICES, OTHER_SERVICE_KEY] : [...POPULAR_SERVICES];
  const showMine = ownedServices.length > 0;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {showMine && (
        <Chip
          label="My services"
          color={MINE_COLOR}
          selected={selected.includes(MY_SERVICES_KEY)}
          onPress={() => onToggle(MY_SERVICES_KEY)}
          icon={<Star size={12} color={MINE_COLOR} fill={selected.includes(MY_SERVICES_KEY) ? MINE_COLOR : 'transparent'} />}
        />
      )}
      {chips.map((service) => (
        <Chip
          key={service}
          label={service}
          color={service === OTHER_SERVICE_KEY ? '#525252' : getServiceStyle(service).color}
          selected={selected.includes(service)}
          onPress={() => onToggle(service)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  color,
  selected,
  onPress,
  icon,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{
        borderColor: selected ? color : 'transparent',
        backgroundColor: selected ? `${color}26` : 'rgba(255,255,255,0.06)',
      }}
    >
      {icon ?? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      <Text className={selected ? 'text-foreground' : 'text-muted-foreground'}>{label}</Text>
    </Pressable>
  );
}
