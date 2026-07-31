import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { Pressable } from 'react-native';
import type { SortDir } from '@/store/libraryPrefs';

const ACTIVE_COLOR = 'hsl(0 0% 98%)';
const IDLE_COLOR = 'hsl(0 0% 63.9%)';

type SortDirectionToggleProps = {
  dir: SortDir;
  onToggle: () => void;
};

// Sort direction toggle for the Library toolbar. Both arrows stay visible so
// the control reads as a direction pair; the live one is drawn bold and bright
// while the other dims. Deliberately no filled/"selected" background - the
// button is always on, it's the direction that changes.
export function SortDirectionToggle({ dir, onToggle }: SortDirectionToggleProps) {
  const ascending = dir === 'asc';

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={ascending ? 'Sorted ascending, switch to descending' : 'Sorted descending, switch to ascending'}
      className="items-center justify-center rounded px-2 py-1"
    >
      <ArrowUp
        size={12}
        strokeWidth={ascending ? 3 : 1.5}
        color={ascending ? ACTIVE_COLOR : IDLE_COLOR}
        style={{ marginBottom: -2 }}
      />
      <ArrowDown size={12} strokeWidth={ascending ? 1.5 : 3} color={ascending ? IDLE_COLOR : ACTIVE_COLOR} style={{ marginTop: -2 }} />
    </Pressable>
  );
}
