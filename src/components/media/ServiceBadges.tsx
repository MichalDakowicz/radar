import { Text, View } from 'react-native';

import { normalizeAvailability } from '@/lib/services';

import { ServiceIcon } from './ServiceIcon';

type ServiceBadgesProps = {
  availability: (string | null | undefined)[] | null | undefined;
  max?: number;
  size?: number;
};

// The one streaming-logo cluster (doc 04 issue H, doc 12 part 1). Overlapping
// row of ServiceIcon discs, plus a "+n" disc for whatever is over `max`.
export function ServiceBadges({ availability, max = 3, size = 20 }: ServiceBadgesProps) {
  const services = normalizeAvailability(availability);
  if (services.length === 0) return null;

  const visible = services.slice(0, max);
  const hidden = services.length - visible.length;
  const overlap = size * 0.3;

  return (
    <View className="flex-row items-center">
      {visible.map((service, i) => (
        <View key={service} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: visible.length - i }}>
          <ServiceIcon service={service} size={size} />
        </View>
      ))}
      {hidden > 0 && (
        <View
          className="items-center justify-center rounded-full border border-white/10 bg-neutral-800"
          style={{ width: size, height: size, marginLeft: -overlap }}
        >
          <Text style={{ fontSize: size * 0.28 }} className="font-bold text-white">
            +{hidden}
          </Text>
        </View>
      )}
    </View>
  );
}
