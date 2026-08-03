import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Recap } from '@/lib/recap';

// Getting the captured card out of the app. The capture itself lives with the
// component that renders it (features/recap); this is only the leaving part,
// which differs per platform: native hands a file to the share sheet, web hands
// a blob to the Web Share API or, failing that, to a download.

/** What the file is called wherever it lands: `radar-recap-2026-07.png`. */
export function recapImageName(recap: Recap): string {
  return `radar-recap-${recap.key}.png`;
}

/**
 * Restages the capture under a readable name. view-shot writes a temp file with
 * a generated name, and that name is what the share sheet and the receiving app
 * label the image with.
 */
function stageNamed(uri: string, filename: string): string {
  try {
    const staged = new File(Paths.cache, filename);
    if (staged.exists) staged.delete();
    new File(uri).copy(staged);
    return staged.uri;
  } catch {
    // A name is a nicety; sharing the temp file is still the right image.
    return uri;
  }
}

// expo-file-system exports its own `File`, so the DOM one needs a name of its
// own inside this module.
const WebFile = globalThis.File;

async function shareOnWeb(dataUri: string, filename: string): Promise<void> {
  const blob = await (await fetch(dataUri)).blob();
  const file = new WebFile([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  // No Web Share API for files (every desktop browser, and Firefox anywhere):
  // downloading the card is the honest equivalent — it is still the image, and
  // the user posts it themselves.
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Sends the captured card. `uri` is a file URI on native and a data URI on web,
 * which is what view-shot returns on each.
 *
 * Image only, no caption: an Android share intent carries either a file or text,
 * not both, and the card already says everything the text version did.
 */
export async function shareRecapImage(uri: string, filename: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    await shareOnWeb(uri, filename);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(stageNamed(uri, filename), { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
}
