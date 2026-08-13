import { Text } from 'react-native';

import { leading, RECAP } from '@/features/recap/recapTheme';

type SlideHeadlineProps = {
  children: string;
  size?: number;
  color?: string;
};

/**
 * The one big sentence a slide is about. Tight leading and negative tracking are
 * what make it read as a headline rather than as a paragraph that got large.
 */
export function SlideHeadline({ children, size = 34, color = RECAP.ink }: SlideHeadlineProps) {
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: leading(size, size * 1.02),
        fontWeight: '700',
        letterSpacing: -size * 0.03,
        color,
      }}
    >
      {children}
    </Text>
  );
}
