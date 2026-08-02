import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { personalScore } from '@/components/media/RatingStars';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import type { BottomSheetModal } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { EditProfileSheet } from '@/features/profile/EditProfileSheet';
import { FavoritesEditorSheet } from '@/features/profile/FavoritesEditorSheet';
import { MyShelfHeader } from '@/features/profile/MyShelfHeader';
import { RandomPickCard } from '@/features/profile/RandomPickCard';
import { RandomPickSheet } from '@/features/profile/RandomPickSheet';
import { ShelfSections } from '@/features/social/ShelfSections';
import { useMovies } from '@/hooks/useMovies';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useProfile } from '@/hooks/useProfile';
import { MAX_W } from '@/hooks/useResponsive';
import { isInWatchlist } from '@/lib/movieStatus';
import { publicShelfUrl } from '@/lib/shelfLink';
import { inProgressTitles, recentlyLogged, shelfStats } from '@/lib/shelfSummary';
import { withTabReload } from '@/store/tabReload';
import type { MediaType, Movie } from '@/types/movie';

// Your own shelf, built from the same pieces a friend's shelf is
// (features/social/ShelfHeader + ShelfSections) so the two never drift: what
// you see here is what they see there, plus the owner-only edit affordances.
// Settings is the nav bar's action on this tab; the random picker moved here
// from the Library's old top bar, where it was an unlabelled icon.
export default withTabReload(ProfileScreen, 'profile');

function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const { profile } = useProfile(user?.id);
  const { movies, loading, error } = useMovies();
  const navBarSpace = useNavBarSpace();
  const editProfileRef = useRef<BottomSheetModal>(null);
  const favoritesRef = useRef<BottomSheetModal>(null);
  const randomPickRef = useRef<BottomSheetModal>(null);

  const stats = useMemo(() => shelfStats(movies, (m) => personalScore(m.ratings)), [movies]);
  const recent = useMemo(() => recentlyLogged(movies), [movies]);
  const inProgress = useMemo(() => inProgressTitles(movies), [movies]);
  // Same eligibility the Library used with no filters applied: the picker is
  // there to answer "what next", so it only draws from the watchlist.
  const pickable = useMemo(() => movies.filter((m) => isInWatchlist(m)), [movies]);

  const openTmdb = (tmdbId: number, type: MediaType) =>
    router.push({ pathname: '/movie/[tmdbId]/[type]', params: { tmdbId: String(tmdbId), type } });

  const openTitle = (movie: Movie) => {
    if (movie.tmdbId == null) {
      show(`${movie.title} is not on TMDB, so it has no detail page`);
      return;
    }
    openTmdb(movie.tmdbId, movie.type);
  };

  const handleRandomSelect = (movie: Movie) => {
    randomPickRef.current?.dismiss();
    router.push({ pathname: '/edit/[movieId]', params: { movieId: movie.id } });
  };

  const share = async () => {
    if (!user) return;
    await Clipboard.setStringAsync(publicShelfUrl(user.id));
    show('Public shelf link copied');
  };

  return (
    <View className="flex-1 bg-background">
      {loading ? (
        <>
          <ScreenTop />
          <LoadingState label="Loading profile…" />
        </>
      ) : error ? (
        <>
          <ScreenTop />
          <ErrorState message={error instanceof Error ? error.message : 'Failed to load your library'} />
        </>
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: navBarSpace }}>
            <MyShelfHeader
              profile={profile}
              email={user?.email}
              stats={stats}
              backdropUrl={recent[0]?.coverUrl ?? null}
              onEdit={() => editProfileRef.current?.present()}
              onShare={share}
            />
            <RandomPickCard count={pickable.length} onPress={() => randomPickRef.current?.present()} />
            <ShelfSections
              favorites={profile?.favorites ?? []}
              inProgress={inProgress}
              recent={recent}
              onOpenTitle={openTitle}
              // profiles.favorites is a snapshot, not an FK - a pinned title
              // routes by its own tmdbId whether or not it is still in the
              // library, which is the point of storing it that way.
              onOpenFavorite={(item) => openTmdb(item.tmdbId, item.type)}
              onEditFavorites={() => favoritesRef.current?.present()}
            />
          </ScrollView>
        </ContentShell>
      )}

      {/* All three sheets are mounted here rather than inside the scrolling
          body: a sheet declared in that subtree cannot scroll its own list,
          because the surrounding ScrollView wins the pan gesture. */}
      <EditProfileSheet ref={editProfileRef} />
      <FavoritesEditorSheet ref={favoritesRef} />
      <RandomPickSheet ref={randomPickRef} movies={pickable} onSelect={handleRandomSelect} />
    </View>
  );
}
