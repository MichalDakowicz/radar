import { Text, View } from 'react-native';

// Status-breakdown row (legacy ThinProgressBar.jsx): label, count/percent, bar.
type ThinProgressBarProps = {
  label: string;
  value: number;
  max: number;
};

export function ThinProgressBar({ label, value, max }: ThinProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between">
        <Text className="font-semibold text-foreground">{label}</Text>
        <Text className="text-sm font-medium text-muted-foreground">
          {value} items <Text className="text-muted-foreground/70">({percent}%)</Text>
        </Text>
      </View>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <View className="h-full rounded-full bg-foreground" style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}
