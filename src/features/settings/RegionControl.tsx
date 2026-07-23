import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useUserSettings } from '@/hooks/useUserSettings';
import { COUNTRIES, countryName } from '@/lib/countries';

import { SettingLabel } from './SettingsSection';

// Region used for streaming availability + the Browse release calendar. Single
// source is user_settings.watch_provider_country. Collapsed to one row by
// default (the full 19-country list was eating the screen); tap to expand.
export function RegionControl() {
  const { settings, updateSettings } = useUserSettings();
  const selected = settings.watchProviderCountry;
  const [open, setOpen] = useState(false);

  const pick = (code: string) => {
    void updateSettings({ watchProviderCountry: code });
    setOpen(false);
  };

  return (
    <>
      <SettingLabel
        title="Region"
        description="Sets streaming availability and which country's release dates the calendar uses"
      />
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between rounded-xl border border-border px-4 py-3"
      >
        <Text className="text-foreground">
          {countryName(selected)} <Text className="text-muted-foreground">({selected})</Text>
        </Text>
        <ChevronDown
          size={18}
          color="hsl(0 0% 63.9%)"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open && (
        <View className="overflow-hidden rounded-xl border border-border">
          {COUNTRIES.map((country, i) => {
            const active = selected === country.code;
            return (
              <Pressable
                key={country.code}
                onPress={() => pick(country.code)}
                className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                style={{ backgroundColor: active ? 'hsla(217,91%,60%,0.12)' : 'transparent' }}
              >
                <Text className={active ? 'font-semibold text-primary' : 'text-foreground'}>
                  {country.name} <Text className="text-muted-foreground">({country.code})</Text>
                </Text>
                {active && <Check size={16} color="hsl(217 91% 60%)" />}
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}
