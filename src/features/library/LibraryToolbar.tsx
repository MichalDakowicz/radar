import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { SortDirectionToggle } from '@/features/library/SortDirectionToggle';
import { useIsDesktop } from '@/hooks/useResponsive';
import { useLibraryPrefs } from '@/store/libraryPrefs';
import { useSearchFocusRegistration } from '@/hooks/useSearchFocusRegistration';

type LibraryToolbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
};

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <View className="h-10 flex-row items-center gap-0.5 rounded-lg border border-border bg-secondary p-1">{children}</View>;
}

// Single-row toolbar (matches the requested html): search input flex-1, then
// the Filters / Group / Grid-List pill-groups on the right. Random pick moved
// to the global Header. Icon-only pill buttons so the row fits phone widths.
export function LibraryToolbar({ searchQuery, onSearchChange, onOpenFilters }: LibraryToolbarProps) {
  const { statusFilter, selectedServices, selectedGenres, selectedDirectors, selectedYears, viewMode, sortDir, setViewMode, toggleSortDir } =
    useLibraryPrefs();
  const isDesktop = useIsDesktop();
  const searchRef = useSearchFocusRegistration();

  // One per narrowed dimension, not per chip - the badge says how many kinds of
  // filter are on, which is what the user has to undo.
  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (selectedServices.length > 0 ? 1 : 0) +
    (selectedGenres.length > 0 ? 1 : 0) +
    (selectedDirectors.length > 0 ? 1 : 0) +
    (selectedYears.length > 0 ? 1 : 0);

  return (
    <View className={isDesktop ? 'flex-row items-center gap-2 px-8 pb-4 pt-4' : 'flex-row items-center gap-2 px-4 pb-3 pt-2'}>
      <View className="relative min-w-0 flex-1" style={isDesktop ? { maxWidth: 420 } : undefined}>
        <View className="absolute bottom-0 left-3 top-0 z-10 justify-center">
          <Search size={18} color="hsl(0 0% 63.9%)" />
        </View>
        <TextInput
          ref={searchRef}
          value={searchQuery}
          onChangeText={onSearchChange}
          // The hint is the discoverability for the global "/" shortcut.
          placeholder={isDesktop ? 'Search library…    /' : 'Search library…'}
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground"
        />
      </View>

      {/* Search is capped on desktop, so the control groups need a spacer to
          stay pinned to the right edge of the content column. */}
      {isDesktop && <View className="flex-1" />}

      <View className="shrink-0 flex-row items-center gap-2">
        <ToolbarGroup>
          <Pressable onPress={onOpenFilters} className="flex-row items-center gap-1.5 rounded px-2 py-1">
            <SlidersHorizontal size={16} color={activeFilterCount > 0 ? 'hsl(217 91% 60%)' : 'hsl(0 0% 63.9%)'} />
            {activeFilterCount > 0 && (
              <View className="h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Text className="text-[10px] font-bold text-primary-foreground">{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </ToolbarGroup>

        <ToolbarGroup>
          <SortDirectionToggle dir={sortDir} onToggle={toggleSortDir} />
        </ToolbarGroup>

        <ToolbarGroup>
          <Pressable onPress={() => setViewMode('grid')} className="rounded p-1.5" style={{ backgroundColor: viewMode === 'grid' ? 'hsl(0 0% 20%)' : 'transparent' }}>
            <LayoutGrid size={18} color={viewMode === 'grid' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 63.9%)'} />
          </Pressable>
          <Pressable onPress={() => setViewMode('list')} className="rounded p-1.5" style={{ backgroundColor: viewMode === 'list' ? 'hsl(0 0% 20%)' : 'transparent' }}>
            <List size={18} color={viewMode === 'list' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 63.9%)'} />
          </Pressable>
        </ToolbarGroup>
      </View>
    </View>
  );
}
