import { Building2, Calculator, Calendar, Clock, Save, Users, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { StatusPicker } from '@/components/media/StatusPicker';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { EditDetailsTab } from '@/features/movies/edit/EditDetailsTab';
import { EditEpisodesTab } from '@/features/movies/edit/EditEpisodesTab';
import { EditRatingsTab } from '@/features/movies/edit/EditRatingsTab';
import { RatingSliderPrecise, RatingValue } from '@/features/movies/edit/RatingSlider';
import { useEditMovieForm } from '@/features/movies/edit/useEditMovieForm';
import { useMovies } from '@/hooks/useMovies';
import { useMediaMetadata, useSimilarMedia } from '@/hooks/useTmdb';
import type { MediaType } from '@/types/movie';

import { AddToLibraryButton } from './AddToLibraryButton';
import { AvailabilityBadges } from './AvailabilityBadges';
import { CastRow } from './CastRow';
import { DetailHero } from './DetailHero';
import { OverviewSection } from './OverviewSection';
import { SimilarRow } from './SimilarRow';

type MovieDetailScreenProps = {
  tmdbId: number | null;
  type: MediaType;
  movieId?: string;
};

type Tab = 'details' | 'ratings' | 'episodes';

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-1 gap-1 rounded-xl border border-border bg-secondary p-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="font-medium text-foreground">{value}</Text>
      </View>
    </View>
  );
}

