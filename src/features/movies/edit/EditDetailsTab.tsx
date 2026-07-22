import { Check, RefreshCw, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { AvailabilityBadges } from '@/features/movies/detail/AvailabilityBadges';
import { SimilarRow } from '@/features/movies/detail/SimilarRow';
import { useSimilarMedia } from '@/hooks/useTmdb';
import type { NamedRef } from '@/types/movie';

import type { EditForm } from './editForm';

type EditDetailsTabProps = {
  form: EditForm;
  onChange: (patch: Partial<EditForm>) => void;
  onAddGenre: (name: string) => void;
  onRemoveGenre: (index: number) => void;
  onAddCast: (name: string) => void;
  onRemoveCast: (index: number) => void;
  onSmartFill: () => void;
  isSmartFilling: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Text>
      {children}
    </View>
  );
}

function ChipList({
  items,
  editable,
  onRemove,
}: {
  items: NamedRef[];
  editable: boolean;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0 && !editable) return <Text className="text-sm text-muted-foreground">None</Text>;
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item, i) => (
        <View key={item.id ?? `${item.name}-${i}`} className="flex-row items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5">
          <Text className="text-sm text-foreground">{item.name}</Text>
          {editable && (
            <Pressable onPress={() => onRemove(i)}>
              <X size={13} color="hsl(0 0% 63.9%)" />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

function AddChipRow({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };
  return (
    <View className="flex-row gap-2">
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor="hsl(0 0% 63.9%)"
        className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
      />
      <Pressable onPress={submit} className="items-center justify-center rounded-xl border border-border px-3">
        <Check size={18} color="hsl(0 0% 98%)" />
      </Pressable>
    </View>
  );
}

// Deep metadata (doc 03 Edit `EditDetailsTab`): type/release/runtime, cast &
// genres (manually editable only when TMDB didn't supply them), availability
// toggles across the full service list, overview.
export function EditDetailsTab({
  form,
  onChange,
  onAddGenre,
  onRemoveGenre,
  onAddCast,
  onRemoveCast,
  onSmartFill,
  isSmartFilling,
}: EditDetailsTabProps) {
  const editableTaxonomy = !form.tmdbId;
  const quickAdd = useQuickAdd();
  const { data: similar = [] } = useSimilarMedia(form.tmdbId, form.type);

  return (
    <View className="gap-6">
      <Field label="Title">
        <TextInput
          value={form.title}
          onChangeText={(title) => onChange({ title })}
          placeholder="Title"
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
        />
      </Field>

      <Pressable
        onPress={onSmartFill}
        disabled={isSmartFilling}
        className="flex-row items-center justify-center gap-2 rounded-lg border border-border py-2"
      >
        {isSmartFilling ? (
          <ActivityIndicator size="small" color="hsl(0 0% 63.9%)" />
        ) : (
          <RefreshCw size={14} color="hsl(0 0% 63.9%)" />
        )}
        <Text className="text-sm text-muted-foreground">Smart-fill from TMDB</Text>
      </Pressable>

      {/* Release date/runtime are TMDB facts, not user opinion - read-only here,
          Smart-fill above is the only thing that can change them. */}
      <View className="flex-row gap-4">
        <View className="flex-1">
          <Field label="Release date">
            <Text className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              {form.releaseDate || 'Unknown'}
            </Text>
          </Field>
        </View>
        <View className="flex-1">
          <Field label={form.type === 'tv' ? 'Runtime/ep (min)' : 'Runtime (min)'}>
            <Text className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              {form.runtime ? String(form.runtime) : 'N/A'}
            </Text>
          </Field>
        </View>
      </View>

      <Field label="Genres">
        <ChipList items={form.genres} editable={editableTaxonomy} onRemove={onRemoveGenre} />
        {editableTaxonomy && <AddChipRow placeholder="Add genre…" onAdd={onAddGenre} />}
      </Field>

      <Field label="Cast">
        <ChipList items={form.cast} editable={editableTaxonomy} onRemove={onRemoveCast} />
        {editableTaxonomy && <AddChipRow placeholder="Add actor…" onAdd={onAddCast} />}
      </Field>

      <Field label="Available on">
        {form.availability.length > 0 ? (
          <AvailabilityBadges availability={form.availability} />
        ) : (
          <Text className="text-sm text-muted-foreground">None</Text>
        )}
      </Field>

      {similar.length > 0 && (
        <View className="-mx-4">
          <SimilarRow
            title={form.type === 'tv' ? 'Similar shows' : 'Similar movies'}
            items={similar}
            findOwned={quickAdd.findByTmdbId}
          />
        </View>
      )}
    </View>
  );
}
