import { useMemo } from 'react';

import { RecapPlayer } from '@/features/recap/RecapPlayer';
import { MonthCoverSlide } from '@/features/recap/slides/MonthCoverSlide';
import { MonthFilmSlide } from '@/features/recap/slides/MonthFilmSlide';
import { MonthFriendsSlide } from '@/features/recap/slides/MonthFriendsSlide';
import { MonthHoursSlide } from '@/features/recap/slides/MonthHoursSlide';
import { useRecapShare } from '@/features/recap/useRecapShare';
import type { RecapSlide } from '@/features/recap/slideTypes';
import type { MonthlyRecap } from '@/lib/recap';

type MonthlyRecapDeckProps = { recap: MonthlyRecap; onClose: () => void };

/**
 * The monthly reel: loud, short, disposable. Four pages — the design's "3 AM
 * club" page was cut, so nothing here depends on knowing what time of night a
 * title was started.
 *
 * The friends page is dropped when there is no leaderboard to show, rather than
 * rendered as an empty ranking of one.
 */
export function MonthlyRecapDeck({ recap, onClose }: MonthlyRecapDeckProps) {
  const share = useRecapShare(recap);

  const slides = useMemo<RecapSlide[]>(() => {
    const pages: RecapSlide[] = [
      { content: <MonthCoverSlide recap={recap} /> },
      { content: <MonthHoursSlide recap={recap} /> },
    ];
    if (recap.leaderboard.length > 1) pages.push({ content: <MonthFriendsSlide recap={recap} /> });
    pages.push({ content: <MonthFilmSlide recap={recap} onShare={share} /> });
    return pages;
  }, [recap, share]);

  return (
    <RecapPlayer
      slides={slides}
      title="Radar Recap"
      stamp={() => `${recap.display.slice(0, 3)} ${recap.year}`}
      onClose={onClose}
    />
  );
}
