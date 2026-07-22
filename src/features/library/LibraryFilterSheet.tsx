import { forwardRef, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ServiceFilterChips } from '@/components/media/ServiceFilterChips';
import { BottomSheetModal, Sheet } from '@/components/ui/Sheet';
import { type SortBy, type StatusFilter, useLibraryPrefs } from '@/store/libraryPrefs';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'rewatch', label: 'Rewatch' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'custom', label: 'Custom order' },
  { value: 'dateAdded', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'releaseDate', label: 'Release date' },
  { value: 'rating', label: 'Rating' },
  { value: 'director', label: 'Director' },
  { value: 'runtime', label: 'Runtime' },
];

function FilterChip<T extends string>({
  value,
  label,
  active,
  onPress,
}: {
  value: T;
  label: string;
  active: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      className="rounded-full border px-3 py-1.5"
      style={{
        borderColor: active ? 'hsl(217 91% 60%)' : 'transparent',
        backgroundColor: active ? 'hsla(217,91%,60%,0.15)' : 'rgba(255,255,255,0.06)',
      }}
    >
      <Text className={active ? 'text-primary' : 'text-muted-foreground'}>{label}</Text>
    </Pressable>
  );
}

function FilterRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

// Status + service + sort (doc 03 `LibraryFilterSheet`, doc 06 #2/#3). Group-by
// is its own sheet (`GroupBySheet`), mirroring legacy Home.jsx's separate
// Filters/Group popovers rather than one combined panel.
export const LibraryFilterSheet = forwardRef<BottomSheetModal>(function LibraryFilterSheet(_props, ref) {
  const { statusFilter, setStatusFilter, selectedServices, toggleService, sortBy, setSortBy, resetFilters } = useLibraryPrefs();

  return (
    <Sheet ref={ref} snapPoints={['70%']}>
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Filter &amp; Sort</Text>
          <Pressable onPress={resetFilters} className="flex-row items-center gap-1">
            <Text className="text-sm text-muted-foreground">Clear All</Text>
          </Pressable>
        </View>

        <FilterRow title="Status">
          {STATUS_OPTIONS.map((o) => (
            <FilterChip key={o.value} value={o.value} label={o.label} active={statusFilter === o.value} onPress={setStatusFilter} />
          ))}
        </FilterRow>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Streaming service</Text>
          <ServiceFilterChips selected={selectedServices} onToggle={toggleService} />
        </View>

        <FilterRow title="Sort by">
          {SORT_OPTIONS.map((o) => (
            <FilterChip key={o.value} value={o.value} label={o.label} active={sortBy === o.value} onPress={setSortBy} />
          ))}
        </FilterRow>
      </ScrollView>
    </Sheet>
  );
});
