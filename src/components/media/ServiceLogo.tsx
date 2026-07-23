import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import Appletv from '@/assets/services/appletv.svg';
import Criterion from '@/assets/services/criterion.svg';
import Disneyplus from '@/assets/services/disneyplus.svg';
import Fubo from '@/assets/services/fubo.svg';
import Hulu from '@/assets/services/hulu.svg';
import Max from '@/assets/services/max.svg';
import Netflix from '@/assets/services/netflix.svg';
import Paramountplus from '@/assets/services/paramountplus.svg';
import Primevideo from '@/assets/services/primevideo.svg';

// Normalized service name (lib/services SERVICE_CONFIG keys) -> brand logo.
// Only the services that ship an icon in legacy/public/icons are mapped;
// unmapped ones (e.g. Peacock, Other) fall back to the letter badge.
const SERVICE_LOGOS: Record<string, FC<SvgProps>> = {
  Netflix,
  'Prime Video': Primevideo,
  'Disney+': Disneyplus,
  Hulu,
  Max,
  'Apple TV+': Appletv,
  'Paramount+': Paramountplus,
  Fubo,
  'Criterion Channel': Criterion,
};

export function hasServiceLogo(service: string | null | undefined): boolean {
  return !!service && service in SERVICE_LOGOS;
}

type ServiceLogoProps = {
  service: string;
  size?: number;
};

// Brand logos are self-contained marks - render as-is (they read on a dark
// tile). Returns null for unmapped services so callers can fall back.
export function ServiceLogo({ service, size = 20 }: ServiceLogoProps) {
  const Logo = SERVICE_LOGOS[service];
  if (!Logo) return null;
  return <Logo width={size} height={size} />;
}
