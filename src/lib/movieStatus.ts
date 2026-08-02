// Ported 1:1 from the current app's src/lib/movieStatus.js (doc 02).
//
// Status flags:
// - inWatchlist / inProgress are mutually exclusive.
// - watched is independent — a title can be watched=true AND inWatchlist=true
//   (the "want to rewatch" case, doc 06 #3).
// - Default new item: inWatchlist=true, inProgress=false, watched=false.

export type StatusFlags = {
  inWatchlist: boolean;
  inProgress: boolean;
  watched: boolean;
};

// Loose input type: covers both normalized Movie rows and raw legacy
// (Firebase/RTDB) shapes fed through this during the data migration (doc 11).
export type MigratableMovie = {
  inWatchlist?: boolean;
  inProgress?: boolean;
  watched?: boolean;
  status?: string | null;
  timesWatched?: number;
  type?: string;
  number_of_episodes?: number;
  numberOfEpisodes?: number | null;
  episodesWatched?: Record<string, boolean>;
};

export function migrateStatus(movie: MigratableMovie, force = false): StatusFlags {
  if (
    !force &&
    movie.inWatchlist !== undefined &&
    movie.inProgress !== undefined &&
    movie.watched !== undefined
  ) {
    const inWatchlist = movie.inWatchlist || false;
    const inProgress = movie.inProgress || false;
    const watched = movie.watched || false;

    if (inProgress && inWatchlist) {
      return { inWatchlist: false, inProgress: true, watched };
    }
    return { inWatchlist, inProgress, watched };
  }

  const status = movie.status || 'Watchlist';
  const timesWatched = movie.timesWatched || 0;

  switch (status) {
    case 'Completed':
    case 'Watched':
      return { inWatchlist: false, inProgress: false, watched: true };

    case 'Watching': {
      const hasWatchedBefore = timesWatched > 0;
      return { inWatchlist: false, inProgress: true, watched: hasWatchedBefore };
    }

    case 'Watchlist':
    case 'Plan to Watch':
    default: {
      let watched = timesWatched > 0;

      if (movie.type === 'tv' && !watched) {
        const totalEpisodes = movie.number_of_episodes || movie.numberOfEpisodes || 0;
        const watchedEpisodes = movie.episodesWatched
          ? Object.values(movie.episodesWatched).filter(Boolean).length
          : 0;

        if (totalEpisodes > 0 && watchedEpisodes >= totalEpisodes) {
          watched = true;
        }
      }

      return { inWatchlist: true, inProgress: false, watched };
    }
  }
}

/** Priority: inProgress > inWatchlist > watched */
export function getDisplayStatus(movie: StatusFlags): string {
  if (movie.inProgress) return 'Watching';
  if (movie.inWatchlist) return 'Watchlist';
  if (movie.watched) return 'Completed';
  return 'Watchlist';
}

export function getFilterStatus(movie: StatusFlags): string {
  return getDisplayStatus(movie);
}

export function isInWatchlist(movie: MigratableMovie): boolean {
  if (movie.inWatchlist !== undefined) return movie.inWatchlist;
  const status = movie.status || 'Watchlist';
  return status === 'Watchlist' || status === 'Plan to Watch';
}

export function isInProgress(movie: MigratableMovie): boolean {
  if (movie.inProgress !== undefined) return movie.inProgress;
  return movie.status === 'Watching';
}

export function isWatched(movie: MigratableMovie): boolean {
  if (movie.watched !== undefined) return movie.watched;
  const status = movie.status || 'Watchlist';
  return status === 'Completed' || status === 'Watched' || (movie.timesWatched || 0) > 0;
}

/**
 * Underway *now*, which the inProgress flag alone does not prove: legacy
 * "Watching" rows migrate with watched set too, and a series can have its last
 * episode ticked without anyone clearing the flag. Anything that shows someone
 * mid-title — a shelf's In progress list, the feed's In progress rows — asks
 * this rather than reading the flag.
 */
export function isActivelyWatching(movie: MigratableMovie): boolean {
  return isInProgress(movie) && !isWatched(movie) && watchProgressPercent(movie) < 100;
}

/** "Want to rewatch" (doc 06 #3): watched=true and still in the watchlist. */
export function isRewatch(movie: MigratableMovie): boolean {
  return isWatched(movie) && isInWatchlist(movie);
}

/** Keeps watched status if already watched. */
export function setToWatchlist(movie: Partial<StatusFlags> = {}): StatusFlags & { status: string } {
  return {
    inWatchlist: true,
    inProgress: false,
    watched: movie.watched || false,
    status: 'Watchlist',
  };
}

/** Removes watchlist, keeps watched status. */
export function setToInProgress(movie: Partial<StatusFlags> = {}): StatusFlags & { status: string } {
  return {
    inWatchlist: false,
    inProgress: true,
    watched: movie.watched || false,
    status: 'Watching',
  };
}

/** Preserves watchlist status (the "want to rewatch" case). */
export function setToWatched(
  movie: Partial<StatusFlags> = {},
  timesWatched = 1,
): StatusFlags & { status: string; timesWatched: number } {
  return {
    inWatchlist: movie.inWatchlist || false,
    inProgress: false,
    watched: true,
    timesWatched,
    status: 'Completed',
  };
}

/**
 * Watch progress 0-100 for the card progress bar (library carousels).
 * TV = watched episodes / total episodes; a fully-watched title = 100.
 * Movies carry no partial state, so a not-yet-watched movie returns 0.
 */
export function watchProgressPercent(movie: MigratableMovie): number {
  if (isWatched(movie) && !isInProgress(movie)) return 100;
  if (movie.type === 'tv') {
    const total = movie.numberOfEpisodes || movie.number_of_episodes || 0;
    const watched = movie.episodesWatched ? Object.values(movie.episodesWatched).filter(Boolean).length : 0;
    if (total > 0) return Math.min(100, Math.round((watched / total) * 100));
  }
  return 0;
}

export type StatusIcon = 'watching' | 'watchlist' | 'completed';

export function getStatusIcon(movie: MigratableMovie): StatusIcon {
  if (isInProgress(movie)) return 'watching';
  if (isInWatchlist(movie)) return 'watchlist';
  if (isWatched(movie)) return 'completed';
  return 'watchlist';
}