// Unified movie/show screen (doc 03 Movie Detail + Edit, doc 12 part 1 unify)
// - one screen backs both /movie/[tmdbId]/[type] (not-yet-owned) and
// /edit/[movieId] (owned). Not owned: TMDB metadata + stats/cast/production +
// an "Add to Library" CTA. Once owned - whether it already was, or Add just
// flipped it - the same screen instantly shows watch-status + rating
// controls in the main section (no navigation/tab switch needed), and the
// header CTA becomes "Remove from Library" instead of jumping to a separate
// Edit page.
export function MovieDetailScreen({ tmdbId, type, movieId }: MovieDetailScreenProps) {
  const { show } = useToast();
  const { movies } = useMovies();
  const quickAdd = useQuickAdd();

  const owned = movieId ? (movies.find((m) => m.id === movieId) ?? null) : quickAdd.findByTmdbId(tmdbId);
  const pending = tmdbId != null && quickAdd.pendingTmdbId === tmdbId;

  const { data: metadata, isLoading, isError, refetch } = useMediaMetadata(owned ? null : tmdbId, type);
  const { data: similar = [] } = useSimilarMedia(owned ? owned.tmdbId : tmdbId, type);

  const editForm = useEditMovieForm(owned ?? undefined);
  const [tab, setTab] = useState<Tab>('details');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!owned && isLoading) return <LoadingState label="Loading…" />;
  if (!owned && (isError || !metadata)) return <ErrorState message="Couldn't load this title" onRetry={refetch} />;
  if (owned && !editForm.form) return <LoadingState label="Loading…" />;

  const form = editForm.form;
  const display = owned && form ? { ...form, budget: owned.budget, tagline: owned.tagline, productionCompanies: owned.productionCompanies } : metadata!;

  const handleAdd = async () => {
    if (!metadata) return;
    await quickAdd.add(metadata.tmdbId, metadata.type);
    show(`Added "${metadata.title}" to Watchlist`);
  };

  const confirmRemove = async () => {
    await editForm.remove();
    setConfirmDelete(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    ...(form?.type === 'tv' ? [{ key: 'episodes' as Tab, label: 'Episodes' }] : []),
    { key: 'details', label: 'Details' },
    { key: 'ratings', label: 'Ratings' },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-24" keyboardShouldPersistTaps="handled">
      <DetailHero
        title={display.title}
        tagline={display.tagline}
        coverUrl={display.coverUrl}
        releaseDate={display.releaseDate}
        director={display.director}
        action={<AddToLibraryButton isAdded={!!owned} pending={pending} onAdd={handleAdd} onRemove={() => setConfirmDelete(true)} />}
      />

      <View className="gap-6 px-4 pt-6">
        {!owned && (
          <View className="flex-row gap-3">
            <Stat icon={<Calendar size={16} color="#3b82f6" />} label="Release" value={display.releaseDate || 'Unknown'} />
            <Stat
              icon={<Clock size={16} color="#a855f7" />}
              label="Runtime"
              value={display.runtime ? `${display.runtime}m` : 'N/A'}
            />
            {display.budget > 0 && (
              <Stat icon={<Wallet size={16} color="#10b981" />} label="Budget" value={`$${(display.budget / 1_000_000).toFixed(1)}M`} />
            )}
          </View>
        )}

        <OverviewSection
          overview={display.overview}
          editable={!!owned && !form?.tmdbId}
          onChange={(overview) => editForm.update({ overview })}
        />

        {owned && form && (
          <View className="gap-3">
            <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Watch status</Text>
            <StatusPicker value={form.status} onChange={(status) => editForm.update({ status })} />
            {form.status.inProgress && (
              <View className="gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <Text className="text-xs font-semibold uppercase text-amber-500">Last watched position</Text>
                <TextInput
                  value={form.lastWatchedPosition}
                  onChangeText={(lastWatchedPosition) => editForm.update({ lastWatchedPosition })}
                  placeholder={form.type === 'tv' ? 'e.g. S02E05 at 23:15' : 'e.g. 45:30'}
                  placeholderTextColor="hsl(0 0% 63.9%)"
                  className="rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm text-foreground"
                />
              </View>
            )}
          </View>
        )}

        {owned && form && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Your rating</Text>
              <View className="flex-row items-center gap-2">
                <RatingValue value={form.overallRating} />
                <Pressable
                  onPress={form.type === 'tv' ? editForm.recalcAllSeasonsAverage : editForm.recalcMovieOverall}
                  className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1"
                >
                  <Calculator size={13} color="hsl(0 0% 63.9%)" />
                  <Text className="text-xs font-medium text-muted-foreground">{form.type === 'tv' ? 'Avg seasons' : 'Auto-calc'}</Text>
                </Pressable>
              </View>
            </View>
            <RatingSliderPrecise value={form.overallRating} onChange={(overallRating) => editForm.update({ overallRating })} />
          </View>
        )}

        {!owned && metadata!.cast.length > 0 && (
          <View className="gap-2">
            <View className="flex-row items-center gap-2 px-0">
              <Users size={18} color="#ec4899" />
              <Text className="text-lg font-bold text-foreground">Cast</Text>
            </View>
            <CastRow cast={metadata!.cast} />
          </View>
        )}

        {!owned && metadata!.productionCompanies.length > 0 && (
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Building2 size={18} color="#06b6d4" />
              <Text className="text-lg font-bold text-foreground">Production</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {metadata!.productionCompanies.map((c) => (
                <View key={c.name} className="rounded-full border border-border bg-secondary px-3 py-1.5">
                  <Text className="text-sm text-muted-foreground">{c.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!owned && metadata!.genres.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-bold uppercase text-muted-foreground">Genres</Text>
            <View className="flex-row flex-wrap gap-2">
              {metadata!.genres.map((g) => (
                <View key={g.id ?? g.name} className="rounded-full border border-border bg-secondary px-3 py-1.5">
                  <Text className="text-sm text-foreground">{g.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!owned && metadata!.availability.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-bold uppercase text-muted-foreground">Available on</Text>
            <AvailabilityBadges availability={metadata!.availability} />
          </View>
        )}
      </View>

      {owned && form && (
        <>
          <View className="mt-2 flex-row rounded-lg border border-border bg-secondary p-1 mx-4 mb-3">
            {tabs.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                className={`flex-1 items-center rounded-md py-2 ${tab === t.key ? 'bg-card' : ''}`}
              >
                <Text
                  numberOfLines={1}
                  className={tab === t.key ? 'text-xs font-bold uppercase text-foreground' : 'text-xs font-bold uppercase text-muted-foreground'}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-6 px-4">
            {tab === 'episodes' && form.type === 'tv' && (
              <EditEpisodesTab
                tmdbId={form.tmdbId}
                numberOfSeasons={form.numberOfSeasons}
                episodesWatched={form.episodesWatched}
                onToggleEpisode={editForm.toggleEpisodeWatched}
                onMarkSeasonComplete={editForm.markSeasonComplete}
              />
            )}
            {tab === 'details' && (
              <EditDetailsTab
                form={form}
                onChange={editForm.update}
                onAddGenre={editForm.addGenre}
                onRemoveGenre={editForm.removeGenre}
                onAddCast={editForm.addCast}
                onRemoveCast={editForm.removeCast}
                onSmartFill={editForm.handleSmartFill}
                isSmartFilling={editForm.isSmartFilling}
              />
            )}
            {tab === 'ratings' && (
              <EditRatingsTab
                form={form}
                onChange={editForm.update}
                onRecalcSeasonOverall={editForm.recalcSeasonOverall}
                onChangeSeasonRating={editForm.setSeasonRating}
              />
            )}
          </View>
        </>
      )}

      {!owned && (
        <View className="mt-6">
          <SimilarRow title={type === 'tv' ? 'Similar shows' : 'Similar movies'} items={similar} findOwned={quickAdd.findByTmdbId} />
        </View>
      )}
      </ScrollView>

      {owned && form && (
        <>
          <Pressable
            onPress={editForm.save}
            disabled={editForm.isSaving}
            className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-primary shadow-xl"
            style={{ opacity: editForm.isSaving ? 0.6 : 1 }}
          >
            {editForm.isSaving ? <ActivityIndicator color="#fff" /> : <Save size={26} color="#fff" />}
          </Pressable>

          <ConfirmDialog
            visible={confirmDelete}
            title="Remove from library"
            description={`Are you sure you want to remove "${form.title}"? This action cannot be undone.`}
            confirmLabel="Remove"
            destructive
            loading={editForm.isSaving}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={confirmRemove}
          />
        </>
      )}
    </View>
  );
}
