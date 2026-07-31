import { useRouter } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { AvailabilityBadges } from '@/features/movies/detail/AvailabilityBadges';
import { SimilarRow } from '@/features/movies/detail/SimilarRow';
import { useSimilarMedia } from '@/hooks/useTmdb';
import type { NamedRef } from '@/types/movie';

import type { EditForm } from './editForm';

type EditDetailsTabProps = {
  form: EditForm;
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

function ChipList({ items, linkTo }: { items: NamedRef[]; linkTo?: 'actor' | 'genre' }) {
  const router = useRouter();
  if (items.length === 0) return <Text className="text-sm text-muted-foreground">None</Text>;
  const open = (item: NamedRef) => {
    if (!linkTo || !item.id) return;
    const id = String(item.id);
    if (linkTo === 'actor') router.push({ pathname: '/actor/[id]', params: { id } });
    else router.push({ pathname: '/genre/[id]', params: { id } });
  };
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item, i) => (
        <Pressable
          key={item.id ?? `${item.name}-${i}`}
          disabled={!linkTo || !item.id}
          onPress={() => open(item)}
          className="rounded-full border border-border bg-secondary px-3 py-1.5"
        >
          <Text className="text-sm text-foreground">{item.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Deep metadata (doc 03 Edit `EditDetailsTab`): release/runtime, cast &
// genres, availability. All of it is TMDB catalogue fact rather than the
// user's own data, so the whole tab reads read-only - Smart-fill is the one
// control here, and it re-pulls from TMDB rather than letting anything be
// typed over by hand. Only rating and notes stay editable, in their own tab.
export function EditDetailsTab({ form, onSmartFill, isSmartFilling }: EditDetailsTabProps) {
  const quickAdd = useQuickAdd();
  const { data: similar = [] } = useSimilarMedia(form.tmdbId, form.type);

  return (
    <View className="gap-6">
      {/* No Title row - the hero above already states it, so repeating it here
          was only ever useful while it was an input. */}
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
        <ChipList items={form.genres} linkTo="genre" />
      </Field>

      <Field label="Cast">
        <ChipList items={form.cast} linkTo="actor" />
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
