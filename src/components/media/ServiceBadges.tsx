import { Text, View } from 'react-native';

import { getServiceStyle, normalizeAvailability } from '@/lib/services';

type ServiceBadgesProps = {
  availability: (string | null | undefined)[] | null | undefined;
  max?: number;
  size?: number;
};

// The one streaming-logo cluster (doc 04 issue H, doc 12 part 1). No icon
// assets - a colored short-label badge per service, single source in lib/services.
export function ServiceBadges({ availability, max = 3, size = 20 }: ServiceBadgesProps) {
  const services = normalizeAvailability(availability);
  if (services.length === 0) return null;

  const visible = services.slice(0, max);
  const hidden = services.length - visible.length;
  const overlap = size * 0.3;

  return (
    <View className="flex-row items-center">
      {visible.map((service, i) => {
        const style = getServiceStyle(service);
        return (
          <View
            key={service}
            className="items-center justify-center rounded-full border border-white/10"
            style={{
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: visible.length - i,
              backgroundColor: style.color,
            }}
          >
            <Text style={{ fontSize: size * 0.32, color: style.textColor }} className="font-bold">
              {style.short}
            </Text>
          </View>
        );
      })}
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
