import { CalendarX, Clapperboard } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

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

export function LeavingView({ onPress }: LeavingViewProps) {
  const { settings } = useUserSettings();
  const { tracked, discover, byDay, loading, error, hasCatalogue } = useLeavingSoon();
  const navBarSpace = useNavBarSpace();

  const open = (entry: LeavingTitle) => onPress(leavingToMovie(entry));

  if (loading) return <LoadingState label="Checking what's leaving…" />;
  if (error) return <ErrorState message="Couldn't load the leaving-soon list" />;

  // No services picked means the filter has nothing to filter by, and showing a
  // whole country's churn would be worse than showing nothing. Send them to the
  // setting instead of pretending there is no news.
  if (settings.ownedServices.length === 0) {
    return (
      <Empty
        title="Tell Radar what you subscribe to"
        body="Pick your services in Settings and this fills with the titles about to leave them."
      />
    );
  }

  if (!hasCatalogue) {
    return (
      <Empty
        title={`Nothing tracked for ${countryName(settings.watchProviderCountry)} yet`}
        body="Expiry dates only exist where the service publishes them. HBO Max, Netflix and SkyShowtime report the most; Prime Video and Disney+ rarely do."
      />
    );
  }

  const total = byDay.size === 0 ? 0 : [...byDay.values()].reduce((n, day) => n + day.length, 0);

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}
    >
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
          {countryName(settings.watchProviderCountry)} · {settings.ownedServices.join(' · ')}
        </Text>
        {discover.length === 0 && tracked.length === 0 ? (
          <Empty title="Nothing is leaving soon" body="Nothing on your services has a published expiry date right now." />
        ) : (
          <LeavingAgenda byDay={byDay} onPress={open} />
        )}
      </View>
    </ScrollView>
  );
}
