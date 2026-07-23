import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useUserSettings } from '@/hooks/useUserSettings';

import { SettingLabel } from './SettingsSection';

function Stepper({
  value,
  min,
  max,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className="h-10 w-10 items-center justify-center rounded-lg border border-border"
        style={{ opacity: value <= min ? 0.4 : 1 }}
      >
        <Minus size={16} color="hsl(0 0% 98%)" />
      </Pressable>
      <View className="min-w-14 items-center">
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
      </View>
      <Pressable
        onPress={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="h-10 w-10 items-center justify-center rounded-lg border border-border"
        style={{ opacity: value >= max ? 0.4 : 1 }}
      >
        <Plus size={16} color="hsl(0 0% 98%)" />
      </Pressable>
      <Text className="text-sm font-medium text-muted-foreground">{unit}</Text>
    </View>
  );
}

// Weekly thresholds that define a "streak" week in Stats. Wired into computeStats
// via useStats (own-screen only; the public shelf uses defaults since
// user_settings is owner-only).
export function StreakThresholdsControl() {
  const { settings, updateSettings } = useUserSettings();
  return (
    <View className="gap-6">
      <View className="gap-3">
        <SettingLabel title="Movie streak" description="Movies watched per week to keep your streak" />
        <Stepper
          value={settings.streakThreshold}
          min={1}
          max={50}
          unit="per week"
          onChange={(v) => void updateSettings({ streakThreshold: v })}
        />
      </View>
      <View className="gap-3">
        <SettingLabel title="TV streak" description="Episodes watched per week to keep your TV streak" />
        <Stepper
          value={settings.tvStreakThreshold}
          min={1}
          max={100}
          unit="per week"
          onChange={(v) => void updateSettings({ tvStreakThreshold: v })}
        />
      </View>
    </View>
  );
}
