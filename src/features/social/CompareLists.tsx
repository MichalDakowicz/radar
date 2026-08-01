import { Check, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PosterThumb } from '@/features/social/PosterThumb';
import type { CompareRow, TasteComparison } from '@/lib/compareTaste';
import { formatScore } from '@/lib/socialFeed';
import type { MediaType } from '@/types/movie';

export type GapRow = TasteComparison['gaps'][number];

type CompareListsProps = {
  comparison: TasteComparison;
  friendName: string;
  /** Keys already added to your watchlist this session, so the button can settle. */
  addedKeys: Set<string>;
  onOpenTitle: (tmdbId: number | null, type: MediaType, title: string) => void;
  onAddToWatchlist: (gap: GapRow) => void;
};

/** Where you agree, where you split, and what they loved that you have not seen. */
export function CompareLists({ comparison, friendName, addedKeys, onOpenTitle, onAddToWatchlist }: CompareListsProps) {
  return (
    <>
      {comparison.agree.length > 0 && (
        <Section title="Where you agree" tone="text-green-300">
          {comparison.agree.map((row) => (
            <ScoreRow key={row.key} row={row} onPress={() => onOpenTitle(row.tmdbId, row.type, row.title)} />
          ))}
        </Section>
      )}

      {comparison.split.length > 0 && (
        <Section title="Where you split" tone="text-red-300">
          {comparison.split.map((row) => (
            <ScoreRow
              key={row.key}
              row={row}
              subtitle={`${formatScore(row.gap)} apart`}
              danger
              onPress={() => onOpenTitle(row.tmdbId, row.type, row.title)}
            />
          ))}
        </Section>
      )}

      {comparison.gaps.length > 0 && (
        <Section title={`${friendName} rated it high, you have not`} tone="text-muted-foreground">
          {comparison.gaps.map((gap) => {
            const added = addedKeys.has(gap.key);
            return (
              <View
                key={gap.key}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-2.5"
              >
                <Pressable
                  onPress={() => onOpenTitle(gap.tmdbId, gap.type, gap.title)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${gap.title}`}
                  className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
                >
                  <PosterThumb coverUrl={gap.coverUrl} title={gap.title} width={36} radius={5} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={2} className="text-[13.5px] font-semibold text-foreground">
                      {gap.title}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-muted-foreground">
                      {friendName} rated it {formatScore(gap.theirs)}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => !added && onAddToWatchlist(gap)}
                  disabled={added}
                  accessibilityRole="button"
                  accessibilityLabel={
                    added ? `${gap.title} is on your watchlist` : `Add ${gap.title} to your watchlist`
                  }
                  className={`h-11 w-11 items-center justify-center rounded-lg border border-border ${
                    added ? 'bg-primary/15' : 'active:opacity-60'
                  }`}
                >
                  {added ? <Check size={18} color="hsl(213 94% 78%)" /> : <Plus size={18} color="hsl(0 0% 80%)" />}
                </Pressable>
              </View>
            );
          })}
        </Section>
      )}
    </>
  );
}

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5">
      <Text className={`text-[11px] font-bold uppercase tracking-widest ${tone}`}>{title}</Text>
      {children}
    </View>
  );
}

function ScoreRow({
  row,
  subtitle,
  danger,
  onPress,
}: {
  row: CompareRow;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${row.title}. You rated it ${formatScore(row.yours)}, they rated it ${formatScore(row.theirs)}`}
      className={`flex-row items-center gap-3 rounded-xl border p-2.5 active:opacity-70 ${
        danger ? 'border-red-500/20 bg-red-500/[0.04]' : 'border-border bg-card'
      }`}
    >
      <PosterThumb coverUrl={row.coverUrl} title={row.title} width={36} radius={5} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-[13.5px] font-semibold text-foreground">
          {row.title}
        </Text>
        {!!subtitle && <Text className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</Text>}
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-[12.5px] font-bold text-muted-foreground">{formatScore(row.yours)}</Text>
        <View className="h-px w-3.5 bg-border" />
        <Text className="text-[12.5px] font-bold text-primary">{formatScore(row.theirs)}</Text>
      </View>
    </Pressable>
  );
}
