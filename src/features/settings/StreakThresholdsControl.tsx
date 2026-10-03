import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { ThresholdScope } from '@/lib/streakThresholds';

import { SettingLabel } from './SettingsSection';
import { ThresholdScopePicker } from './ThresholdScopePicker';
import { useStreakThresholds } from './useStreakThresholds';

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
//
// The steppers edit a draft. Applying asks how far back the new number reaches:
// "from now on" keeps what earlier weeks were measured against, "whole history"
// re-measures every week (lib/streakThresholds).
export function StreakThresholdsControl() {
  const { show } = useToast();
  const thresholds = useStreakThresholds();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ThresholdScope>('from-now');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await thresholds.apply(scope);
      setOpen(false);
    } catch (error) {
      show(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-6">
      <View className="gap-3">
        <SettingLabel title="Movie streak" description="Movies watched per week to keep your streak" />
        <Stepper value={thresholds.movie} min={1} max={50} unit="per week" onChange={thresholds.setMovie} />
      </View>
      <View className="gap-3">
        <SettingLabel title="TV streak" description="Episodes watched per week to keep your TV streak" />
        <Stepper value={thresholds.tv} min={1} max={100} unit="per week" onChange={thresholds.setTv} />
      </View>

      {thresholds.dirty && (
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              setScope('from-now');
              setOpen(true);
            }}
            accessibilityLabel="Apply streak thresholds"
            className="rounded-full bg-primary px-5 py-2.5 active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">Apply</Text>
          </Pressable>
          <Pressable onPress={thresholds.discard} accessibilityLabel="Undo streak threshold changes" className="px-3 py-2.5 active:opacity-70">
            <Text className="font-medium text-muted-foreground">Undo</Text>
          </Pressable>
        </View>
      )}

      <ConfirmDialog
        visible={open}
        title="Change streak threshold?"
        description="Weeks you have already watched through were measured against the old number. How far back should the new one reach?"
        confirmLabel="Apply"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      >
        <ThresholdScopePicker value={scope} onChange={setScope} />
      </ConfirmDialog>
    </View>
  );
}
