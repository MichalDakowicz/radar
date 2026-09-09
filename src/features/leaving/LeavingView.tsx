import { CalendarX, Clapperboard } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useUserSettings } from '@/hooks/useUserSettings';
import { countryName } from '@/lib/countries';
import type { LeavingTitle } from '@/lib/leaving';
import type { Movie } from '@/types/movie';

import { LeavingAgenda } from './LeavingAgenda';
import { LeavingRow } from './LeavingRow';
import { leavingToMovie } from './leavingToMovie';
import { useLeavingSoon } from './useLeavingSoon';

// Browse → Calendar → "Leaving". Two questions, in the order they matter:
// what am I about to lose off my watchlist, and what else is going.
//
// Region-wide by default rather than limited to services the user pays for.
// This is a browse surface: a film about to vanish from a service you do not
// have is exactly the kind of thing worth knowing, and occasionally worth
// subscribing over. "My services" is there as a filter for when the question is
// "what can I watch tonight" instead.

type LeavingViewProps = { onPress: (movie: Movie) => void };

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center gap-2 px-8 py-16">
      <CalendarX size={28} color="hsl(0 0% 63.9%)" />
      <Text className="text-center text-base font-semibold text-foreground">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">{body}</Text>
    </View>
  );
}

function ScopeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1 ${active ? 'border-primary bg-primary/15' : 'border-border'}`}
    >
      <Text className={active ? 'text-xs font-semibold text-primary' : 'text-xs text-muted-foreground'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LeavingView({ onPress }: LeavingViewProps) {
  const { settings } = useUserSettings();
  const [onlyOwned, setOnlyOwned] = useState(false);
  const { tracked, discover, byDay, loading, error, hasCatalogue, ownedCount } = useLeavingSoon(onlyOwned);
  const navBarSpace = useNavBarSpace();

  const open = (entry: LeavingTitle) => onPress(leavingToMovie(entry));

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

  const total = [...byDay.values()].reduce((n, day) => n + day.length, 0);
  // Offering the filter when it would empty the screen is a trap, so it only
  // appears once the user has services set and something is actually on them.
  const canFilter = settings.ownedServices.length > 0 && ownedCount > 0;

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}
    >
      {canFilter && (
        <View className="flex-row gap-2">
          <ScopeChip label="Everything" active={!onlyOwned} onPress={() => setOnlyOwned(false)} />
          <ScopeChip label="My services" active={onlyOwned} onPress={() => setOnlyOwned(true)} />
        </View>
      )}

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-lg font-bold text-foreground">On your watchlist</Text>
          <Text className="text-xs text-muted-foreground">{tracked.length}</Text>
        </View>
        {tracked.length === 0 ? (
          <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-4">
            <Clapperboard size={16} color="hsl(0 0% 63.9%)" />
            <Text className="flex-1 text-sm text-muted-foreground">
              Nothing on your watchlist is leaving in the next few weeks.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {tracked.map((entry) => (
              <LeavingRow key={`${entry.mediaType}-${entry.tmdbId}`} entry={entry} onPress={open} />
            ))}
          </View>
        )}
      </View>

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-lg font-bold text-foreground">Everything leaving</Text>
          <Text className="text-xs text-muted-foreground">{total}</Text>
        </View>
        <Text className="-mt-1 text-xs text-muted-foreground">
          {countryName(settings.watchProviderCountry)}
          {onlyOwned ? ` · ${settings.ownedServices.join(' · ')}` : ' · every service'}
        </Text>
        {total === 0 ? (
          <Empty
            title={onlyOwned ? 'Nothing leaving your services' : 'Nothing is leaving soon'}
            body={
              onlyOwned
                ? 'Switch to Everything to see what is going from the services you do not have.'
                : 'Nothing in this region has a published expiry date right now.'
            }
          />
        ) : (
          <>
            {!onlyOwned && discover.length > 0 && (
              <Text className="-mt-1 text-xs text-muted-foreground">
                Outlined badges are services you do not subscribe to
              </Text>
            )}
            <LeavingAgenda byDay={byDay} onPress={open} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
