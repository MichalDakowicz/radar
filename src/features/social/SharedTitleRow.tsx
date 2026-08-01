import { Pressable, Text, View } from 'react-native';

import { ServiceBadges } from '@/components/media/ServiceBadges';
import { PosterThumb } from '@/features/social/PosterThumb';
import type { SharedTitle } from '@/lib/sharedWatchlist';

type SharedTitleRowProps = {
  title: SharedTitle;
  chosen: boolean;
  onPress: () => void;
};

function runtimeLabel(minutes: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${rest}m`;
}

/** One title on both watchlists, with where you could actually watch it. */
export function SharedTitleRow({ title, chosen, onPress }: SharedTitleRowProps) {
  const meta = [title.releaseYear, runtimeLabel(title.runtime), title.type === 'tv' ? 'Series' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={chosen ? `${title.title}, picked for tonight` : `Open ${title.title}`}
      className={`flex-row items-center gap-3 rounded-xl border p-2.5 active:opacity-70 ${
        chosen ? 'border-primary/60 bg-primary/10' : 'border-border bg-card'
      }`}
    >
      <PosterThumb coverUrl={title.coverUrl} title={title.title} width={44} />
      <View className="min-w-0 flex-1 gap-1.5">
        <Text numberOfLines={2} className="text-[14.5px] font-bold leading-[18px] text-foreground">
          {title.title}
        </Text>
        {!!meta && <Text className="text-[11.5px] text-muted-foreground">{meta}</Text>}
        <ServiceBadges availability={title.services} size={21} max={4} />
      </View>
      {chosen && (
        <View className="rounded-full bg-primary px-2.5 py-1">
          <Text className="text-[10px] font-bold tracking-wider text-white">TONIGHT</Text>
        </View>
      )}
    </Pressable>
  );
}
