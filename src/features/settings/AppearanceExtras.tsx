import { LayoutGrid } from 'lucide-react-native';

import { type GridSize, useLibraryPrefs } from '@/store/libraryPrefs';

import { Segmented } from './Segmented';
import { SettingLabel } from './SettingsSection';

const CARD_SIZES: { value: GridSize; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
];

// Card size stays a device-local pref (zustand + MMKV) - it's a view preference,
// not account data, so it never rode into user_settings (unlike theme).
export function CardSizeControl() {
  const gridSize = useLibraryPrefs((s) => s.gridSize);
  const setGridSize = useLibraryPrefs((s) => s.setGridSize);
  return (
    <>
      <SettingLabel title="Card size" description="Poster size in your library grid" />
      <Segmented
        options={CARD_SIZES.map((s) => ({ ...s, icon: <LayoutGrid size={18} color="hsl(0 0% 63.9%)" /> }))}
        value={gridSize}
        onChange={setGridSize}
      />
    </>
  );
}
