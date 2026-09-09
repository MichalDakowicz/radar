import { CalendarX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useUserSettings } from '@/hooks/useUserSettings';
import { countryName } from '@/lib/countries';
import {
  filterLeaving,
  groupByHorizon,
  needsSubscription,
  serviceCounts,
  splitLeaving,
  type LeavingTitle,
} from '@/lib/leaving';
import type { MediaType, Movie } from '@/types/movie';

import { LeavingFilters, MINE_KEY } from './LeavingFilters';
import { LeavingGrid } from './LeavingGrid';
import { leavingToMovie } from './leavingToMovie';
import { useLeavingSoon } from './useLeavingSoon';

// Browse → Calendar → "Leaving". Region-wide by default: a film about to vanish
// from a service you do not have is worth seeing, and is the one moment a
// subscription is worth weighing. "My services" narrows it back down.
//
// Poster grid, not a list. A month of expirations is a few hundred titles, and
// as full-width rows that was an unreadable scroll with no end. Grid, filters
// and a page cap are the three things that make the volume survivable.

/** Titles revealed at a time. A month is a few hundred; showing them all is the
 *  endless scroll this page is trying not to be. */
const PAGE = 24;

type LeavingViewProps = { onPress: (movie: Movie) => void };

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center gap-2 px-8 py-14">
      <CalendarX size={28} color="hsl(0 0% 63.9%)" />
      <Text className="text-center text-base font-semibold text-foreground">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">{body}</Text>
    </View>
  );
}

export function LeavingView({ onPress }: LeavingViewProps) {
  const { settings } = useUserSettings();
  const [selected, setSelected] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const onlyOwned = selected.includes(MINE_KEY);
  const { titles, loading, error, hasCatalogue } = useLeavingSoon(onlyOwned);
  const navBarSpace = useNavBarSpace();

  const namedServices = useMemo(() => selected.filter((s) => s !== MINE_KEY), [selected]);
  const shown = useMemo(
    () => filterLeaving(titles, { services: namedServices, mediaType }),
    [titles, namedServices, mediaType],
  );
  const chips = useMemo(() => serviceCounts(titles), [titles]);
  const { tracked, discover } = useMemo(() => splitLeaving(shown), [shown]);
  // Capped before bucketing, so "show more" extends the list chronologically
  // rather than growing every section at once.
  const buckets = useMemo(() => groupByHorizon(discover.slice(0, limit)), [discover, limit]);
  const remaining = discover.length - Math.min(limit, discover.length);

  const open = (entry: LeavingTitle) => onPress(leavingToMovie(entry));

  const toggleService = (service: string) => {
    setLimit(PAGE);
    setSelected((current) =>
      current.includes(service) ? current.filter((s) => s !== service) : [...current, service],
    );
  };

  const changeType = (type: MediaType | null) => {
    setLimit(PAGE);
    setMediaType(type);
  };

  if (loading) return <LoadingState label="Checking what's leaving…" />;
  if (error) return <ErrorState message="Couldn't load the leaving-soon list" />;

  if (!hasCatalogue) {
    return (
      <Empty
        title={`Nothing tracked for ${countryName(settings.watchProviderCountry)} yet`}
        body="Expiry dates only exist where the service publishes them. HBO Max, Netflix and SkyShowtime report the most; Prime Video and Disney+ rarely do."
      />
    );
  }

  const anyUnowned = shown.some(needsSubscription);

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-4 pt-3"
      contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}
    >
      <View className="gap-2">
        <LeavingFilters
          services={chips}
          selected={selected}
          onToggleService={toggleService}
          hasOwned={settings.ownedServices.length > 0}
          mediaType={mediaType}
          onChangeType={changeType}
        />
        {/* Said once, here, rather than stamped under all 177 posters. */}
        {anyUnowned && settings.ownedServices.length > 0 && (
          <Text className="text-[11px] text-muted-foreground">
            A filled service badge is one you subscribe to; outlined needs a sub
          </Text>
        )}
      </View>

      {tracked.length > 0 && (
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-base font-bold text-foreground">On your watchlist</Text>
            <Text className="text-xs text-muted-foreground">{tracked.length}</Text>
          </View>
          <LeavingGrid titles={tracked} onPress={open} />
        </View>
      )}

      <View className="gap-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-base font-bold text-foreground">
            {tracked.length > 0 ? 'Everything else' : 'Leaving soon'}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {countryName(settings.watchProviderCountry)} · {discover.length}
          </Text>
        </View>

        {discover.length === 0 ? (
          <Empty
            title="Nothing matches those filters"
            body="Clear a chip or switch back to All to widen the list."
          />
        ) : (
          <>
            {buckets.map((bucket) => (
              <View key={bucket.key} className="gap-2">
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-sm font-semibold text-foreground">{bucket.label}</Text>
                  <Text className="text-xs text-muted-foreground">{bucket.titles.length}</Text>
                </View>
                <LeavingGrid titles={bucket.titles} onPress={open} />
              </View>
            ))}

            {remaining > 0 && (
              <Pressable
                onPress={() => setLimit((n) => n + PAGE)}
                className="items-center rounded-xl border border-border bg-card py-3"
              >
                <Text className="text-sm font-semibold text-primary">
                  Show {Math.min(remaining, PAGE)} more
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
