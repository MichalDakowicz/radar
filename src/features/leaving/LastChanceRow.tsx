import { useMemo } from 'react';

import { DiscoveryRow } from '@/features/browse/DiscoveryRow';
import type { Movie } from '@/types/movie';

import { leavingToMovie } from './leavingToMovie';
import { useLeavingSoon } from './useLeavingSoon';

// The discovery half of leaving-soon, on the Browse feed: things going from
// services you pay for that you never saved. The watchlist half lives in
// Browse → Calendar → Leaving, where someone goes on purpose; this row is for
// the case where they were not looking.
//
// Deliberately excludes anything already tracked — that is the other surface's
// job, and a rail that repeats the watchlist teaches people to scroll past it.

/** A rail, not a catalogue. Past this it stops being a prompt and starts being
 *  a chore, and the honest place for the full list is the Leaving tab. */
const MAX_ITEMS = 20;

/** Below this the rail is louder than the news it carries. */
const MIN_ITEMS = 3;

type LastChanceRowProps = {
  onPress: (movie: Movie) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

export function LastChanceRow({ onPress, onAdd, onRemove, isAdded }: LastChanceRowProps) {
  const { discover, loading } = useLeavingSoon();

  const items = useMemo(() => discover.slice(0, MAX_ITEMS).map(leavingToMovie), [discover]);

  if (loading || items.length < MIN_ITEMS) return null;

  const soonest = discover[0]?.daysLeft ?? 0;

  return (
    <DiscoveryRow
      title="Last chance on your services"
      badge={soonest <= 1 ? 'Ends today' : `${soonest} days left`}
      items={items}
      onPress={onPress}
      onAdd={onAdd}
      onRemove={onRemove}
      isAdded={isAdded}
    />
  );
}
