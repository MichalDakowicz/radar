import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BottomSheetModal, Sheet } from '@/components/ui/Sheet';
import { type GroupBy, useLibraryPrefs } from '@/store/libraryPrefs';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'director', label: 'Director' },
  { value: 'year', label: 'Year' },
  { value: 'genre', label: 'Genre' },
  { value: 'availability', label: 'Service' },
  { value: 'status', label: 'Status' },
];

// A separate small sheet for Group By (ported from legacy Home.jsx's own
// "Group" popover, distinct from the Filters popover) rather than folding it
// into LibraryFilterSheet.
export const GroupBySheet = forwardRef<BottomSheetModal>(function GroupBySheet(_props, ref) {
  const { groupBy, setGroupBy } = useLibraryPrefs();

  return (
    <Sheet ref={ref} snapPoints={[320]}>
      <View className="gap-1 p-4">
        <Text className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">Group by</Text>
        {GROUP_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setGroupBy(opt.value)}
            className="rounded-lg px-3 py-2.5"
            style={{ backgroundColor: groupBy === opt.value ? 'hsla(217,91%,60%,0.12)' : 'transparent' }}
          >
            <Text className={groupBy === opt.value ? 'font-medium text-primary' : 'text-foreground'}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
});
