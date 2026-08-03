import { CalendarDays, ChevronRight, FileText } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { periodLabel, type RecapKind } from '@/lib/recapPeriod';

type RecapArchiveRowProps = {
  kind: RecapKind;
  periodKey: string;
  /** Already stored, so it opens without being rebuilt. */
  ready: boolean;
  onPress: () => void;
};

/** One period in the archive list. */
export function RecapArchiveRow({ kind, periodKey, ready, onPress }: RecapArchiveRowProps) {
  const label = periodLabel(kind, periodKey);
  const isYear = kind === 'year';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play the ${label} recap${ready ? ', ready' : ''}`}
      className="h-14 flex-row items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3.5 active:opacity-70"
    >
      <View className={`h-9 w-9 items-center justify-center rounded-full ${isYear ? 'bg-purple-500/15' : 'bg-primary/15'}`}>
        {isYear ? <FileText size={17} color="hsl(271 91% 65%)" /> : <CalendarDays size={17} color="hsl(217 91% 60%)" />}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-foreground">{label}</Text>
        <Text className="text-[11.5px] text-muted-foreground">
          {isYear ? 'Annual report · 9 pages' : 'Monthly recap · 4 pages'}
          {ready ? ' · ready' : ''}
        </Text>
      </View>
      <ChevronRight size={18} color="hsl(0 0% 63.9%)" />
    </Pressable>
  );
}
