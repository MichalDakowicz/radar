import { createMMKV } from 'react-native-mmkv';

import { parseSeasonEntry, type SeasonEntry } from './seasonCache';

// Device-local episode cache, kept out of `radar-prefs`: this is a data cache
// that can be wiped without losing anything the user typed, and it is read
// during render (the Episodes tab hydrates from it before react-query has said
// anything), so it has to be synchronous.
const storage = createMMKV({ id: 'radar-seasons' });

function seasonKey(tmdbId: number, season: number): string {
  return `season:${tmdbId}:${season}`;
}

export function readSeasonEntry(tmdbId: number | null, season: number | null): SeasonEntry | null {
  if (!tmdbId || season == null) return null;
  try {
    return parseSeasonEntry(storage.getString(seasonKey(tmdbId, season)));
  } catch {
    return null;
  }
}

export function writeSeasonEntry(tmdbId: number | null, season: number | null, entry: SeasonEntry): void {
  if (!tmdbId || season == null) return;
  try {
    storage.set(seasonKey(tmdbId, season), JSON.stringify(entry));
  } catch (error) {
    // A full or unavailable store is not worth failing the fetch over - the
    // episodes are already in hand, they just will not survive the next open.
    console.warn('Season cache write failed:', error);
  }
}
