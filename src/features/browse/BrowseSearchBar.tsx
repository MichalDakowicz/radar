import { Search, SlidersHorizontal } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useIsDesktop } from '@/hooks/useResponsive';
import { useSearchFocusRegistration } from '@/hooks/useSearchFocusRegistration';

type BrowseSearchBarProps = {
  value: string;
  onChange: (text: string) => void;
  loading: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
};

// Universal search input + result-type filter trigger (doc 03 `BrowseSearchBar`).
export function BrowseSearchBar({ value, onChange, loading, activeFilterCount, onOpenFilters }: BrowseSearchBarProps) {
  const isDesktop = useIsDesktop();
  const searchRef = useSearchFocusRegistration();

  return (
    <View className={isDesktop ? 'flex-row items-center gap-2 px-8 pb-4 pt-4' : 'flex-row items-center gap-2 px-4 pb-3 pt-2'}>
      <View
        className="flex-1 flex-row items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2.5"
        style={isDesktop ? { maxWidth: 520 } : undefined}
      >
        <Search size={16} color="hsl(0 0% 63.9%)" />
        <TextInput
          ref={searchRef}
          value={value}
          onChangeText={onChange}
          placeholder={isDesktop ? 'Movies, TV, people, genres…    /' : 'Movies, TV, people, genres…'}
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="flex-1 text-foreground"
        />
        {loading && <ActivityIndicator size="small" color="hsl(0 0% 63.9%)" />}
      </View>
      <Pressable onPress={onOpenFilters} className="relative rounded-full border border-border p-2.5 active:opacity-70">
        <SlidersHorizontal size={18} color={activeFilterCount > 0 ? 'hsl(217 91% 60%)' : 'hsl(0 0% 98%)'} />
        {activeFilterCount > 0 && (
          <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-primary">
            <Text className="text-[10px] font-bold text-primary-foreground">{activeFilterCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
