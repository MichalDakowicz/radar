import type { Ref } from 'react';
import { PixelRatio, Platform, View } from 'react-native';

import { ShareCard } from '@/features/recap/ShareCard';
import type { ShareCardData } from '@/lib/recapShare';

/**
 * Target width, in pixels, of the shared image. 1080 is the width every social
 * app composes stories at, so the card arrives sharp rather than upscaled.
 */
const TARGET_PIXELS = 1080;

/**
 * Width to lay the card out at so the capture lands on TARGET_PIXELS. Native
 * captures at the screen's pixel density, so the layout width is divided by it;
 * on web html2canvas works in CSS pixels, so the layout width *is* the output.
 */
export const CAPTURE_WIDTH = Platform.OS === 'web' ? TARGET_PIXELS : Math.round(TARGET_PIXELS / PixelRatio.get());

type ShareCardCanvasProps = { data: ShareCardData; ref?: Ref<View> };

/**
 * The card, rendered off screen purely so it can be turned into a bitmap.
 *
 * Off screen rather than reusing the visible copy because only the yearly report
 * shows one, and because the visible copy is sized to fit a phone — the share
 * sheet should not send a card whose resolution depends on how tall the device is.
 *
 * It mounts with the player rather than on demand: the posters are remote images,
 * and capturing a card whose covers had not decoded yet would send empty plates.
 * `collapsable={false}` keeps Android from flattening the view away before the
 * capture can find it.
 */
export function ShareCardCanvas({ data, ref }: ShareCardCanvasProps) {
  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      // Parked to the left of the screen instead of hidden: an opacity-0 or
      // display-none view has nothing to draw, and the capture would come back
      // blank or zero-sized.
      style={{ position: 'absolute', top: 0, left: -CAPTURE_WIDTH - 40, width: CAPTURE_WIDTH }}
    >
      <ShareCard data={data} width={CAPTURE_WIDTH} />
    </View>
  );
}
