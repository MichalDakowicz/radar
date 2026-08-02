import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';

// Netflix-style edge control for MediaCarousel: only materializes while the
// pointer is over the row, so a page of rows isn't covered in permanent chrome.
export function ScrollArrow({
  side,
  visible,
  onPress,
}: {
  side: 'left' | 'right';
  visible: boolean;
  onPress: () => void;
}) {
  const { hovered, bind } = useHover();
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;

  return (
    <Pressable
      {...bind}
      onPress={onPress}
      accessibilityLabel={side === 'left' ? 'Scroll left' : 'Scroll right'}
      style={[
        {
          // Hidden arrows must not eat clicks meant for the posters underneath.
          pointerEvents: visible ? 'auto' : 'none',
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 44,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: visible ? 1 : 0,
          backgroundColor: hovered ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
        },
        side === 'left' ? { left: 0 } : { right: 0 },
        webTransition('opacity, background-color'),
      ]}
    >
      <Icon size={26} color="#fff" />
    </Pressable>
  );
}
