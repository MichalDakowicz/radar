import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GridSize } from '@/components/media/MediaGrid';
import { mmkvStorage } from '@/lib/mmkvStorage';

// Durable Library prefs (doc 05 "three tiers of state" - view mode, grid size,
// filters, sort, group-by are durable, not ephemeral). Search text and scroll
// stay as local/navigator state - never persisted here.
export type ViewMode = 'grid' | 'list';
export type { GridSize };
export type SortBy = 'custom' | 'title' | 'dateAdded' | 'releaseDate' | 'rating' | 'director' | 'runtime';
export type GroupBy = 'none' | 'director' | 'year' | 'genre' | 'availability' | 'status';
export type StatusFilter = 'all' | 'watchlist' | 'watching' | 'completed' | 'rewatch';

type LibraryPrefsState = {
  viewMode: ViewMode;
  gridSize: GridSize;
  sortBy: SortBy;
  groupBy: GroupBy;
  statusFilter: StatusFilter;
  selectedServices: string[];
  comingSoonCollapsed: boolean;
  reorderMode: boolean;
  setViewMode: (viewMode: ViewMode) => void;
  setGridSize: (gridSize: GridSize) => void;
  toggleComingSoonCollapsed: () => void;
  toggleReorderMode: () => void;
  setSortBy: (sortBy: SortBy) => void;
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
      groupBy: 'none',
      statusFilter: 'all',
      selectedServices: [],
      comingSoonCollapsed: false,
      // Drag-to-reorder is opt-in: while on, the whole list is a
      // DraggableFlatList whose long-press pan wrapper swallows the header
      // carousels' horizontal swipe. Default off so Continue watching / Coming
      // soon scroll; user flips it on only to rearrange (custom sort).
      reorderMode: false,
      setViewMode: (viewMode) => set({ viewMode }),
      setGridSize: (gridSize) => set({ gridSize }),
      toggleComingSoonCollapsed: () => set((state) => ({ comingSoonCollapsed: !state.comingSoonCollapsed })),
      toggleReorderMode: () => set((state) => ({ reorderMode: !state.reorderMode })),
      setSortBy: (sortBy) => set({ sortBy }),
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
    { name: 'library-prefs', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
