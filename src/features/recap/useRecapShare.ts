import { useCallback } from 'react';
import { Share } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { recapShareText } from '@/lib/recapShare';
import { publicShelfUrl } from '@/lib/shelfLink';
import type { Recap } from '@/lib/recap';

/**
 * Hands the recap's numbers to the platform share sheet, with a link back to the
 * user's public shelf. Text rather than an image: capturing the card as a bitmap
 * needs a native view-snapshot module the app does not ship, and a share that
 * silently produced nothing would be worse than one that produced a sentence.
 */
export function useRecapShare(recap: Recap | null) {
  const { user } = useAuth();
  const { show } = useToast();

  return useCallback(async () => {
    if (!recap) return;
    const message = recapShareText(recap, user ? publicShelfUrl(user.id) : null);
    try {
      await Share.share({ message });
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not open the share sheet');
    }
  }, [recap, user, show]);
}
