import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calculator, Check, Clapperboard, Plus, Quote, Search, Sparkles, X } from 'lucide-react-native';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPicker } from '@/components/media/StatusPicker';
import { BottomSheetModal, BottomSheetTextInput, Sheet, SheetScrollView } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { type CategoryRatings, EMPTY_CATEGORY_RATINGS, recalcOverall } from '@/features/movies/edit/editForm';
import { RatingSlider, RatingSliderPrecise, RatingValue } from '@/features/movies/edit/RatingSlider';
import { useMediaMetadata, useSearchMedia } from '@/hooks/useTmdb';
import { directorToDisplayString } from '@/lib/utils';
import type { MediaMetadata, MediaSummary } from '@/lib/tmdb';
import type { MediaType, Ratings } from '@/types/movie';

import { AddSearchResults } from './AddSearchResults';
import { DEFAULT_QUICK_ADD_STATUS, type QuickAddStatus, useQuickAdd } from './useQuickAdd';

const PRIMARY = 'hsl(217 91% 60%)';
const MUTED = 'hsl(0 0% 63.9%)';

type Mode = 'search' | 'manual';

// Section label matching the Movie Detail screen's small headers
// (`text-sm font-bold uppercase tracking-wide text-muted-foreground`).
function SectionLabel({ children }: { children: string }) {
  return <Text className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{children}</Text>;
}

function MetaChip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border bg-secondary px-3 py-1.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

// A compact DetailHero for the picked title so the single-add flow reads like a
// mini movie-detail page: blurred backdrop, overlapping poster, title/tagline/
// director/year, plus meta chips once TMDB metadata resolves.
function SelectedPreview({
  summary,
  metadata,
  isLoading,
}: {
  summary: MediaSummary;
  metadata?: MediaMetadata;
  isLoading: boolean;
}) {
  const coverUrl = metadata?.coverUrl ?? summary.coverUrl;
  const title = metadata?.title ?? summary.title;
  const tagline = metadata?.tagline;
  const releaseDate = metadata?.releaseDate ?? summary.releaseDate;
  const year = releaseDate ? releaseDate.slice(0, 4) : null;
  const director = directorToDisplayString(metadata?.director ?? summary.director);
  const type = metadata?.type ?? summary.type;

  return (
    <View className="gap-4">
      <View className="relative">
        <View className="h-40 w-full overflow-hidden rounded-2xl bg-neutral-900">
          {coverUrl && <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />}
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
        </View>

        <View className="absolute inset-x-0 bottom-0 -mb-6 flex-row items-end gap-3 px-3">
          <View className="aspect-[2/3] w-20 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800 shadow-2xl">
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Clapperboard size={24} color="#525252" />
              </View>
            )}
          </View>
          <View className="flex-1 gap-1 pb-1">
            <Text numberOfLines={2} className="text-lg font-bold leading-tight text-white">
              {title}
            </Text>
            {!!tagline && (
              <View className="flex-row items-center gap-1.5">
                <Quote size={11} color="#a3a3a3" />
                <Text numberOfLines={1} className="flex-1 text-xs italic text-neutral-400">
                  {tagline}
                </Text>
              </View>
            )}
            <View className="flex-row flex-wrap items-center gap-1.5">
              {!!director && <Text className="text-xs text-neutral-300">{director}</Text>}
              {!!director && !!year && <Text className="text-xs text-neutral-500">•</Text>}
              {!!year && <Text className="text-xs text-neutral-300">{year}</Text>}
            </View>
          </View>
        </View>
      </View>

      <View className="mt-6 flex-row flex-wrap gap-2">
        {isLoading ? (
          <ActivityIndicator size="small" color={MUTED} />
        ) : (
          <>
            <MetaChip label={type === 'tv' ? 'TV Show' : 'Movie'} />
            {!!metadata?.runtime && <MetaChip label={`${metadata.runtime}m`} />}
            {metadata?.genres?.slice(0, 2).map((g) => <MetaChip key={g.id ?? g.name} label={g.name} />)}
          </>
        )}
      </View>
    </View>
  );
}

const RATING_CATEGORIES: { key: keyof CategoryRatings; label: string }[] = [
  { key: 'story', label: 'Story' },
  { key: 'acting', label: 'Acting' },
  { key: 'ending', label: 'Ending' },
  { key: 'enjoyment', label: 'Enjoyment' },
];

