import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { RecapArchiveRow } from '@/features/recap/RecapArchiveRow';
import { useRecapIndex } from '@/features/recap/useRecap';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { retainedMonthKeys, type RecapKind } from '@/lib/recapPeriod';
import { FileText } from 'lucide-react-native';

// Every recap Radar still holds: all of the years, and the two months retention
// keeps (supabase/recaps.sql trims the rest). Composition only — the periods and
// the cache marks come from useRecapIndex.
export default function RecapArchiveScreen() {
  const router = useRouter();
  const navBarSpace = useNavBarSpace();
  const { months, years, stored, loading } = useRecapIndex();

  const retained = retainedMonthKeys();
  const visibleMonths = months.filter((key) => retained.includes(key));
  const cached = new Set(stored.map((row) => `${row.kind}:${row.key}`));
  const open = (kind: RecapKind, key: string) => router.push({ pathname: '/recap/[kind]/[key]', params: { kind, key } });

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell fill maxWidth={MAX_W.text}>
        <View className="flex-row items-center gap-3 px-4 pb-2">
          <BackButton />
          <Text className="text-2xl font-bold tracking-tight text-foreground">Recap archive</Text>
        </View>

        {loading ? (
          <LoadingState label="Reading your archive…" />
        ) : years.length === 0 && visibleMonths.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} color="hsl(0 0% 63.9%)" />}
            title="Nothing to recap yet"
            description="Finish a few titles and Radar will have something to write up."
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}>
            <Section title="Annual reports" note="Kept for every year you have used Radar">
              {years.map((key) => (
                <RecapArchiveRow
                  key={key}
                  kind="year"
                  periodKey={key}
                  ready={cached.has(`year:${key}`)}
                  onPress={() => open('year', key)}
                />
              ))}
            </Section>

            {visibleMonths.length > 0 && (
              <Section title="Monthly recaps" note="Only the last two finished months are kept">
                {visibleMonths.map((key) => (
                  <RecapArchiveRow
                    key={key}
                    kind="month"
                    periodKey={key}
                    ready={cached.has(`month:${key}`)}
                    onPress={() => open('month', key)}
                  />
                ))}
              </Section>
            )}
          </ScrollView>
        )}
      </ContentShell>
    </View>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <View className="px-4 pt-5">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</Text>
      <Text className="mt-1 text-[12px] text-muted-foreground/70">{note}</Text>
      <View className="mt-3 gap-2">{children}</View>
    </View>
  );
}
