import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GridSize } from '@/components/media/MediaGrid';
import { SORT_DEFAULT_DIR, type SortDir } from '@/lib/librarySort';
import { mmkvStorage } from '@/lib/mmkvStorage';

// Durable Library prefs (doc 05 "three tiers of state" - view mode, grid size,
// filters, sort, group-by are durable, not ephemeral). Search text and scroll
// stay as local/navigator state - never persisted here.
export type ViewMode = 'grid' | 'list';
export type { GridSize };
export type SortBy = 'title' | 'dateAdded' | 'releaseDate' | 'rating' | 'director' | 'runtime';
export type StatusFilter = 'all' | 'watchlist' | 'watching' | 'completed' | 'rewatch';
export type { SortDir };

type LibraryPrefsState = {
  viewMode: ViewMode;
  gridSize: GridSize;
  sortBy: SortBy;
  sortDir: SortDir;
  statusFilter: StatusFilter;
  selectedServices: string[];
  selectedGenres: string[];
  selectedDirectors: string[];
  selectedYears: string[];
  comingSoonCollapsed: boolean;
  setViewMode: (viewMode: ViewMode) => void;
  setGridSize: (gridSize: GridSize) => void;
  toggleComingSoonCollapsed: () => void;
  setSortBy: (sortBy: SortBy) => void;
  toggleSortDir: () => void;
  setStatusFilter: (statusFilter: StatusFilter) => void;
  toggleService: (service: string) => void;
  toggleGenre: (genre: string) => void;
  toggleDirector: (director: string) => void;
  toggleYear: (year: string) => void;
  resetFilters: () => void;
};

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const useLibraryPrefs = create<LibraryPrefsState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      gridSize: 'normal',
      sortBy: 'dateAdded',
      sortDir: SORT_DEFAULT_DIR.dateAdded,
      statusFilter: 'all',
      selectedServices: [],
      selectedGenres: [],
      selectedDirectors: [],
      selectedYears: [],
      comingSoonCollapsed: false,
      setViewMode: (viewMode) => set({ viewMode }),
      setGridSize: (gridSize) => set({ gridSize }),
      toggleComingSoonCollapsed: () => set((state) => ({ comingSoonCollapsed: !state.comingSoonCollapsed })),
      // Picking a sort resets direction to that sort's natural one (newest,
      // highest, soonest first) - the arrow then flips it from there.
      setSortBy: (sortBy) => set({ sortBy, sortDir: SORT_DEFAULT_DIR[sortBy] }),
      toggleSortDir: () => set((state) => ({ sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' })),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      toggleService: (service) => set((state) => ({ selectedServices: toggleIn(state.selectedServices, service) })),
      toggleGenre: (genre) => set((state) => ({ selectedGenres: toggleIn(state.selectedGenres, genre) })),
      toggleDirector: (director) => set((state) => ({ selectedDirectors: toggleIn(state.selectedDirectors, director) })),
      toggleYear: (year) => set((state) => ({ selectedYears: toggleIn(state.selectedYears, year) })),
      resetFilters: () =>
        set({ statusFilter: 'all', selectedServices: [], selectedGenres: [], selectedDirectors: [], selectedYears: [] }),
    }),
    {
      name: 'library-prefs',
      storage: createJSONStorage(() => mmkvStorage),
      version: 3,
      // Older installs stored a reorderMode, a groupBy and a 'custom' sort that
      // no longer exist, and no sortDir at all. 'custom' fell back to
      // newest-added, so date added descending leaves the library in the order
      // it was showing rather than silently reshuffling or inverting it.
      migrate: (persisted) => {
        // sortBy is widened, not intersected: an intersection with the current
        // Partial<LibraryPrefsState> would drop the retired 'custom' value.
        const stored = (persisted ?? {}) as Omit<Partial<LibraryPrefsState>, 'sortBy'> & {
          reorderMode?: boolean;
          groupBy?: string;
          sortBy?: SortBy | 'custom';
        };
        const { reorderMode: _reorderMode, groupBy: _groupBy, ...rest } = stored;
        const sortBy: SortBy = !rest.sortBy || rest.sortBy === 'custom' ? 'dateAdded' : rest.sortBy;
        const sortDir = rest.sortBy === sortBy && rest.sortDir ? rest.sortDir : SORT_DEFAULT_DIR[sortBy];
        return { ...rest, sortBy, sortDir };
      },
    },
  ),
);
