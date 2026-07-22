import { Plus, Trash2 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type AddToLibraryButtonProps = {
  isAdded: boolean;
  pending?: boolean;
  onAdd: () => void;
  onRemove: () => void;
};

// The header CTA on the unified movie screen (doc 03 `AddToLibraryButton`,
// doc 12 part 1 unify): adds as Watchlist by default when not owned. Once
// owned, editing happens inline on the same screen, so this becomes the
// "Remove from Library" action instead of navigating to a separate Edit page.
export function AddToLibraryButton({ isAdded, pending, onAdd, onRemove }: AddToLibraryButtonProps) {
  if (isAdded) {
    return (
      <Pressable
        onPress={onRemove}
        className="flex-row items-center justify-center gap-2 rounded-full border border-border px-6 py-3"
      >
        <Trash2 size={18} color="#ef4444" />
        <Text className="font-bold text-red-500">Remove from Library</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onAdd}
      disabled={pending}
      className="flex-row items-center justify-center gap-2 rounded-full bg-primary px-6 py-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      {pending ? <ActivityIndicator color="#fff" /> : <Plus size={18} color="#fff" />}
      <Text className="font-bold text-primary-foreground">Add to Library</Text>
    </Pressable>
  );
}
