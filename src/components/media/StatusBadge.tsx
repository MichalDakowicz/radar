import { Bookmark, Check, Play, RotateCcw } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { isInProgress, isInWatchlist, isRewatch, isWatched, type MigratableMovie } from '@/lib/movieStatus';

export type StatusKind = 'watching' | 'watchlist' | 'completed' | 'rewatch';

// watched && inWatchlist = "want to rewatch" (doc 06 #3) - distinct badge,
// not just plain Watched.
export function getStatusKind(movie: MigratableMovie): StatusKind {
  if (isRewatch(movie)) return 'rewatch';
  if (isInProgress(movie)) return 'watching';
  if (isInWatchlist(movie)) return 'watchlist';
  if (isWatched(movie)) return 'completed';
  return 'watchlist';
}

const STATUS_META: Record<StatusKind, { label: string; icon: typeof Play; color: string }> = {
  watching: { label: 'Watching', icon: Play, color: '#22c55e' },
  completed: { label: 'Completed', icon: Check, color: '#3b82f6' },
  watchlist: { label: 'Watchlist', icon: Bookmark, color: '#ec4899' },
  rewatch: { label: 'Rewatch', icon: RotateCcw, color: '#f59e0b' },
};

type StatusBadgeProps = {
  movie: MigratableMovie;
  variant?: 'icon' | 'chip';
};

export function StatusBadge({ movie, variant = 'icon' }: StatusBadgeProps) {
  const kind = getStatusKind(movie);
  const meta = STATUS_META[kind];
  const Icon = meta.icon;

  if (variant === 'icon') {
    return (
      <View className="items-center justify-center rounded bg-black/50 p-1">
        <Icon size={12} color={meta.color} fill={kind === 'watching' ? meta.color : 'transparent'} />
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center gap-1 rounded border px-2 py-1"
      style={{ borderColor: `${meta.color}33`, backgroundColor: `${meta.color}1a` }}
    >
      <Icon size={12} color={meta.color} fill={kind === 'watching' ? meta.color : 'transparent'} />
      <Text style={{ color: meta.color }} className="text-xs font-semibold">
        {meta.label}
      </Text>
    </View>
  );
}
