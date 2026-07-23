import { Switch, Text, View } from 'react-native';

import { useUserSettings } from '@/hooks/useUserSettings';

import { Segmented } from './Segmented';
import { SettingLabel } from './SettingsSection';

const DAY_OPTIONS = [7, 14, 30, 90];

// Controls the Library "Recently added" carousel: whether it shows and how many
// days back counts as recent. Feeds useLibraryFilters via user_settings.
export function RecentlyAddedControl() {
  const { settings, updateSettings } = useUserSettings();

  return (
    <>
      <View className="flex-row items-center justify-between">
        <SettingLabel title="Recently added section" description="Show a recently-added row on your Library" />
        <Switch
          value={settings.showRecentlyAdded}
          onValueChange={(showRecentlyAdded) => void updateSettings({ showRecentlyAdded })}
          trackColor={{ true: 'hsl(217 91% 60%)', false: 'hsl(0 0% 25%)' }}
        />
      </View>
      {settings.showRecentlyAdded && (
        <View className="gap-2">
          <Text className="text-xs text-muted-foreground">Include titles added within</Text>
          <Segmented
            columns={4}
            options={DAY_OPTIONS.map((d) => ({ value: String(d) as `${number}`, label: `${d}d` }))}
            value={String(settings.recentlyAddedDays) as `${number}`}
            onChange={(v) => void updateSettings({ recentlyAddedDays: Number(v) })}
          />
        </View>
      )}
    </>
  );
}
