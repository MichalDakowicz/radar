import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EditEpisodesTab } from '@/features/movies/edit/EditEpisodesTab';
import { EditRatingsTab } from '@/features/movies/edit/EditRatingsTab';
import { MAX_W, useCenteredContentStyle, useIsDesktop } from '@/hooks/useResponsive';
import type { MediaType } from '@/types/movie';

import { AddToLibraryButton } from './AddToLibraryButton';
import { DetailAvailability, DetailCast, DetailGenres, DetailProduction, DetailStats } from './DetailFacts';
import { DetailHero } from './DetailHero';
import { DetailTabs, type DetailTab } from './DetailTabs';
import { OverviewSection } from './OverviewSection';
import { OwnedControls, SmartFillButton } from './OwnedControls';
import { SimilarRow } from './SimilarRow';
import { useMovieDetail } from './useMovieDetail';

type MovieDetailScreenProps = {
  tmdbId: number | null;
  type: MediaType;
  movieId?: string;
};

// Unified movie/show screen (doc 03 Movie Detail + Edit, doc 12 part 1 unify)
// - one screen backs both /movie/[tmdbId]/[type] (not-yet-owned) and
// /edit/[movieId] (owned). Both render the same catalogue sections in the same
// order; ownership only adds the user's own controls (status, rating, notes,
// episodes) and swaps the header CTA. Removing a title leaves the user right
// here, in the not-yet-owned state, so it can be added straight back.
export function MovieDetailScreen({ tmdbId, type, movieId }: MovieDetailScreenProps) {
  const isDesktop = useIsDesktop();
  const contentStyle = useCenteredContentStyle(MAX_W.detail);
  const detail = useMovieDetail({ tmdbId, type, movieId });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<DetailTab>('details');

  const { display, editForm, form, owned } = detail;
  const tabs: { key: DetailTab; label: string }[] = [
    ...(form?.type === 'tv' ? [{ key: 'episodes' as DetailTab, label: 'Episodes' }] : []),
    { key: 'details', label: 'Details' },
    { key: 'ratings', label: 'Ratings' },
  ];

  if (detail.isLoading || detail.isFormLoading) return <LoadingState label="Loading…" />;
  if (detail.isError) return <ErrorState message="Couldn't load this title" onRetry={detail.refetch} />;

  const confirmRemove = async () => {
    setConfirmDelete(false);
    await detail.removeFromLibrary();
  };

  const stats = (
    <DetailStats
      releaseDate={display.releaseDate}
      runtime={display.runtime}
      budget={display.budget}
      voteAverage={display.voteAverage}
      stacked={isDesktop}
    />
  );
  const taxonomy = (
    <>
      <DetailGenres genres={display.genres} />
      <DetailAvailability availability={display.availability} />
    </>
  );
  const ownControls = owned && form && (
    <OwnedControls
      form={form}
      onChange={editForm.update}
      onAutoCalc={form.type === 'tv' ? editForm.recalcAllSeasonsAverage : editForm.recalcMovieOverall}
    />
  );
  const people = (
    <>
      <DetailCast cast={display.cast} />
      <DetailProduction companies={display.productionCompanies} />
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="pb-24"
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHero
          title={display.title}
          tagline={display.tagline}
          coverUrl={display.coverUrl}
          releaseDate={display.releaseDate}
          director={display.director}
          action={
            <AddToLibraryButton
              isAdded={!!owned}
              pending={detail.pending}
              onAdd={detail.addToLibrary}
              onRemove={() => setConfirmDelete(true)}
            />
          }
        />

        {isDesktop && !owned ? (
          // Wide viewports read a 900px-long single column badly: the primary
          // text keeps a comfortable measure on the left while the facts
          // (release/runtime/budget/score, genres, availability) stack in a rail.
          <View className="flex-row gap-8 px-6 pt-8">
            <View className="min-w-0 flex-1 gap-6">
              <OverviewSection overview={display.overview} />
              {people}
            </View>
            <View className="gap-5" style={{ width: 320 }}>
              {stats}
              {taxonomy}
            </View>
          </View>
        ) : (
          <View className="gap-6 px-4 pt-6">
            {stats}
            <OverviewSection overview={display.overview} />
            {ownControls}
            {/* Owned titles file these under the Details tab below instead. */}
            {!owned && people}
            {!owned && taxonomy}
          </View>
        )}

        {owned && form && (
          <>
            <DetailTabs tabs={tabs} value={tab} onChange={setTab} />
            <View className="gap-6 px-4">
              {tab === 'details' && (
                <>
                  {people}
                  {taxonomy}
                  <SmartFillButton onPress={editForm.handleSmartFill} busy={editForm.isSmartFilling} />
                </>
              )}
              {tab === 'ratings' && (
                <EditRatingsTab
                  form={form}
                  onChange={editForm.update}
                  onRecalcSeasonOverall={editForm.recalcSeasonOverall}
                  onChangeSeasonRating={editForm.setSeasonRating}
                />
              )}
              {tab === 'episodes' && form.type === 'tv' && (
                <EditEpisodesTab
                  tmdbId={form.tmdbId}
                  numberOfSeasons={form.numberOfSeasons}
                  episodeWatchDates={form.episodeWatchDates}
                  episodesWatched={form.episodesWatched}
                  onToggleEpisode={editForm.toggleEpisodeWatched}
                  onBumpEpisode={editForm.bumpEpisodeWatch}
                  onMarkSeasonComplete={editForm.markSeasonComplete}
                  onRewatchSeason={editForm.rewatchSeason}
                />
              )}
            </View>
          </>
        )}

        <View className="mt-6">
          <SimilarRow
            title={detail.mediaType === 'tv' ? 'Similar shows' : 'Similar movies'}
            items={detail.similar}
            findOwned={detail.findOwned}
          />
        </View>
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
            description={`Are you sure you want to remove "${display.title}"? Your rating and notes will be lost.`}
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
