import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { RankedYearRow } from '@/features/profile/RankedYearRow';
import { useRankedYears } from '@/features/profile/useRankedYears';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';

// Every release year you have rated something from, newest first. Composition
// only — the ranking itself is lib/rankedYears.
export default function RankedYearsScreen() {
  const router = useRouter();
  const navBarSpace = useNavBarSpace();
  const { years, loading } = useRankedYears();

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell fill maxWidth={MAX_W.text}>
        <View className="flex-row items-center gap-3 px-4 pb-2">
          <BackButton />
          <Text className="text-2xl font-bold tracking-tight text-foreground">Ranked years</Text>
        </View>

        {loading ? (
          <LoadingState label="Ranking your years…" />
        ) : years.length === 0 ? (
          <EmptyState
            icon={<Trophy size={40} color="hsl(0 0% 63.9%)" />}
            title="Nothing ranked yet"
            description="Rate a few titles you have finished and Radar will rank them against the rest of their release year."
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}
            contentContainerClassName="gap-2.5 px-4 pt-3"
          >
            {years.map((year) => (
              <RankedYearRow
                key={year.year}
                year={year}
                onPress={() => router.push({ pathname: '/ranked/[year]', params: { year: String(year.year) } })}
              />
            ))}
          </ScrollView>
        )}
      </ContentShell>
    </View>
  );
}
