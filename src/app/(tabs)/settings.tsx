import { Check, LogOut, Settings as SettingsIcon } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Header } from '@/components/layout/Header';
import { signOut } from '@/features/auth/authActions';
import { useAuth } from '@/features/auth/AuthProvider';
import { COUNTRIES } from '@/lib/countries';
import { type GridSize, useLibraryPrefs } from '@/store/libraryPrefs';

const CARD_SIZES: { key: GridSize; label: string }[] = [
  { key: 'compact', label: 'Compact' },
  { key: 'normal', label: 'Normal' },
  { key: 'large', label: 'Large' },
];

// Placeholder - real Settings screen (theme, watch-provider country,
// recently-added config, privacy, refresh metadata, import/export) lands in
// Phase 9 (doc 03). Card size moved here out of the Library toolbar; sign-out
// stays wired since it's the only way to log out.
export default function Settings() {
  const { user } = useAuth();
  const { gridSize, setGridSize, watchProviderCountry, setWatchProviderCountry } = useLibraryPrefs();

  return (
    <View className="flex-1 bg-background">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-8 px-6 pb-12 pt-6">
        <View className="items-center gap-3">
          <SettingsIcon size={40} color="hsl(0 0% 45%)" />
          <Text className="text-lg font-semibold text-foreground">Settings</Text>
          {!!user?.email && <Text className="text-sm text-muted-foreground">Signed in as {user.email}</Text>}
        </View>

        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appearance</Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-medium text-foreground">Card size</Text>
              <Text className="text-xs text-muted-foreground">Poster size in your library grid</Text>
            </View>
            <View className="flex-row rounded-lg border border-border bg-secondary p-1">
              {CARD_SIZES.map((size) => {
                const active = gridSize === size.key;
                return (
                  <Pressable
                    key={size.key}
                    onPress={() => setGridSize(size.key)}
                    className="rounded-md px-3 py-1.5"
                    style={{ backgroundColor: active ? 'hsl(0 0% 20%)' : 'transparent' }}
                  >
                    <Text className={active ? 'text-sm font-semibold text-foreground' : 'text-sm text-muted-foreground'}>{size.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text className="text-xs text-muted-foreground">Theme, privacy, and data tools land in Phase 9.</Text>
        </View>

        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</Text>
          <Text className="text-xs text-muted-foreground">
            Sets streaming availability and which country&apos;s release dates the Browse calendar uses.
          </Text>
          <View className="overflow-hidden rounded-xl border border-border">
            {COUNTRIES.map((country, i) => {
              const active = watchProviderCountry === country.code;
              return (
                <Pressable
                  key={country.code}
                  onPress={() => setWatchProviderCountry(country.code)}
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
        </View>

        <Pressable
          onPress={signOut}
          className="flex-row items-center justify-center gap-2 rounded-full border border-border py-3 active:opacity-80"
        >
          <LogOut size={16} color="hsl(0 0% 98%)" />
          <Text className="font-medium text-foreground">Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
