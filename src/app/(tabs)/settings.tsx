import { BarChart3, Clock, Database, Globe, LogOut, Monitor, User } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Header } from '@/components/layout/Header';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { signOut } from '@/features/auth/authActions';
import { CardSizeControl } from '@/features/settings/AppearanceExtras';
import { DataTools } from '@/features/settings/DataTools';
import { EditProfileSheet } from '@/features/settings/EditProfileSheet';
import { ImportExportSheet } from '@/features/settings/ImportExportSheet';
import { PrivacyControl } from '@/features/settings/PrivacyControl';
import { ProfileHeader } from '@/features/settings/ProfileHeader';
import { RecentlyAddedControl } from '@/features/settings/RecentlyAddedControl';
import { RegionControl } from '@/features/settings/RegionControl';
import { SettingsSection } from '@/features/settings/SettingsSection';
import { StreakThresholdsControl } from '@/features/settings/StreakThresholdsControl';
import { ThemeControl } from '@/features/settings/ThemeControl';
import { withTabReload } from '@/store/tabReload';

const MUTED = 'hsl(0 0% 63.9%)';

// Full Settings screen (doc 03, Phase 9). Thin composition layer: every control
// is its own small file (doc 10) and reads/writes user_settings via
// useUserSettings, except device-local prefs (theme runtime, card size).
export default withTabReload(Settings, 'settings');

function Settings() {
  const editProfileRef = useRef<BottomSheetModal>(null);
  const importExportRef = useRef<BottomSheetModal>(null);

  return (
    <View className="flex-1 bg-background">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-10 px-6 pb-16 pt-6">
        <SettingsSection icon={<User size={18} color={MUTED} />} title="Account">
          <ProfileHeader onEdit={() => editProfileRef.current?.present()} />
        </SettingsSection>

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

        <SettingsSection icon={<Globe size={18} color={MUTED} />} title="Region">
          <RegionControl />
        </SettingsSection>

        <SettingsSection icon={<BarChart3 size={18} color={MUTED} />} title="Stats">
          <StreakThresholdsControl />
        </SettingsSection>

        <SettingsSection icon={<Database size={18} color={MUTED} />} title="Data">
          <DataTools onOpenImportExport={() => importExportRef.current?.present()} />
        </SettingsSection>

        <Pressable
          onPress={signOut}
          className="flex-row items-center justify-center gap-2 rounded-full border border-border py-3 active:opacity-80"
        >
          <LogOut size={16} color="hsl(0 0% 98%)" />
          <Text className="font-medium text-foreground">Sign out</Text>
        </Pressable>
      </ScrollView>

      <EditProfileSheet ref={editProfileRef} />
      <ImportExportSheet ref={importExportRef} />
    </View>
  );
}
