import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Clapperboard, Plus, StickyNote, Tv } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DualRating, RatingStars } from '@/components/media/RatingStars';
import { StatusBadge } from '@/components/media/StatusBadge';
import { useHover, webTransition } from '@/hooks/useResponsive';
import { watchProgressPercent } from '@/lib/movieStatus';
import { cn, directorToDisplayString } from '@/lib/utils';
import type { Movie } from '@/types/movie';

// The single card every page routes posters through (doc 12 part 1) - model
// differences as variants/props here, never as a new file or inline markup.
export type MovieCardVariant = 'poster' | 'row' | 'hero' | 'compact' | 'featured';

export type MovieCardProps = {
  movie: Movie;
  variant?: MovieCardVariant;
  onPress?: (movie: Movie) => void;
  onAdd?: (movie: Movie) => void;
  onRemove?: (movie: Movie) => void;
  isAdded?: boolean;
  showStatus?: boolean;
  showRatings?: boolean;
  showFullDate?: boolean;
  highlighted?: boolean;
  readOnly?: boolean;
  /** Poster crossfade length. 0 for rapid source swaps (the random-pick reel). */
  posterTransitionMs?: number;
};

// Memoized: rendered in every FlashList cell (grid + carousels). Without this,
// a parent re-render (filter/search/theme change) re-renders every mounted
// card even when its own props are unchanged (doc 04 perf pass).
export const MovieCard = memo(MovieCardImpl);

function MovieCardImpl(props: MovieCardProps) {
  switch (props.variant) {
    case 'row':
      return <RowCard {...props} />;
    case 'hero':
      return <HeroCard {...props} />;
    case 'compact':
      return <CompactCard {...props} />;
    case 'featured':
      return <FeaturedCard {...props} />;
    default:
      return <PosterCard {...props} />;
  }
}

// Anything not fully watched gets the grayed-out treatment.
function isDimmed(movie: Movie) {
  return !movie.watched;
}

function PosterImage({ uri, dimmed, transitionMs = 200 }: { uri: string | null; dimmed?: boolean; transitionMs?: number }) {
  if (!uri) {
    return (
      <View className="absolute inset-0 items-center justify-center bg-neutral-800">
        <Clapperboard size={32} color="#525252" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[StyleSheet.absoluteFill, { opacity: dimmed ? 0.7 : 1 }]}
      contentFit="cover"
      transition={transitionMs}
      // Phase 10 perf: keep posters in the memory cache (not just disk) so
      // scrolling back up is instant, and key the image by uri so FlashList
      // cell recycling swaps the source cleanly instead of flashing the
      // previous poster during reuse.
      cachePolicy="memory-disk"
      recyclingKey={uri}
    />
  );
}

