import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { RankedGrid } from '@/features/profile/RankedGrid';
import { useRankedYear } from '@/features/profile/useRankedYears';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';

// One release year, best first — the "2026 ranked" page the Profile card opens.
export default function RankedYearScreen() {
  const router = useRouter();
  const { show } = useToast();
  const navBarSpace = useNavBarSpace();
  const { year } = useLocalSearchParams<{ year: string }>();
  const parsed = Number(year);
  const { entry, loading } = useRankedYear(parsed);

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell fill maxWidth={MAX_W.text}>
        <View className="flex-row items-center gap-3 px-4 pb-2">
          <BackButton />
          <Text className="text-2xl font-bold tracking-tight text-foreground">{parsed || '—'} ranked</Text>
          {!!entry && <Text className="ml-auto text-[12px] text-muted-foreground">{entry.entries.length} titles</Text>}
        </View>

        {loading ? (
          <LoadingState label="Ranking that year…" />
        ) : !entry ? (
          <EmptyState
            icon={<Trophy size={40} color="hsl(0 0% 63.9%)" />}
            title="Nothing ranked from that year"
            description="Rate something you finished from it and it will show up here."
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}
            contentContainerClassName="px-4 pt-3"
          >
            <RankedGrid
              entries={entry.entries}
              onOpen={(item) => {
                if (item.movie.tmdbId == null) {
                  show(`${item.movie.title} is not on TMDB, so it has no detail page`);
                  return;
                }
                router.push({
                  pathname: '/movie/[tmdbId]/[type]',
                  params: { tmdbId: String(item.movie.tmdbId), type: item.movie.type },
                });
              }}
            />
          </ScrollView>
        )}
      </ContentShell>
    </View>
  );
}
