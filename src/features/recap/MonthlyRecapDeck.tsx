import { useMemo } from 'react';

import { RecapPlayer } from '@/features/recap/RecapPlayer';
import { MonthCoverSlide } from '@/features/recap/slides/MonthCoverSlide';
import { MonthFilmSlide } from '@/features/recap/slides/MonthFilmSlide';
import { MonthFriendsSlide } from '@/features/recap/slides/MonthFriendsSlide';
import { MonthHoursSlide } from '@/features/recap/slides/MonthHoursSlide';
import { useRecapShare } from '@/features/recap/useRecapShare';
import type { RecapSlide } from '@/features/recap/slideTypes';
import type { MonthlyRecap } from '@/lib/recap';

type MonthlyRecapDeckProps = { recap: MonthlyRecap; username: string; onClose: () => void };

/**
 * The monthly reel: loud, short, disposable. Four pages — the design's "3 AM
 * club" page was cut, so nothing here depends on knowing what time of night a
 * title was started.
 *
 * The friends page is dropped when there is no leaderboard to show, rather than
 * rendered as an empty ranking of one.
 */
export function MonthlyRecapDeck({ recap, username, onClose }: MonthlyRecapDeckProps) {
  const { share, canvas } = useRecapShare(recap, username);

  const slides = useMemo<RecapSlide[]>(() => {
    const pages: RecapSlide[] = [
      { content: <MonthCoverSlide recap={recap} /> },
      { content: <MonthHoursSlide recap={recap} /> },
    ];
    if (recap.leaderboard.length > 1) pages.push({ content: <MonthFriendsSlide recap={recap} /> });
    const monthWord = recap.display.charAt(0) + recap.display.slice(1).toLowerCase();
    pages.push({
      content: <MonthFilmSlide recap={recap} />,
      action: { label: `Share your ${monthWord}`, onPress: share },
    });
    return pages;
  }, [recap, share]);

  return (
    <>
      <RecapPlayer slides={slides} onClose={onClose} />
      {/* The card the share sheet sends, parked off screen. */}
      {canvas}
    </>
  );
}
