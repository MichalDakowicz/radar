import { Pressable, ScrollView, Text } from 'react-native';

import { FEED_FILTERS, type FeedFilter } from '@/lib/socialFeed';

type FeedFilterChipsProps = {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
};

/** Kind filter above the feed. Scrolls horizontally so the row never truncates. */
export function FeedFilterChips({ value, onChange }: FeedFilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 pb-1 pt-3">
      {FEED_FILTERS.map((filter) => {
        const active = filter.key === value;
        return (
          <Pressable
            key={filter.key}
            onPress={() => onChange(filter.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`h-11 justify-center rounded-full border px-4 active:opacity-70 ${
              active ? 'border-foreground bg-foreground' : 'border-border bg-card'
            }`}
          >
            <Text className={`text-[12.5px] font-semibold ${active ? 'text-background' : 'text-muted-foreground'}`}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
