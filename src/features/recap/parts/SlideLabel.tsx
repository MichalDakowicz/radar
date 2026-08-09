import { Text } from 'react-native';

import { MONO, RECAP } from '@/features/recap/recapTheme';

type SlideLabelProps = {
  children: string;
  /** Section accent — blue by default, amber on the masterpieces page. */
  color?: string;
};

/** The monospace section marker at the top of a slide — "01 — THE TOTALS". */
export function SlideLabel({ children, color = RECAP.movieSoft }: SlideLabelProps) {
  return (
    <Text
      style={{
        fontFamily: MONO,
        fontSize: 9.5,
        fontWeight: '600',
        letterSpacing: 1.7,
        color,
      }}
    >
      {children}
    </Text>
  );
}
