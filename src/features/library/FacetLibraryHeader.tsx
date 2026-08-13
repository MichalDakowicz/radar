import { ExternalLink } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { GenreIcon } from '@/components/media/GenreIcon';
import { BackButton } from '@/components/ui/BackButton';
import type { FacetSummary, LibraryFacet } from '@/lib/libraryFacetView';

const MUTED = 'hsl(0 0% 63.9%)';

type FacetLibraryHeaderProps = {
  facet: LibraryFacet;
  title: string;
  summary: FacetSummary;
  /** Only director and genre have a TMDB page to escape to. */
  onOpenExternal?: () => void;
  externalLabel?: string;
};

// Header block of the /in-library screen: what was tapped, how much of the
// library it accounts for, and (for director / genre) the way out to the TMDB
// page the stat used to open directly.
export function FacetLibraryHeader({ facet, title, summary, onOpenExternal, externalLabel }: FacetLibraryHeaderProps) {
  const strip = [
    summary.avgRating ? `avg ${summary.avgRating}` : null,
    summary.hours > 0 ? `${summary.hours}h` : null,
    summary.completed > 0 ? `${summary.completed} completed` : null,
  ].filter(Boolean);

  return (
    <View className="gap-3 px-4 pb-4">
      <View className="flex-row items-center gap-3">
        <BackButton />
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {facet === 'genre' && <GenreIcon genre={title} size={22} color="hsl(0 0% 98%)" />}
          <Text className="flex-1 text-2xl font-bold tracking-tight text-foreground">{title}</Text>
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-sm text-muted-foreground">
          {summary.count} {summary.count === 1 ? 'title' : 'titles'} in your library
        </Text>
        {strip.length > 0 && <Text className="text-xs text-muted-foreground/70">{strip.join(' · ')}</Text>}
      </View>

      {!!onOpenExternal && (
        <Pressable
          onPress={onOpenExternal}
          className="flex-row items-center gap-2 self-start rounded-full border border-border bg-secondary px-3 py-2"
        >
          <ExternalLink size={14} color={MUTED} />
          <Text className="text-sm text-muted-foreground">{externalLabel ?? 'Open page'}</Text>
        </Pressable>
      )}
    </View>
  );
}
