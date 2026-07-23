import { ArrowUpDown, LayoutGrid, Layers, List, Search, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useLibraryPrefs } from '@/store/libraryPrefs';

type LibraryToolbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  onOpenGroup: () => void;
};

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <View className="h-10 flex-row items-center gap-0.5 rounded-lg border border-border bg-secondary p-1">{children}</View>;
}

// Single-row toolbar (matches the requested html): search input flex-1, then
// the Filters / Group / Grid-List pill-groups on the right. Random pick moved
// to the global Header. Icon-only pill buttons so the row fits phone widths.
export function LibraryToolbar({ searchQuery, onSearchChange, onOpenFilters, onOpenGroup }: LibraryToolbarProps) {
  const { viewMode, groupBy, statusFilter, selectedServices, sortBy, reorderMode, setViewMode, toggleReorderMode } = useLibraryPrefs();

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (selectedServices.length > 0 ? 1 : 0);

  // Reorder needs custom sort + an unfiltered, unsearched, ungrouped list (the
  // same gate as useLibraryFilters.isReorderEnabled) - otherwise the on-screen
  // order isn't the stored custom order and a drag would be meaningless.
  const canReorder =
    sortBy === 'custom' && groupBy === 'none' && statusFilter === 'all' && selectedServices.length === 0 && !searchQuery.trim();

  return (
    <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
      <View className="relative min-w-0 flex-1">
        <View className="absolute bottom-0 left-3 top-0 z-10 justify-center">
          <Search size={18} color="hsl(0 0% 63.9%)" />
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search library…"
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-4 text-sm text-foreground"
        />
      </View>

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
          <Pressable onPress={onOpenGroup} className="rounded px-2 py-1">
            <Layers size={16} color={groupBy !== 'none' ? 'hsl(0 0% 98%)' : 'hsl(0 0% 63.9%)'} />
          </Pressable>
        </ToolbarGroup>

        <ToolbarGroup>
          <Pressable
            onPress={toggleReorderMode}
            disabled={!canReorder}
            className="rounded px-2 py-1"
            style={{ backgroundColor: reorderMode && canReorder ? 'hsl(0 0% 20%)' : 'transparent', opacity: canReorder ? 1 : 0.35 }}
          >
            <ArrowUpDown size={16} color={reorderMode && canReorder ? 'hsl(217 91% 60%)' : 'hsl(0 0% 63.9%)'} />
          </Pressable>
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
