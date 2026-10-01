import { BarChart3, Bell, Clock, Database, Globe, Info, Monitor, Smartphone, Tv } from 'lucide-react-native';
import { useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { NavIslands } from '@/components/layout/NavIslands';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { CardSizeControl } from '@/features/settings/AppearanceExtras';
import { QrLoginControl } from '@/features/auth/qr/QrLoginControl';
import { AppUpdateControl } from '@/features/settings/AppUpdateControl';
import { DataTools } from '@/features/settings/DataTools';
import { ImportExportSheet } from '@/features/settings/ImportExportSheet';
import { MyServicesControl } from '@/features/settings/MyServicesControl';
import { NotificationsControl } from '@/features/settings/NotificationsControl';
import { PrivacyControl } from '@/features/settings/PrivacyControl';
import { RecentlyAddedControl } from '@/features/settings/RecentlyAddedControl';
import { RegionControl } from '@/features/settings/RegionControl';
import { SettingsSection } from '@/features/settings/SettingsSection';
import { SignOutControl } from '@/features/settings/SignOutControl';
import { StreakThresholdsControl } from '@/features/settings/StreakThresholdsControl';
import { ThemeControl } from '@/features/settings/ThemeControl';
import { NestedHeader } from '@/features/social/NestedHeader';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
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
  const navBarSpace = useNavBarSpace();
  const importExportRef = useRef<BottomSheetModal>(null);

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title="Settings" />
      <ContentShell fill maxWidth={MAX_W.text}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-10 px-6 pt-6"
          contentContainerStyle={[contentStyle, { paddingBottom: navBarSpace + 16 }]}
        >
          <SettingsSection icon={<Globe size={18} color={MUTED} />} title="Privacy">
            <PrivacyControl />
          </SettingsSection>

          <SettingsSection icon={<Bell size={18} color={MUTED} />} title="Notifications">
            <NotificationsControl />
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

          <SettingsSection icon={<Smartphone size={18} color={MUTED} />} title="Other devices">
            <QrLoginControl />
          </SettingsSection>

          <SettingsSection icon={<Info size={18} color={MUTED} />} title="About">
            <AppUpdateControl />
          </SettingsSection>

          <SignOutControl />
        </ScrollView>
      </ContentShell>

      {/* Pushed out of the tabs, so the navigator's own bar is gone - the screen
          mounts it itself and Profile stays lit while you are down here. */}
      <NavIslands />

      <ImportExportSheet ref={importExportRef} />
    </View>
  );
}
