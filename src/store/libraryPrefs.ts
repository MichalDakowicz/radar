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
export type SortBy = 'custom' | 'title' | 'dateAdded' | 'releaseDate' | 'rating' | 'director' | 'runtime';
export type GroupBy = 'none' | 'director' | 'year' | 'genre' | 'availability' | 'status';
export type StatusFilter = 'all' | 'watchlist' | 'watching' | 'completed' | 'rewatch';
export type { SortDir };

type LibraryPrefsState = {
  viewMode: ViewMode;
  gridSize: GridSize;
  sortBy: SortBy;
  sortDir: SortDir;
  groupBy: GroupBy;
  statusFilter: StatusFilter;
  selectedServices: string[];
  comingSoonCollapsed: boolean;
  setViewMode: (viewMode: ViewMode) => void;
  setGridSize: (gridSize: GridSize) => void;
  toggleComingSoonCollapsed: () => void;
  setSortBy: (sortBy: SortBy) => void;
  toggleSortDir: () => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setStatusFilter: (statusFilter: StatusFilter) => void;
  toggleService: (service: string) => void;
  resetFilters: () => void;
};

export const useLibraryPrefs = create<LibraryPrefsState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      gridSize: 'normal',
      sortBy: 'custom',
      sortDir: SORT_DEFAULT_DIR.custom,
      groupBy: 'none',
      statusFilter: 'all',
      selectedServices: [],
      comingSoonCollapsed: false,
      setViewMode: (viewMode) => set({ viewMode }),
      setGridSize: (gridSize) => set({ gridSize }),
      toggleComingSoonCollapsed: () => set((state) => ({ comingSoonCollapsed: !state.comingSoonCollapsed })),
      // Picking a sort resets direction to that sort's natural one (newest,
      // highest, soonest first) - the arrow then flips it from there.
      setSortBy: (sortBy) => set({ sortBy, sortDir: SORT_DEFAULT_DIR[sortBy] }),
      toggleSortDir: () => set((state) => ({ sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' })),
      setGroupBy: (groupBy) => set({ groupBy }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      toggleService: (service) =>
        set((state) => ({
          selectedServices: state.selectedServices.includes(service)
            ? state.selectedServices.filter((s) => s !== service)
            : [...state.selectedServices, service],
        })),
      resetFilters: () => set({ statusFilter: 'all', selectedServices: [], groupBy: 'none' }),
    }),
    {
      name: 'library-prefs',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      // v0 had no sortDir (and a reorderMode that no longer exists). Seeding the
      // stored sort's natural direction keeps an upgrading library in the order
      // it was already showing instead of silently inverting it.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<LibraryPrefsState> & { reorderMode?: boolean };
        if (version >= 1) return state;
        const { reorderMode: _reorderMode, ...rest } = state;
        return { ...rest, sortDir: SORT_DEFAULT_DIR[rest.sortBy ?? 'custom'] };
      },
    },
  ),
);
