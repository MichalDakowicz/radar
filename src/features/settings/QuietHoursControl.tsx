import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, Switch, Text, View } from 'react-native';

import { useUserSettings } from '@/hooks/useUserSettings';

import { SettingLabel } from './SettingsSection';

/** Equal bounds is how the schema says "no quiet hours" — see notifications.sql. */
const OFF = { notifyQuietStart: 0, notifyQuietEnd: 0 };
const DEFAULT_ON = { notifyQuietStart: 23, notifyQuietEnd: 8 };

function label(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function HourPicker({ value, onChange, accessibilityLabel }: { value: number; onChange: (v: number) => void; accessibilityLabel: string }) {
  // Wrapping rather than clamping: a window that runs 23:00 → 08:00 is the
  // normal case, so the end of the dial has to meet its beginning.
  const step = (delta: number) => onChange((value + delta + 24) % 24);

  return (
    <View className="items-center gap-1">
      <Pressable
        onPress={() => step(1)}
        accessibilityRole="button"
        accessibilityLabel={`Later ${accessibilityLabel}`}
        className="h-9 w-16 items-center justify-center rounded-lg border border-border active:opacity-70"
      >
        <ChevronUp size={16} color="hsl(0 0% 98%)" />
      </Pressable>
      <Text className="text-xl font-bold tabular-nums text-foreground">{label(value)}</Text>
      <Pressable
        onPress={() => step(-1)}
        accessibilityRole="button"
        accessibilityLabel={`Earlier ${accessibilityLabel}`}
        className="h-9 w-16 items-center justify-center rounded-lg border border-border active:opacity-70"
      >
        <ChevronDown size={16} color="hsl(0 0% 98%)" />
      </Pressable>
    </View>
  );
}

/**
 * The window in which a notification is written to the inbox but not pushed.
 * Server-side (pending_push_notifications holds the row back rather than
 * dropping it), so a quiet night arrives as a full inbox in the morning rather
 * than as nothing at all.
 */
export function QuietHoursControl({ disabled }: { disabled?: boolean }) {
  const { settings, updateSettings } = useUserSettings();
  const { notifyQuietStart: start, notifyQuietEnd: end } = settings;
  const on = start !== end;

  return (
    <View className="gap-4" style={{ opacity: disabled ? 0.45 : 1 }}>
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1">
          <SettingLabel
            title="Quiet hours"
            description={on ? `No banners between ${label(start)} and ${label(end)}` : 'Banners can arrive at any hour'}
          />
        </View>
        <Switch
          value={on}
          disabled={disabled}
          onValueChange={(next) => void updateSettings(next ? DEFAULT_ON : OFF)}
          trackColor={{ true: 'hsl(217 91% 60%)', false: 'hsl(0 0% 25%)' }}
        />
      </View>

      {on && !disabled && (
        <View className="flex-row items-center justify-center gap-6 rounded-xl border border-border bg-card p-3">
          <HourPicker
            value={start}
            accessibilityLabel="quiet hours start"
            onChange={(notifyQuietStart) => void updateSettings({ notifyQuietStart })}
          />
          <Text className="text-sm font-semibold text-muted-foreground">to</Text>
          <HourPicker
            value={end}
            accessibilityLabel="quiet hours end"
            onChange={(notifyQuietEnd) => void updateSettings({ notifyQuietEnd })}
          />
        </View>
      )}
    </View>
  );
}
