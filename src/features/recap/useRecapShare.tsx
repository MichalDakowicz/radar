import { useCallback, useMemo, useRef } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { ShareCardCanvas } from '@/features/recap/parts/ShareCardCanvas';
import { periodLabel } from '@/lib/recapPeriod';
import { recapShareText, shareCardFor } from '@/lib/recapShare';
import { recapImageName, shareRecapImage } from '@/lib/recapShareImage';
import { publicShelfUrl } from '@/lib/shelfLink';
import type { Recap } from '@/lib/recap';

/**
 * Shares the recap as the card itself, as an image.
 *
 * The card is what people react to — a paragraph of numbers is a screenshot
 * nobody takes. The caller has to render the returned `canvas` somewhere in its
 * tree: that off-screen copy is what gets captured, so the picture that leaves
 * the app is the full-resolution card rather than whatever fitted on screen.
 *
 * Text is still the fallback. If the capture fails on a device or a browser we
 * did not anticipate, a sentence with the numbers and a link to the shelf is a
 * better outcome than an error toast and nothing shared.
 */
export function useRecapShare(recap: Recap | null, username: string) {
  const { user } = useAuth();
  const { show } = useToast();
  const cardRef = useRef<View>(null);
  const data = useMemo(() => (recap ? shareCardFor(recap, username) : null), [recap, username]);

  const share = useCallback(async () => {
    if (!recap) return;
    const title = `My ${periodLabel(recap.kind, recap.key)} in Radar`;
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        // view-shot has no tmpfile on web, where the data URI is what the Web
        // Share API and the download both want anyway.
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      });
      await shareRecapImage(uri, recapImageName(recap), title);
      if (Platform.OS !== 'web') releaseCapture(uri);
      return;
    } catch {
      // Fall through to the text share rather than reporting the capture
      // failure: the user asked to share, not to hear about a bitmap.
    }
    try {
      await Share.share({ message: recapShareText(recap, user ? publicShelfUrl(user.id) : null) });
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not open the share sheet');
    }
  }, [recap, user, show]);

  return { share, canvas: data ? <ShareCardCanvas data={data} ref={cardRef} /> : null };
}
