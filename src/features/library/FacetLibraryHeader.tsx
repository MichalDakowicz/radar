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
};

// Header block of the /in-library screen: what was tapped, how much of the
// library it accounts for, and (for director / genre) the way out to the TMDB
// page the stat used to open directly.
export function FacetLibraryHeader({ facet, title, summary, onOpenExternal }: FacetLibraryHeaderProps) {
  const strip = [
    summary.avgRating ? `avg ${summary.avgRating}` : null,
    summary.hours > 0 ? `${summary.hours}h` : null,
    summary.completed > 0 ? `${summary.completed} completed` : null,
  ].filter(Boolean);

  return (
    <View className="gap-3 px-4 pb-4">
      {/* Title row carries the way out to TMDB, so the two things that say
          "what am I looking at" share one line. */}
      <View className="flex-row items-center gap-3">
        <BackButton />
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {facet === 'genre' && <GenreIcon genre={title} size={22} color="hsl(0 0% 98%)" />}
          <Text numberOfLines={2} className="flex-1 text-2xl font-bold tracking-tight text-foreground">
            {title}
          </Text>
        </View>
        {!!onOpenExternal && (
          <Pressable
            onPress={onOpenExternal}
            className="h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary"
          >
            <ExternalLink size={18} color={MUTED} />
          </Pressable>
        )}
      </View>

      {/* Count left, stat strip right - one line instead of two stacked. */}
      <View className="flex-row items-end justify-between gap-3">
        <Text className="shrink text-sm text-muted-foreground">
          {summary.count} {summary.count === 1 ? 'title' : 'titles'} in your library
        </Text>
        {strip.length > 0 && <Text className="shrink-0 text-xs text-muted-foreground/70">{strip.join(' · ')}</Text>}
      </View>
    </View>
  );
}
