import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BottomSheetModal, Sheet } from '@/components/ui/Sheet';

export type BrowseResultFilter = 'All' | 'Movies' | 'TV' | 'People' | 'Genres';
const OPTIONS: BrowseResultFilter[] = ['All', 'Movies', 'TV', 'People', 'Genres'];

type BrowseResultFilterSheetProps = { value: BrowseResultFilter; onChange: (value: BrowseResultFilter) => void };

// Result-type filter for universal search (doc 03 Browse "result-type filter").
export const BrowseResultFilterSheet = forwardRef<BottomSheetModal, BrowseResultFilterSheetProps>(
  function BrowseResultFilterSheet({ value, onChange }, ref) {
    return (
      <Sheet ref={ref} snapPoints={['40%']}>
        <View className="gap-1 p-4">
          <Text className="pb-2 text-lg font-bold text-foreground">Result type</Text>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              className="rounded-lg px-3 py-3"
              style={{ backgroundColor: value === opt ? 'hsla(217,91%,60%,0.15)' : 'transparent' }}
            >
              <Text className={value === opt ? 'font-semibold text-primary' : 'text-foreground'}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    );
  },
);
