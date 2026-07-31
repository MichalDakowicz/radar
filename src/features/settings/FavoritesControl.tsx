import { useRouter } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { FavoritesRow } from '@/features/profile/FavoritesRow';
import { useProfile } from '@/hooks/useProfile';

// Owner-side top 4 as it appears on your public profile. The editor sheet is
// NOT mounted here: this renders inside the Settings ScrollView, and a sheet
// declared in that subtree can't scroll its own list (the scroll view wins the
// pan gesture). settings.tsx owns the sheet, same as Edit profile / Import.
export function FavoritesControl({ onEdit }: { onEdit: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  return (
    <FavoritesRow
      favorites={profile?.favorites ?? []}
      onEdit={onEdit}
      onPressItem={(item) =>
        router.push({
          pathname: '/movie/[tmdbId]/[type]',
          params: { tmdbId: String(item.tmdbId), type: item.type },
        })
      }
    />
  );
}
