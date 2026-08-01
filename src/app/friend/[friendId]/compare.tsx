import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeftRight, Lock } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useToast } from '@/components/ui/Toast';
import { useQuickAdd } from '@/features/movies/add/useQuickAdd';
import { CompareLists, type GapRow } from '@/features/social/CompareLists';
import { CompareSummary } from '@/features/social/CompareSummary';
import { NestedHeader } from '@/features/social/NestedHeader';
import { useFriendLibraries, useRatedTitles } from '@/features/social/useFriendLibraries';
import { MAX_W } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import { compareHeadline, compareSubtitle, compareTaste } from '@/lib/compareTaste';
import type { MediaType } from '@/types/movie';

/** Where your ratings and a friend's line up, and where they do not. */
export default function CompareTasteScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const { show } = useToast();
  const quickAdd = useQuickAdd();
  const region = useUserSettings().settings.watchProviderCountry;
  const { profile, canView, theirs, mine, loading, error } = useFriendLibraries(friendId);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const myRated = useRatedTitles(mine);
  const theirRated = useRatedTitles(theirs);
  const comparison = useMemo(() => compareTaste(myRated, theirRated), [myRated, theirRated]);

  const name = profile?.displayName || profile?.username || 'them';
  const firstName = name.split(' ')[0];

  const openTitle = (tmdbId: number | null, type: MediaType, title: string) => {
    if (tmdbId == null) {
      show(`${title} is not on TMDB, so it has no detail page`);
      return;
    }
    router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(tmdbId), type } });
  };

  // Routed through useQuickAdd so the row lands with full TMDB metadata, the
  // same as adding from Browse — not a stub built from the three fields the
  // comparison happens to carry.
  const addToWatchlist = async (gap: GapRow) => {
    if (gap.tmdbId == null) {
      show(`${gap.title} is not on TMDB, so it cannot be added automatically`);
      return;
    }
    setAdded((prev) => new Set(prev).add(gap.key));
    try {
      await quickAdd.add(gap.tmdbId, gap.type, region);
      show(`${gap.title} added to your watchlist`);
    } catch (e) {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(gap.key);
        return next;
      });
      show(e instanceof Error ? e.message : 'Failed to add to watchlist');
    }
  };

  const nothingToShow =
    comparison.agree.length === 0 && comparison.split.length === 0 && comparison.gaps.length === 0;

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title={`You & ${firstName}`} />

      {loading ? (
        <LoadingState label="Comparing…" />
      ) : canView === false ? (
        <EmptyState
          icon={<Lock size={40} color="hsl(0 0% 45%)" />}
          title="This shelf is private"
          description="Only friends can compare taste."
        />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to compare'} />
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 px-4 pb-10 pt-4">
            <CompareSummary
              comparison={comparison}
              headline={compareHeadline(firstName, comparison)}
              subtitle={compareSubtitle(comparison)}
            />

            {nothingToShow ? (
              <EmptyState
                icon={<ArrowLeftRight size={38} color="hsl(0 0% 35%)" />}
                title="Not enough ratings yet"
                description={`Rate a few titles ${firstName} has also rated and the overlap fills in here.`}
              />
            ) : (
              <CompareLists
                comparison={comparison}
                friendName={firstName}
                addedKeys={added}
                onOpenTitle={openTitle}
                onAddToWatchlist={addToWatchlist}
              />
            )}
          </ScrollView>
        </ContentShell>
      )}
    </View>
  );
}