function PosterCard({
  movie,
  onPress,
  onAdd,
  onRemove,
  isAdded = false,
  showRatings = true,
  highlighted = false,
  readOnly = false,
  posterTransitionMs,
}: MovieCardProps) {
  const director = directorToDisplayString(movie.director);
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '';
  const isTracked = movie.inWatchlist || movie.inProgress || movie.watched;
  const canAdd = !!onAdd && !isAdded && !isTracked;
  const canRemove = !!onAdd && (isAdded || isTracked);
  const { hovered, bind } = useHover();

  return (
    // zIndex so the hover lift renders over its neighbours instead of under them.
    <View className="gap-1" style={hovered ? { zIndex: 10 } : undefined}>
      <Pressable
        {...bind}
        onPress={() => onPress?.(movie)}
        className="relative aspect-[2/3] overflow-hidden rounded-md bg-neutral-900"
        style={[
          { cursor: 'pointer' },
          webTransition('transform'),
          highlighted ? { borderWidth: 2, borderColor: '#3b82f6' } : null,
          hovered ? { transform: [{ scale: 1.035 }] } : null,
        ]}
      >
        <PosterImage uri={movie.coverUrl} dimmed={isDimmed(movie)} transitionMs={posterTransitionMs} />
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.2)', 'transparent']}
          locations={[0, 0.25, 0.55]}
          style={StyleSheet.absoluteFill}
        />

        {/* Poster grids show no title on phones (no room, and a tap is cheap);
            with a mouse the title is what you want on hover before clicking. */}
        {hovered && (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              locations={[0.4, 1]}
              style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
            />
            <View
              className={cn('absolute inset-x-0 bottom-0 p-2.5', canAdd || canRemove ? 'pr-11' : '')}
              style={{ pointerEvents: 'none' }}
            >
              <Text numberOfLines={2} className="text-xs font-semibold leading-tight text-white">
                {movie.title}
              </Text>
            </View>
          </>
        )}

        <View className="absolute inset-x-0 top-0 flex-row items-start justify-between gap-1.5 p-2.5">
          <View className="flex-1 flex-row items-center gap-1">
            {movie.type === 'tv' && (
              <View className="rounded bg-black/50 p-1">
                <Tv size={12} color="#fff" />
              </View>
            )}
            {!!director && (
              <Text numberOfLines={1} className="flex-1 text-[10px] font-medium text-neutral-300">
                {director}
              </Text>
            )}
          </View>
          {!!year && <Text className="text-[10px] font-medium text-neutral-400">{year}</Text>}
          {highlighted && <View className="h-2 w-2 rounded-full bg-blue-500" />}
        </View>

        {!readOnly && canAdd && (
          <Pressable onPress={() => onAdd?.(movie)} className="absolute bottom-2 right-2 rounded-full bg-blue-600/90 p-2">
            <Plus size={12} color="#fff" />
          </Pressable>
        )}
        {!readOnly && canRemove && (
          <Pressable
            onPress={() => onRemove?.(movie)}
            disabled={!onRemove}
            className="absolute bottom-2 right-2 rounded-full bg-green-600/90 p-2"
          >
            <Check size={12} color="#fff" />
          </Pressable>
        )}
        {!readOnly && !!movie.notes && (
          <View className="absolute bottom-2 left-2 rounded-full bg-neutral-800 p-1.5">
            <StickyNote size={12} color="#d4d4d4" />
          </View>
        )}
      </Pressable>

      {showRatings && <DualRating ratings={movie.ratings} voteAverage={movie.voteAverage} />}
    </View>
  );
}

