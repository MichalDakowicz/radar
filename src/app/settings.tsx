import { BarChart3, Clock, Database, Globe, Info, LogOut, Monitor, Tv } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { signOut } from '@/features/auth/authActions';
import { CardSizeControl } from '@/features/settings/AppearanceExtras';
import { AppUpdateControl } from '@/features/settings/AppUpdateControl';
import { DataTools } from '@/features/settings/DataTools';
import { ImportExportSheet } from '@/features/settings/ImportExportSheet';
import { MyServicesControl } from '@/features/settings/MyServicesControl';
import { PrivacyControl } from '@/features/settings/PrivacyControl';
import { RecentlyAddedControl } from '@/features/settings/RecentlyAddedControl';
import { RegionControl } from '@/features/settings/RegionControl';
import { SettingsSection } from '@/features/settings/SettingsSection';
import { StreakThresholdsControl } from '@/features/settings/StreakThresholdsControl';
import { ThemeControl } from '@/features/settings/ThemeControl';
import { NestedHeader } from '@/features/social/NestedHeader';
import { MAX_W, useCenteredContentStyle } from '@/hooks/useResponsive';

const MUTED = 'hsl(0 0% 63.9%)';

// App preferences, pushed from the gear on the Profile tab rather than owning a
// tab of its own - settings are chrome you visit, not a place you live. Who you
// are (avatar, name, top 4, shelf link) lives on Profile now; what is left here
// is device and account preferences.
//
// Thin composition layer: every control is its own small file (doc 10) and
// reads/writes user_settings via useUserSettings, except device-local prefs
// (theme runtime, card size).
export default function Settings() {
  const contentStyle = useCenteredContentStyle(MAX_W.text);
  const importExportRef = useRef<BottomSheetModal>(null);

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title="Settings" />
      <ContentShell fill maxWidth={MAX_W.text}>
        <ScrollView className="flex-1" contentContainerClassName="gap-10 px-6 pb-16 pt-6" contentContainerStyle={contentStyle}>
          <SettingsSection icon={<Globe size={18} color={MUTED} />} title="Privacy">
            <PrivacyControl />
          </SettingsSection>

          <SettingsSection icon={<Monitor size={18} color={MUTED} />} title="Appearance">
            <ThemeControl />
            <CardSizeControl />
          </SettingsSection>

          <SettingsSection icon={<Clock size={18} color={MUTED} />} title="Library">
            <RecentlyAddedControl />
          </SettingsSection>

          <SettingsSection icon={<Tv size={18} color={MUTED} />} title="Services">
            <MyServicesControl />
          </SettingsSection>

          <SettingsSection icon={<Globe size={18} color={MUTED} />} title="Region">
            <RegionControl />
          </SettingsSection>

          <SettingsSection icon={<BarChart3 size={18} color={MUTED} />} title="Stats">
            <StreakThresholdsControl />
          </SettingsSection>

          <SettingsSection icon={<Database size={18} color={MUTED} />} title="Data">
            <DataTools onOpenImportExport={() => importExportRef.current?.present()} />
          </SettingsSection>

          <SettingsSection icon={<Info size={18} color={MUTED} />} title="About">
            <AppUpdateControl />
          </SettingsSection>

          <Pressable
            onPress={signOut}
            className="flex-row items-center justify-center gap-2 rounded-full border border-border py-3 active:opacity-80"
          >
            <LogOut size={16} color="hsl(0 0% 98%)" />
            <Text className="font-medium text-foreground">Sign out</Text>
          </Pressable>
        </ScrollView>
      </ContentShell>

      <ImportExportSheet ref={importExportRef} />
    </View>
  );
}
