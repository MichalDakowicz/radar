import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/AuthProvider';
import { RecapArchiveCard } from '@/features/recap/RecapArchiveCard';
import { fetchRecapPayloads } from '@/features/recap/recapStore';
import { useRecapIndex } from '@/features/recap/useRecap';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useProfile } from '@/hooks/useProfile';
import { MAX_W } from '@/hooks/useResponsive';
import { retainedMonthKeys, type RecapKind } from '@/lib/recapPeriod';

// Every recap Radar still holds, drawn as the cards you would send rather than as
// a list of rows: all of the years, and the two months retention keeps
// (supabase/recaps.sql trims the rest). Composition only.
export default function RecapArchiveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { width } = useWindowDimensions();
  const navBarSpace = useNavBarSpace();
  const { months, years, loading } = useRecapIndex();

  const payloads = useQuery({
    queryKey: ['recapPayloads', user?.id],
    queryFn: () => fetchRecapPayloads(user!.id),
    enabled: !!user?.id,
  });

  const retained = retainedMonthKeys();
  const visibleMonths = months.filter((key) => retained.includes(key));
  // Two cards per row inside the text column, 16px gutters either side and
  // between — the 9:16 card is tall, so three across would be unreadable.
  const columnWidth = Math.min(width, MAX_W.text);
  const cardWidth = Math.floor((columnWidth - 32 - 16) / 2);
  const open = (kind: RecapKind, key: string) => router.push({ pathname: '/recap/[kind]/[key]', params: { kind, key } });

  const card = (kind: RecapKind, key: string) => (
    <RecapArchiveCard
      key={`${kind}:${key}`}
      kind={kind}
      periodKey={key}
      recap={payloads.data?.[`${kind}:${key}`] ?? null}
      username={profile?.username ?? 'you'}
      width={cardWidth}
      onPress={() => open(kind, key)}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <ContentShell fill maxWidth={MAX_W.text}>
        <View className="flex-row items-center gap-3 px-4 pb-2">
          <BackButton />
          <Text className="text-2xl font-bold tracking-tight text-foreground">Your archive</Text>
        </View>

        {loading ? (
          <LoadingState label="Reading your archive…" />
        ) : years.length === 0 && visibleMonths.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} color="hsl(0 0% 63.9%)" />}
            title="Nothing to recap yet"
            description="Finish a few titles and Radar will have something to write up at the end of the month."
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}>
            {years.length > 0 && (
              <Section title="Annual reports" note="One for every year you have used Radar">
                {years.map((key) => card('year', key))}
              </Section>
            )}
            {visibleMonths.length > 0 && (
              <Section title="Monthly recaps" note="Only the last two finished months are kept">
                {visibleMonths.map((key) => card('month', key))}
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
    <View className="px-4 pt-6">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</Text>
      <Text className="mt-1 text-[12px] text-muted-foreground/70">{note}</Text>
      <View className="mt-4 flex-row flex-wrap" style={{ rowGap: 20, columnGap: 16 }}>
        {children}
      </View>
    </View>
  );
}
