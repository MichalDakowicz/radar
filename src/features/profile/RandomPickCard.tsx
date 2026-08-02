import { Library, Shuffle, Tv } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export type RandomPickScope = 'services' | 'library';

type RandomPickCardProps = {
  /** Watchlist titles on a service you said you subscribe to. */
  serviceCount: number;
  /** Every watchlist title, wherever it is streaming. */
  libraryCount: number;
  /** False when no services are configured — the scoped button has no meaning. */
  hasServices: boolean;
  onPick: (scope: RandomPickScope) => void;
};

/**
 * The random picker's new home. It used to be a bare shuffle icon in the
 * Library's top bar, where nothing said what it did; on your own shelf it can
 * ask the question out loud, which is the whole appeal of the feature.
 *
 * Two scopes because "what can I actually watch tonight" and "what is on the
 * pile" are different questions — the first is the one you usually mean, so it
 * leads.
 */
export function RandomPickCard({ serviceCount, libraryCount, hasServices, onPick }: RandomPickCardProps) {
  return (
    <View className="gap-2.5 rounded-2xl border border-primary/25 bg-primary/10 p-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <Shuffle size={19} color="hsl(217 91% 60%)" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[14.5px] font-bold text-foreground">Don&rsquo;t know what to watch?</Text>
          <Text className="mt-0.5 text-[12px] text-muted-foreground">Let me pick something off your watchlist</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <ScopeButton
          label="On my services"
          count={serviceCount}
          icon={<Tv size={15} color="#fff" />}
          primary
          // Without configured services the pool is meaningless rather than
          // empty, so the button says so instead of spinning on nothing.
          disabled={!hasServices || serviceCount === 0}
          onPress={() => onPick('services')}
        />
        <ScopeButton
          label="Whole library"
          count={libraryCount}
          icon={<Library size={15} color="hsl(0 0% 92%)" />}
          disabled={libraryCount === 0}
          onPress={() => onPick('library')}
        />
      </View>
    </View>
  );
}

function ScopeButton({
  label,
  count,
  icon,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} titles`}
      accessibilityState={{ disabled }}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${
        primary ? 'bg-primary' : 'border border-border bg-black/30'
      } active:opacity-70`}
      style={disabled ? { opacity: 0.4 } : undefined}
    >
      {icon}
      <Text className={`text-[12.5px] font-semibold ${primary ? 'text-primary-foreground' : 'text-foreground'}`}>
        {label}
      </Text>
      <Text className={`text-[11px] ${primary ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{count}</Text>
    </Pressable>
  );
}