// Full rating system, shown only when the picked status is "Watched" - the
// same controls as the Detail screen's "Your rating" (overall slider +
// Auto-calc) plus EditRatingsTab's category breakdown, so a rewatch can be
// fully rated at add-time (writes ratings.overall + story/acting/ending/enjoyment).
function RatingSection({
  overall,
  onOverall,
  categories,
  onCategories,
}: {
  overall: number;
  onOverall: (v: number) => void;
  categories: CategoryRatings;
  onCategories: (next: CategoryRatings) => void;
}) {
  const autoCalc = () => {
    const avg = recalcOverall(categories);
    if (avg != null) onOverall(avg);
  };

  return (
    <View className="gap-5 rounded-xl border border-green-500/30 bg-green-500/5 p-3">
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <SectionLabel>Your rating</SectionLabel>
          <View className="flex-row items-center gap-2">
            <RatingValue value={overall} />
            <Pressable onPress={autoCalc} className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1">
              <Calculator size={13} color={MUTED} />
              <Text className="text-xs font-medium text-muted-foreground">Auto-calc</Text>
            </Pressable>
          </View>
        </View>
        <RatingSliderPrecise value={overall} onChange={onOverall} />
      </View>

      <View className="gap-4">
        <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Category breakdown</Text>
        {RATING_CATEGORIES.map(({ key, label }) => (
          <View key={key} className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase text-muted-foreground">{label}</Text>
              <RatingValue value={categories[key]} />
            </View>
            <RatingSlider value={categories[key]} onChange={(v) => onCategories({ ...categories, [key]: v })} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Segmented movie/TV control matching the Detail screen's tab bar
// (`rounded-lg border border-border bg-secondary p-1`, active = `bg-card`).
function TypeToggle({ value, onChange }: { value: MediaType; onChange: (t: MediaType) => void }) {
  return (
    <View className="flex-row rounded-lg border border-border bg-secondary p-1">
      {(['movie', 'tv'] as MediaType[]).map((t) => (
        <Pressable key={t} onPress={() => onChange(t)} className={`flex-1 items-center rounded-md py-2 ${value === t ? 'bg-card' : ''}`}>
          <Text className={value === t ? 'text-sm font-bold text-foreground' : 'text-sm font-medium text-muted-foreground'}>
            {t === 'tv' ? 'TV Show' : 'Movie'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Quick Add: type a name -> pick -> set status -> done (doc 12 part 2). The
// bottom sheet reachable from the Library "+" button and Browse's quick-add;
// StatusPicker is shared with the Edit screen's basic tab.
export const QuickAddSheet = forwardRef<BottomSheetModal>(function QuickAddSheet(_props, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal);

  const { show } = useToast();
  const quickAdd = useQuickAdd();

  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<MediaSummary | null>(null);
  const [status, setStatus] = useState<QuickAddStatus>(DEFAULT_QUICK_ADD_STATUS);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<MediaType>('movie');
  const [overallRating, setOverallRating] = useState(0);
  const [categories, setCategories] = useState<CategoryRatings>(EMPTY_CATEGORY_RATINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading: isSearching } = useSearchMedia(!selected ? debouncedQuery : '');
  const { data: metadata, isLoading: isLoadingMetadata } = useMediaMetadata(selected?.tmdbId ?? null, selected?.type ?? 'movie');

  const reset = () => {
    setMode('search');
    setQuery('');
    setDebouncedQuery('');
    setSelected(null);
    setStatus(DEFAULT_QUICK_ADD_STATUS);
    setManualTitle('');
    setManualType('movie');
    setOverallRating(0);
    setCategories(EMPTY_CATEGORY_RATINGS);
  };

  // Search opens compact (index 0); picking a title or switching to manual
  // expands to full (index 1) so status + rating + Add show without scrolling.
  const pickTitle = (item: MediaSummary) => {
    setSelected(item);
    sheetRef.current?.snapToIndex(1);
  };
  const goManual = () => {
    setMode('manual');
    sheetRef.current?.snapToIndex(1);
  };
  const backToSearch = () => {
    setSelected(null);
    setMode('search');
    sheetRef.current?.snapToIndex(0);
  };

  const buildRatings = (): Ratings => (status.watched ? { ...categories, overall: overallRating } : {});

  const handleAdd = async () => {
    setSaving(true);
    try {
      if (mode === 'manual') {
        if (!manualTitle.trim()) return;
        await quickAdd.addManual(manualTitle.trim(), manualType, status, buildRatings());
        show(`Added "${manualTitle.trim()}"`);
      } else {
        if (!metadata) return;
        await quickAdd.addWithStatus(metadata, status, buildRatings());
        show(`Added "${metadata.title}"`);
      }
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const canAdd = mode === 'manual' ? manualTitle.trim().length > 0 : !!metadata && !isLoadingMetadata;
  const showFooter = mode === 'manual' || (mode === 'search' && !!selected);
  const isSearchStep = mode === 'search' && !selected;

  const addLabel = status.watched
    ? 'Add as Watched'
    : status.inProgress
      ? 'Add as In Progress'
      : status.inWatchlist
        ? 'Add to Watchlist'
        : 'Add to Library';

  return (
    // maxWidth: wider than the default desktop dialog, since this sheet holds a
    // list of search results with posters and cramps at 560px.
    <Sheet ref={sheetRef} snapPoints={['60%', '95%']} onDismiss={reset} maxWidth={680}>
      <View className="flex-1 pb-2">
        {/* Header — back arrow (when past the search step) / icon badge, in line
            with the title, never overlaid on the backdrop. */}
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
          {selected || mode === 'manual' ? (
            <Pressable
              onPress={backToSearch}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-xl bg-secondary"
            >
              <ArrowLeft size={20} color="hsl(0 0% 98%)" />
            </Pressable>
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Plus size={20} color={PRIMARY} />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">Add to library</Text>
            <Text className="text-xs text-muted-foreground">
              {mode === 'manual' ? 'Add a title by hand' : selected ? 'Set a status, then add' : 'Search a movie or show'}
            </Text>
          </View>
        </View>

        {isSearchStep && (
          <View className="flex-1 gap-3">
            <View className="mx-4 flex-row items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2.5">
              <Search size={18} color={MUTED} />
              <BottomSheetTextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search a title…"
                placeholderTextColor={MUTED}
                returnKeyType="search"
                className="flex-1 text-foreground"
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={MUTED} />
              ) : query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8} className="rounded-full bg-muted/40 p-1">
                  <X size={14} color={MUTED} />
                </Pressable>
              ) : null}
            </View>

            <View className="flex-1">
              {debouncedQuery.length === 0 ? (
                <View className="flex-1 items-center justify-center gap-3 px-8">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    <Search size={26} color={MUTED} />
                  </View>
                  <Text className="text-center text-sm text-muted-foreground">
                    Search TMDB for a movie or show to add to your library.
                  </Text>
                </View>
              ) : results.length === 0 && !isSearching ? (
                <View className="flex-1 items-center justify-center gap-4 px-8">
                  <Text className="text-center text-sm text-muted-foreground">No matches for “{debouncedQuery}”.</Text>
                  <Pressable
                    onPress={goManual}
                    className="flex-row items-center gap-2 rounded-full border border-border px-4 py-2.5"
                  >
                    <Sparkles size={16} color={PRIMARY} />
                    <Text className="text-sm font-medium text-primary">Add it manually</Text>
                  </Pressable>
                </View>
              ) : (
                <AddSearchResults results={results} onSelect={pickTitle} />
              )}
            </View>

            <Pressable onPress={goManual} className="mx-4 flex-row items-center justify-center gap-2 py-1">
              <Sparkles size={14} color={PRIMARY} />
              <Text className="text-sm text-primary">Can&apos;t find it? Add manually</Text>
            </Pressable>
          </View>
        )}

        {mode === 'search' && selected && (
          <SheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 20 }}>
            <SelectedPreview summary={selected} metadata={metadata ?? undefined} isLoading={isLoadingMetadata} />
            <View className="gap-3">
              <SectionLabel>Watch status</SectionLabel>
              <StatusPicker value={status} onChange={setStatus} datedPasses={status.watched ? 1 : 0} />
            </View>
            {status.watched && (
              <RatingSection overall={overallRating} onOverall={setOverallRating} categories={categories} onCategories={setCategories} />
            )}
          </SheetScrollView>
        )}

        {mode === 'manual' && (
          <SheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 20 }}>
            <View className="gap-2">
              <SectionLabel>Title</SectionLabel>
              <BottomSheetTextInput
                autoFocus
                value={manualTitle}
                onChangeText={setManualTitle}
                placeholder="e.g. The Matrix"
                placeholderTextColor={MUTED}
                className="rounded-xl border border-border bg-secondary px-4 py-3 text-foreground"
              />
            </View>

            <View className="gap-2">
              <SectionLabel>Type</SectionLabel>
              <TypeToggle value={manualType} onChange={setManualType} />
            </View>

            <View className="gap-3">
              <SectionLabel>Watch status</SectionLabel>
              <StatusPicker value={status} onChange={setStatus} datedPasses={status.watched ? 1 : 0} />
            </View>

            {status.watched && (
              <RatingSection overall={overallRating} onOverall={setOverallRating} categories={categories} onCategories={setCategories} />
            )}
          </SheetScrollView>
        )}

        {showFooter && (
          <View className="border-t border-border px-4 pb-2 pt-3">
            <Pressable
              onPress={handleAdd}
              disabled={!canAdd || saving}
              className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3.5"
              style={{ opacity: !canAdd || saving ? 0.5 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  {status.watched ? <Check size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
                  <Text className="font-bold text-primary-foreground">{addLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Sheet>
  );
});
