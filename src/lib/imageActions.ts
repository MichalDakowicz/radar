import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// Save/copy for a remote poster, split per platform. Native stages the file in
// the cache dir and then writes it into the device gallery; web pulls the bytes
// down as a blob so the browser download keeps our filename instead of
// navigating to TMDB.

// expo-media-library's current entry point calls requireNativeModule() at
// import time and ships no web shim, so a static import would break the web
// bundle. Only the native branch ever reaches this.
function mediaLibrary() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-media-library') as typeof import('expo-media-library');
}

// Downloads onto an explicit destination file so the share sheet and the saved
// copy are labelled after the title, not TMDB's hashed path segment.
async function stageInCache(url: string, filename: string): Promise<File> {
  const staged = new File(Paths.cache, filename);
  if (staged.exists) staged.delete();
  return File.downloadFileAsync(url, staged, { idempotent: true });
}

function webDownload(blob: Blob, filename: string) {
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
 * Saves the image straight to the gallery (native) or downloads it (web) - no
 * share sheet, no picker. Asks for write access the first time and throws with
 * a readable message if it is refused.
 */
export async function saveImage(url: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    webDownload(await res.blob(), filename);
    return;
  }
  const MediaLibrary = mediaLibrary();
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Allow photo access to save posters');
  const file = await stageInCache(url, filename);
  await MediaLibrary.Asset.create(file.uri);
  // The gallery owns its own copy now, so the staged one is dead weight.
  if (file.exists) file.delete();
}

// Chrome only accepts PNG in the async clipboard, so a JPEG poster has to go
// through a canvas re-encode first.
async function blobToPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error('Could not convert the image');
  return png;
}

export type CopyResult = 'image' | 'link';

/**
 * Copies the image itself where the platform allows it, and falls back to
 * copying the link when it does not (Safari/Firefox reject image writes).
 */
export async function copyImage(url: string, filename: string): Promise<CopyResult> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const png = await blobToPng(await res.blob());
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      return 'image';
    } catch {
      await Clipboard.setStringAsync(url);
      return 'link';
    }
  }
  const file = await stageInCache(url, filename);
  await Clipboard.setImageAsync(await file.base64());
  return 'image';
}
