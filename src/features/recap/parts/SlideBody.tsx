import { Text } from 'react-native';

import { RECAP } from '@/features/recap/recapTheme';

type SlideBodyProps = {
  children: string;
  size?: number;
  color?: string;
};

/** The line of commentary under a headline. */
export function SlideBody({ children, size = 13.5, color = RECAP.muted }: SlideBodyProps) {
  return <Text style={{ fontSize: size, lineHeight: size * 1.5, color }}>{children}</Text>;
}