function RowCard({ movie, onPress, showRatings = true, highlighted = false }: MovieCardProps) {
  const director = directorToDisplayString(movie.director);
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '';
  const { hovered, bind } = useHover();

  return (
    <Pressable
      {...bind}
      onPress={() => onPress?.(movie)}
      style={[{ cursor: 'pointer' }, webTransition('background-color'), hovered ? { backgroundColor: 'hsl(0 0% 16%)' } : null]}
      className={cn(
        'flex-row gap-3 rounded-xl border-l-4 p-3',
        highlighted ? 'border-l-blue-500 bg-neutral-800' : 'border-l-transparent bg-neutral-900',
      )}
    >
      <View className="h-28 w-20 overflow-hidden rounded-lg bg-neutral-800">
        <PosterImage uri={movie.coverUrl} dimmed={isDimmed(movie)} />
      </View>
      <View className="flex-1 justify-between py-0.5">
        <View className="gap-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text numberOfLines={1} className="flex-1 text-base font-bold text-foreground">
              {movie.title}
            </Text>
            {showRatings && <RatingStars ratings={movie.ratings} voteAverage={movie.voteAverage} size={5} />}
          </View>
          <Text className="text-xs text-muted-foreground">{[director, year].filter(Boolean).join(' • ')}</Text>
          {!!movie.overview && (
            <Text numberOfLines={2} className="text-xs leading-snug text-muted-foreground">
              {movie.overview}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function HeroCard({ movie, onPress, showRatings = true }: MovieCardProps) {
  const director = directorToDisplayString(movie.director);
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '';

  return (
    <Pressable
      onPress={() => onPress?.(movie)}
      style={{ cursor: 'pointer' }}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-900"
    >
      <PosterImage uri={movie.coverUrl} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
      <View className="absolute inset-x-0 bottom-0 gap-1.5 p-4">
        <Text numberOfLines={1} className="text-2xl font-bold text-white">
          {movie.title}
        </Text>
        <Text className="text-xs text-neutral-300">{[director, year].filter(Boolean).join(' • ')}</Text>
        {!!movie.overview && (
          <Text numberOfLines={2} className="text-sm text-neutral-200">
            {movie.overview}
          </Text>
        )}
        {showRatings && <RatingStars ratings={movie.ratings} voteAverage={movie.voteAverage} />}
      </View>
    </Pressable>
  );
}

// Full-width featured card (Continue watching / Coming soon carousels) - the
// watchlist_app html `.featured` banner ported into app tokens: wide backdrop,
// status badge, genre·year·type meta, title, and a progress fill bar pinned to
// the bottom. Rendered one-per-screen-width inside MediaCarousel (paging snap).
function FeaturedCard({ movie, onPress, showRatings = true, showFullDate = false, highlighted = false }: MovieCardProps) {
  const dateLabel = showFullDate ? formatFullDate(movie.releaseDate) : movie.releaseDate?.slice(0, 4) ?? '';
  const progress = watchProgressPercent(movie);
  const hasRating = movie.voteAverage > 0;
  const genre = movie.genres?.[0]?.name;

  return (
    <Pressable
      onPress={() => onPress?.(movie)}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-900"
      style={[{ cursor: 'pointer' }, highlighted ? { borderWidth: 2, borderColor: '#3b82f6' } : null]}
    >
      <PosterImage uri={movie.backdropUrl || movie.coverUrl} dimmed={isDimmed(movie)} />
      {/* Left veil anchors the text, bottom veil blends into the progress bar. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.15)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />

      <View className="absolute inset-x-0 top-0 flex-row items-start justify-between p-3">
        {!!genre && (
          <Text className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {genre}
          </Text>
        )}
        {!!dateLabel && <Text className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-neutral-300">{dateLabel}</Text>}
      </View>

      <View className="absolute inset-x-0 bottom-0 gap-1.5 px-4 pb-5">
        <Text numberOfLines={1} className="text-xl font-bold leading-tight text-white">
          {movie.title}
        </Text>
        {(!!movie.overview || (showRatings && hasRating)) && (
          <View className="flex-row items-center gap-2">
            {showRatings && hasRating && <Text className="text-xs font-semibold text-primary">★ {movie.voteAverage.toFixed(1)}</Text>}
            {!!movie.overview && (
              <Text numberOfLines={1} className="flex-1 text-xs text-neutral-300">
                {movie.overview}
              </Text>
            )}
          </View>
        )}
      </View>

      {progress > 0 && (
        <View className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <View className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </View>
      )}
    </Pressable>
  );
}

function formatFullDate(releaseDate: string | null | undefined): string {
  if (!releaseDate) return '';
  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) return releaseDate;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function CompactCard({ movie, onPress, showStatus = true, highlighted = false }: MovieCardProps) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      {...bind}
      onPress={() => onPress?.(movie)}
      className="relative aspect-[2/3] overflow-hidden rounded-md bg-neutral-900"
      style={[
        { cursor: 'pointer' },
        webTransition('transform'),
        highlighted ? { borderWidth: 2, borderColor: '#3b82f6' } : null,
        hovered ? { transform: [{ scale: 1.04 }], zIndex: 10 } : null,
      ]}
    >
      <PosterImage uri={movie.coverUrl} dimmed={isDimmed(movie)} />
      {showStatus && (
        <View className="absolute left-1.5 top-1.5">
          <StatusBadge movie={movie} />
        </View>
      )}
      <View className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
        <Text numberOfLines={1} className="text-[11px] font-semibold text-white">
          {movie.title}
        </Text>
      </View>
    </Pressable>
  );
}
