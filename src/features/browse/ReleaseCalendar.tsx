import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronLeft, ChevronRight, Clapperboard, Plus } from 'lucide-react-native';
import { forwardRef, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MovieCard } from '@/components/media/MovieCard';
import { BottomSheetModal, Sheet, SheetScrollView } from '@/components/ui/Sheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMeasuredWidth } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import { countryName } from '@/lib/countries';
import { cn } from '@/lib/utils';
import * as tmdb from '@/lib/tmdb';
import type { Movie } from '@/types/movie';

import { toDiscoveryMovie } from './toDiscoveryMovie';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PRIMARY = 'hsl(217 91% 60%)';
const GRID_GAP = 4; // gap-1
const GRID_PAD = 12; // px-3
// A day cell is a poster thumbnail, not a feature card: without a cap, dividing
// a desktop-width column by 7 gives ~250x375px cells and the month stops fitting
// on screen. Past this the grid stays this size and centres instead of growing.
const MAX_CELL_W = 92;
// Same reasoning for the anticipated rail - narrower cards mean more of the
// ranking is visible per screenful.
const RAIL_CARD_W = 104;

type ReleaseCalendarProps = {
  onPress: (movie: Movie) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

type DayEntry = { movie: Movie; popularity: number; day: number };
type SheetDay = { day: number; monthName: string; year: number; entries: DayEntry[] };

// Month-grid release calendar (Browse "Calendar" tab). Buckets TMDB releases by
// day into a Sunday-first grid, region-scoped to the user's watch-provider
// country. Days with one release open it directly; days with several open a
// sheet listing them all. A "most anticipated" rail ranks the month below.
export function ReleaseCalendar({ onPress, onAdd, onRemove, isAdded }: ReleaseCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const { year, month } = cursor;
  const region = useUserSettings().settings.watchProviderCountry;

  // Explicit cell size, not flex-1: flex growth wasn't equalizing widths across
  // poster/empty cells, leaving the grid crooked. Fixed width = uniform grid.
  // Measured (not window) width: the calendar sits inside a capped content
  // column on desktop.
  const { width, onLayout } = useMeasuredWidth();
  const cellW = Math.min(MAX_CELL_W, Math.floor((width - GRID_PAD * 2 - GRID_GAP * 6) / 7));
  const cellH = Math.round(cellW * 1.5);

  const daySheetRef = useRef<BottomSheetModal>(null);
  const [sheetDay, setSheetDay] = useState<SheetDay | null>(null);

  const query = useQuery({
    queryKey: ['release-calendar', year, month, region],
    queryFn: () => tmdb.getMovieReleaseCalendar(year, month + 1, region),
    staleTime: 60 * 60 * 1000,
  });

  // Most-anticipated: whole calendar year, upcoming only (release today or
  // later). Independent of the visible month, so it's queried separately.
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const anticipatedQuery = useQuery({
    queryKey: ['anticipated', year, region],
    queryFn: () => {
      const gte = year > today.getFullYear() ? `${year}-01-01` : todayStr;
      return tmdb.getMovieReleaseRange(gte, `${year}-12-31`, region);
    },
    staleTime: 60 * 60 * 1000,
  });

  const entries = useMemo<DayEntry[]>(
    () =>
      (query.data ?? []).map((r) => ({
        movie: toDiscoveryMovie(r),
        popularity: r.popularity,
        day: r.releaseDate ? Number(r.releaseDate.slice(8, 10)) : 0,
      })),
    [query.data],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, DayEntry[]>();
    for (const e of entries) {
      if (!e.day) continue;
      const list = map.get(e.day) ?? [];
      list.push(e);
      map.set(e.day, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.popularity - a.popularity);
    return map;
  }, [entries]);

  const anticipated = useMemo<DayEntry[]>(
    () =>
      (anticipatedQuery.data ?? [])
        .filter((r) => r.coverUrl)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20)
        .map((r) => ({
          movie: toDiscoveryMovie(r),
          popularity: r.popularity,
          day: r.releaseDate ? Number(r.releaseDate.slice(8, 10)) : 0,
        })),
    [anticipatedQuery.data],
  );

  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' });

  const weeks = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const out: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [year, month]);

  const step = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const openDay = (day: number, dayEntries: DayEntry[]) => {
    setSheetDay({ day, monthName, year, entries: dayEntries });
    daySheetRef.current?.present();
  };

  // A cell tap opens the sole release, or the day sheet when several share a day.
  const handleCellPress = (day: number, dayEntries: DayEntry[]) => {
    if (dayEntries.length > 1) openDay(day, dayEntries);
    else if (dayEntries[0]) onPress(dayEntries[0].movie);
  };

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="pb-12" onLayout={onLayout}>
        {/* Month navigation */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
          <Pressable onPress={() => step(-1)} className="h-9 w-9 items-center justify-center rounded-full border border-border">
            <ChevronLeft size={18} color={PRIMARY} />
          </Pressable>
          <View className="items-center">
            <Text className="text-2xl font-bold text-foreground">{monthName}</Text>
            <Text className="text-xs text-muted-foreground">
              {year} · <Text className="font-semibold text-primary">{entries.length} releases</Text> · {region}
            </Text>
          </View>
          <Pressable onPress={() => step(1)} className="h-9 w-9 items-center justify-center rounded-full border border-border">
            <ChevronRight size={18} color={PRIMARY} />
          </Pressable>
        </View>

        {/* Weekday header */}
        <View className="flex-row justify-center px-3 pb-1 pt-2" style={{ gap: GRID_GAP }}>
          {WEEKDAYS.map((d, i) => (
            <Text
              key={i}
              style={{ width: cellW }}
              className="text-center text-[11px] font-medium uppercase text-muted-foreground"
            >
              {d}
            </Text>
          ))}
        </View>

        {query.isLoading ? (
          <LoadingState label="Loading releases…" />
        ) : query.isError ? (
          <ErrorState message="Failed to load calendar" onRetry={() => query.refetch()} />
        ) : (
          <View className="items-center px-3" style={{ gap: GRID_GAP }}>
            {weeks.map((week, wi) => (
              <View key={wi} className="flex-row" style={{ gap: GRID_GAP }}>
                {week.map((day, di) => (
                  <DayCell
                    key={di}
                    day={day}
                    width={cellW}
                    height={cellH}
                    entries={day ? byDay.get(day) ?? [] : []}
                    isToday={isCurrentMonth && day === todayDate}
                    onPress={handleCellPress}
                    onAdd={onAdd}
                    onRemove={onRemove}
                    isAdded={isAdded}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Most anticipated rail */}
        {anticipated.length > 0 && (
          <View className="mt-8 gap-3">
            <Text className="px-4 text-base font-bold uppercase tracking-wide text-foreground">
              <Text className="text-primary">● </Text>
              {year} Most Anticipated
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-4">
              {anticipated.map((e, i) => (
                <View key={e.movie.id} style={{ width: RAIL_CARD_W }} className="gap-1.5">
                  <View className="relative">
                    <MovieCard
                      movie={e.movie}
                      variant="poster"
                      onPress={onPress}
                      onAdd={onAdd}
                      onRemove={onRemove}
                      isAdded={isAdded(e.movie)}
                      showRatings={false}
                    />
                    <View className="absolute left-1.5 top-1.5 rounded-md bg-red-500 px-1.5 py-0.5">
                      <Text className="text-[11px] font-black text-white">#{i + 1}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} className="text-xs font-semibold text-foreground">
                    {e.movie.title}
                  </Text>
                  <Text className="text-[10px] font-semibold uppercase text-muted-foreground">{formatDay(e.movie.releaseDate)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <ReleaseDaySheet
        ref={daySheetRef}
        data={sheetDay}
        region={region}
        onPress={(m) => {
          daySheetRef.current?.dismiss();
          onPress(m);
        }}
        onAdd={onAdd}
        onRemove={onRemove}
        isAdded={isAdded}
      />
    </>
  );
}

type DayCellProps = {
  day: number | null;
  width: number;
  height: number;
  entries: DayEntry[];
  isToday: boolean;
  onPress: (day: number, entries: DayEntry[]) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

function DayCell({ day, width, height, entries, isToday, onPress, onAdd, onRemove, isAdded }: DayCellProps) {
  const top = entries[0];
  const extra = entries.length - 1;
  const size = { width, height };

  // Empty leading/trailing padding cell - same footprint so rows align.
  if (day == null) return <View style={size} />;

  // Day with no releases: just the muted date number.
  if (!top) {
    return (
      <View style={size} className="rounded-md border border-border/40 bg-secondary/20 p-1">
        <Text className={cn('text-[11px] font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>{day}</Text>
      </View>
    );
  }

  const added = isAdded(top.movie);

  return (
    <Pressable
      onPress={() => onPress(day, entries)}
      style={size}
      className={cn(
        'overflow-hidden rounded-md border bg-neutral-900',
        isToday ? 'border-primary' : 'border-border/40',
      )}
    >
      {top.movie.coverUrl ? (
        <Image source={{ uri: top.movie.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View className="flex-1 items-center justify-center bg-neutral-800">
          <Clapperboard size={18} color="#525252" />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View className="absolute left-1 top-1 rounded bg-black/55 px-1">
        <Text className="text-[10px] font-bold text-white">{day}</Text>
      </View>

      {/* Multi-release day: badge only, tap the cell to open the day sheet.
          Single-release day: quick add/remove without leaving the calendar. */}
      {extra > 0 ? (
        <View className="absolute bottom-1 right-1 rounded bg-red-500 px-1.5 py-0.5">
          <Text className="text-[10px] font-bold text-white">+{extra}</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => (added ? onRemove(top.movie) : onAdd(top.movie))}
          hitSlop={6}
          className={cn('absolute bottom-1 right-1 rounded-full p-1', added ? 'bg-green-600/90' : 'bg-blue-600/90')}
        >
          {added ? <Check size={10} color="#fff" /> : <Plus size={10} color="#fff" />}
        </Pressable>
      )}
    </Pressable>
  );
}

type ReleaseDaySheetProps = {
  data: SheetDay | null;
  region: string;
  onPress: (movie: Movie) => void;
  onAdd: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  isAdded: (movie: Movie) => boolean;
};

// Bottom sheet listing every release on a shared day (doc 12 - one shared Sheet
// primitive, no bespoke modal). Rows reuse the same open/add/remove callbacks.
const ReleaseDaySheet = forwardRef<BottomSheetModal, ReleaseDaySheetProps>(function ReleaseDaySheet(
  { data, region, onPress, onAdd, onRemove, isAdded },
  ref,
) {
  return (
    <Sheet ref={ref} snapPoints={['55%', '85%']}>
      <SheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {data && (
          <>
            <Text className="pb-1 text-lg font-bold text-foreground">
              {data.monthName} {data.day}, {data.year}
            </Text>
            <Text className="pb-3 text-xs text-muted-foreground">
              {data.entries.length} releases · {countryName(region)}
            </Text>
            <View className="gap-2">
              {data.entries.map((e) => {
                const added = isAdded(e.movie);
                return (
                  <View key={e.movie.id} className="flex-row items-center gap-3 rounded-xl bg-secondary/40 p-2">
                    <Pressable onPress={() => onPress(e.movie)} className="h-20 w-14 overflow-hidden rounded-md bg-neutral-800">
                      {e.movie.coverUrl ? (
                        <Image source={{ uri: e.movie.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Clapperboard size={18} color="#525252" />
                        </View>
                      )}
                    </Pressable>
                    <Pressable onPress={() => onPress(e.movie)} className="flex-1">
                      <Text numberOfLines={2} className="text-sm font-semibold text-foreground">
                        {e.movie.title}
                      </Text>
                      {e.movie.voteAverage > 0 && (
                        <Text className="pt-0.5 text-xs text-muted-foreground">★ {e.movie.voteAverage.toFixed(1)}</Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => (added ? onRemove(e.movie) : onAdd(e.movie))}
                      hitSlop={8}
                      className={cn('rounded-full p-2', added ? 'bg-green-600/90' : 'bg-blue-600/90')}
                    >
                      {added ? <Check size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </SheetScrollView>
    </Sheet>
  );
});

function formatDay(releaseDate: string | null | undefined): string {
  if (!releaseDate) return '';
  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) return releaseDate;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}
