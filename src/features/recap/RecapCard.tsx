import { Archive, CalendarDays, ChevronRight, FileText } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { periodDisplayName, periodLabel, type RecapKind } from '@/lib/recapPeriod';

type RecapCardProps = {
  /** Newest month with watch activity, or null when there is none. */
  monthKey: string | null;
  /** Newest year with watch activity. */
  yearKey: string | null;
  /** True when more periods exist than the two buttons above. */
  hasArchive: boolean;
  onOpen: (kind: RecapKind, key: string) => void;
  onOpenArchive: () => void;
};

/**
 * Recap's home on the Profile tab: the two recaps worth opening right now, with
 * everything older behind the archive. Sits under the random picker — the picker
 * asks what to watch next, this one is about what already happened.
 */
export function RecapCard({ monthKey, yearKey, hasArchive, onOpen, onOpenArchive }: RecapCardProps) {
  if (!monthKey && !yearKey) return null;

  return (
    <View className="gap-2.5 rounded-2xl border border-border bg-secondary/40 p-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-purple-500/15">
          <FileText size={19} color="hsl(271 91% 65%)" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[14.5px] font-bold text-foreground">Radar Recap</Text>
          <Text className="mt-0.5 text-[12px] text-muted-foreground">Out once the month or the year is over</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {monthKey && (
          <RecapButton
            label={periodDisplayName('month', monthKey).charAt(0) + periodDisplayName('month', monthKey).slice(1).toLowerCase()}
            sub="4 pages"
            icon={<CalendarDays size={15} color="#fff" />}
            primary
            onPress={() => onOpen('month', monthKey)}
          />
        )}
        {yearKey && (
          <RecapButton
            label={periodLabel('year', yearKey)}
            sub="9 pages"
            icon={<FileText size={15} color="hsl(0 0% 92%)" />}
            onPress={() => onOpen('year', yearKey)}
          />
        )}
      </View>

      {hasArchive && (
        <Pressable
          onPress={onOpenArchive}
          accessibilityRole="button"
          accessibilityLabel="View past recaps"
          className="h-10 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-black/20 active:opacity-70"
        >
          <Archive size={14} color="hsl(0 0% 63.9%)" />
          <Text className="text-[12.5px] font-semibold text-muted-foreground">Archive</Text>
          <ChevronRight size={14} color="hsl(0 0% 63.9%)" />
        </Pressable>
      )}
    </View>
  );
}

function RecapButton({
  label,
  sub,
  icon,
  primary,
  onPress,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play the ${label} recap, ${sub}`}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${
        primary ? 'bg-purple-600' : 'border border-border bg-black/30'
      } active:opacity-70`}
    >
      {icon}
      <Text className={`text-[12.5px] font-semibold ${primary ? 'text-white' : 'text-foreground'}`}>{label}</Text>
      <Text className={`text-[11px] ${primary ? 'text-white/70' : 'text-muted-foreground'}`}>{sub}</Text>
    </Pressable>
  );
}
