import { Text, View } from 'react-native';

import { normalizeAvailability } from '@/lib/services';

type AvailabilityBadgesProps = {
  availability: (string | null | undefined)[] | null | undefined;
};

// Full labeled service chips for the detail screen (doc 03 `AvailabilityBadges`)
// - distinct from the compact overlapping `ServiceBadges` used on cards.
export function AvailabilityBadges({ availability }: AvailabilityBadgesProps) {
  const services = normalizeAvailability(availability);
  if (services.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-2">
      {services.map((service) => (
        <View key={service} className="rounded-full border border-border bg-secondary px-3 py-1.5">
          <Text className="text-sm font-medium text-foreground">{service}</Text>
        </View>
      ))}
    </View>
  );
}
