import { Star } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getServiceStyle, onDarkColor } from '@/lib/services';
import type { MediaType } from '@/types/movie';

// Filters, in the app's existing chip language rather than a one-off control.
// The service row is built from what is actually leaving in this region — a
// hardcoded roster would miss SkyShowtime and Mubi in Poland and offer Hulu
// where it does not exist.

/** Sentinel, not a service: "only what I already subscribe to". Mirrors the
 *  library's MY_SERVICES_KEY, but this page scopes the access rules by it too,
 *  so it lives here rather than being borrowed. */
export const MINE_KEY = '__mine__';

const MINE_COLOR = '#3b82f6';

const TYPES: { value: MediaType | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Shows' },
];

type LeavingFiltersProps = {
  services: { service: string; count: number }[];
  selected: string[];
  onToggleService: (service: string) => void;
  hasOwned: boolean;
  mediaType: MediaType | null;
  onChangeType: (type: MediaType | null) => void;
};

export function LeavingFilters({
  services,
  selected,
  onToggleService,
  hasOwned,
  mediaType,
  onChangeType,
}: LeavingFiltersProps) {
  return (
    <View className="gap-2">
      <View className="flex-row rounded-lg border border-border bg-secondary p-1">
        {TYPES.map((type) => {
          const active = mediaType === type.value;
          return (
            <Pressable
              key={type.label}
              onPress={() => onChangeType(type.value)}
              className={`flex-1 items-center rounded-md py-1.5 ${active ? 'bg-card' : ''}`}
            >
              <Text className={active ? 'text-sm font-semibold text-foreground' : 'text-sm text-muted-foreground'}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
        {hasOwned && (
          <Chip
            label="My services"
            color={MINE_COLOR}
            selected={selected.includes(MINE_KEY)}
            onPress={() => onToggleService(MINE_KEY)}
            icon={
              <Star
                size={12}
                color={MINE_COLOR}
                fill={selected.includes(MINE_KEY) ? MINE_COLOR : 'transparent'}
              />
            }
          />
        )}
        {services.map(({ service, count }) => (
          <Chip
            key={service}
            label={`${service} ${count}`}
            color={onDarkColor(getServiceStyle(service).color)}
            selected={selected.includes(service)}
            onPress={() => onToggleService(service)}
          />
        ))}
      </ScrollView>
    </View>
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
      className="h-8 flex-row items-center gap-1.5 rounded-full border px-3"
      style={{
        borderColor: selected ? color : 'transparent',
        // Hex tint, per the note in ServiceFilterChips — an hsl() token cannot
        // take the alpha suffix and silently renders as grey.
        backgroundColor: selected ? `${color}26` : 'rgba(255,255,255,0.06)',
      }}
    >
      {icon ?? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      <Text className={selected ? 'text-xs text-foreground' : 'text-xs text-muted-foreground'}>{label}</Text>
    </Pressable>
  );
}
