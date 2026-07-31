import { Image } from 'expo-image';
import { Copy, Download, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { copyImage, saveImage } from '@/lib/imageActions';
import { highResImageUrl, posterFileName } from '@/lib/images';

type ImageViewerProps = {
  visible: boolean;
  uri: string | null;
  title: string;
  onClose: () => void;
};

type Busy = 'save' | 'copy' | null;

function ActionButton({
  icon,
  label,
  busy,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="flex-row items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5"
      style={{ opacity: busy ? 0.6 : 1 }}
    >
      {busy ? <ActivityIndicator size="small" color="#fff" /> : icon}
      <Text className="text-sm font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

// Full-screen artwork viewer, opened by tapping the poster on the detail
// screen. Loads the original TMDB rendition rather than the w500 the card
// used, and offers save/copy so the poster can leave the app.
export function ImageViewer({ visible, uri, title, onClose }: ImageViewerProps) {
  const { show } = useToast();
  const { width, height } = useWindowDimensions();
  const [busy, setBusy] = useState<Busy>(null);

  const fullUri = highResImageUrl(uri);
  const filename = posterFileName(title, fullUri);

  // The poster keeps its 2:3 ratio inside the safe area; whichever axis runs
  // out first decides the size, so it never crops or overflows.
  const maxW = width - 48;
  const maxH = height - 200;
  const boxW = Math.min(maxW, maxH * (2 / 3));

  const run = async (kind: Exclude<Busy, null>) => {
    if (!fullUri || busy) return;
    setBusy(kind);
    try {
      if (kind === 'save') {
        await saveImage(fullUri, filename);
        show(Platform.OS === 'web' ? 'Poster downloaded' : 'Poster saved to your gallery');
      } else {
        const result = await copyImage(fullUri, filename);
        show(result === 'image' ? 'Poster copied' : 'Link copied — your browser blocks image copying');
      }
    } catch (error) {
      show(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black/95">
        <Pressable className="flex-1 items-center justify-center px-6" onPress={onClose}>
          {!!fullUri && (
            <Image
              source={{ uri: fullUri }}
              style={{ width: boxW, height: boxW * 1.5, borderRadius: 12 }}
              contentFit="contain"
              transition={150}
            />
          )}
        </Pressable>

        <Pressable onPress={onClose} className="absolute right-5 top-14 rounded-full bg-white/10 p-2.5">
          <X size={22} color="#fff" />
        </Pressable>

        <View className="flex-row justify-center gap-3 pb-14 pt-4">
          <ActionButton
            icon={<Download size={16} color="#fff" />}
            label="Save"
            busy={busy === 'save'}
            onPress={() => run('save')}
          />
          <ActionButton
            icon={<Copy size={16} color="#fff" />}
            label="Copy"
            busy={busy === 'copy'}
            onPress={() => run('copy')}
          />
        </View>
      </View>
    </Modal>
  );
}
