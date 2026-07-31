import { Download } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ReleaseNotes } from '@/features/updates/ReleaseNotes';
import { openDownload, useAppUpdateNotice } from '@/hooks/useAppUpdate';

/**
 * One-shot "new version available" notice for the sideloaded Android build.
 * Mounted at the root so it fires wherever the user lands, and dismissal is
 * remembered per version (see useAppUpdateNotice) - not per launch.
 */
export function UpdateNotice() {
  const { release, visible, installedVersion, dismiss } = useAppUpdateNotice();

  if (!visible || !release) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-5">
          <View className="gap-1">
            <Text className="text-lg font-bold text-card-foreground">Update available</Text>
            <Text className="text-sm text-muted-foreground">
              Radar {release.version} is out. You&apos;re on {installedVersion}.
            </Text>
          </View>

          {!!release.notes && (
            <ScrollView style={{ maxHeight: 200 }} contentContainerClassName="pr-1">
              <ReleaseNotes body={release.notes} />
            </ScrollView>
          )}

          <Text className="text-xs text-muted-foreground">
            {release.apkUrl
              ? 'Downloads the APK from GitHub. Install it over your current build - your library stays put.'
              : 'Opens the release page on GitHub.'}
          </Text>

          <View className="flex-row justify-end gap-3 pt-1">
            <Pressable onPress={dismiss} className="rounded-full px-4 py-2 active:opacity-70">
              <Text className="font-medium text-foreground">Later</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                dismiss();
                void openDownload(release);
              }}
              className="flex-row items-center gap-2 rounded-full px-4 py-2 active:opacity-80"
              style={{ backgroundColor: 'hsl(217 91% 60%)' }}
            >
              <Download size={16} color="#fff" />
              <Text className="font-semibold text-white">Download</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
