import { Text, View } from 'react-native';

import { getServiceStyle } from '@/lib/services';

import { hasServiceLogo, ServiceLogo } from './ServiceLogo';

type ServiceIconProps = {
  service: string;
  size?: number;
};

// One service, one round badge: the brand logo on a dark disc where we ship an
// SVG (assets/services), otherwise the service's colour with its short label.
// Extracted from ServiceBadges so the Settings picker draws exactly the mark
// the cards and the detail page do, rather than a second interpretation of it.
export function ServiceIcon({ service, size = 20 }: ServiceIconProps) {
  const style = getServiceStyle(service);
  const logo = hasServiceLogo(service);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full border border-white/10"
      style={{ width: size, height: size, backgroundColor: logo ? '#171717' : style.color }}
    >
      {logo ? (
        <ServiceLogo service={service} size={size * 0.62} />
      ) : (
        <Text style={{ fontSize: size * 0.32, color: style.textColor }} className="font-bold">
          {style.short}
        </Text>
      )}
    </View>
  );
}
