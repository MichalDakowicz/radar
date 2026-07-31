import { Pressable, Text, View } from 'react-native';

export type DetailTab = 'details' | 'ratings' | 'episodes';

// Segmented control under the owned-title controls (doc 03 Edit). Only owned
// titles get it - a not-yet-owned title has nothing to put in Ratings or
// Episodes, so its catalogue sections stay in the main scroll instead.
export function DetailTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: DetailTab; label: string }[];
  value: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  return (
    <View className="mx-4 mb-3 mt-2 flex-row rounded-lg border border-border bg-secondary p-1">
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          className={`flex-1 items-center rounded-md py-2 ${value === t.key ? 'bg-card' : ''}`}
        >
          <Text
            numberOfLines={1}
            className={
              value === t.key
                ? 'text-xs font-bold uppercase text-foreground'
                : 'text-xs font-bold uppercase text-muted-foreground'
            }
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
