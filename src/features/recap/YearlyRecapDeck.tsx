import { useMemo } from 'react';

import { RecapPlayer } from '@/features/recap/RecapPlayer';
import { YearCoverSlide } from '@/features/recap/slides/YearCoverSlide';
import { YearDecadesSlide } from '@/features/recap/slides/YearDecadesSlide';
import { YearDirectorsSlide } from '@/features/recap/slides/YearDirectorsSlide';
import { YearGenresSlide } from '@/features/recap/slides/YearGenresSlide';
import { YearHeatmapSlide } from '@/features/recap/slides/YearHeatmapSlide';
import { YearMasterpiecesSlide } from '@/features/recap/slides/YearMasterpiecesSlide';
import { YearRewatchSlide } from '@/features/recap/slides/YearRewatchSlide';
import { YearShareSlide } from '@/features/recap/slides/YearShareSlide';
import { YearTotalsSlide } from '@/features/recap/slides/YearTotalsSlide';
import { useRecapShare } from '@/features/recap/useRecapShare';
import type { RecapSlide } from '@/features/recap/slideTypes';
import { shareCardFromYear } from '@/lib/recapShare';
import type { YearlyRecap } from '@/lib/recap';

type YearlyRecapDeckProps = { recap: YearlyRecap; username: string; onClose: () => void };

/**
 * The annual report: nine pages, deadpan, opening on the archive cover and
 * closing on the share card rather than on a second certificate.
 */
export function YearlyRecapDeck({ recap, username, onClose }: YearlyRecapDeckProps) {
  const { share, canvas } = useRecapShare(recap, username);
  const card = useMemo(() => shareCardFromYear(recap, username), [recap, username]);

  const slides = useMemo<RecapSlide[]>(
    () => [
      { content: <YearCoverSlide recap={recap} username={username} />, justify: 'space-between' },
      { content: <YearTotalsSlide recap={recap} /> },
      { content: <YearHeatmapSlide recap={recap} /> },
      { content: <YearGenresSlide recap={recap} /> },
      { content: <YearDirectorsSlide recap={recap} /> },
      { content: <YearDecadesSlide recap={recap} /> },
      { content: <YearMasterpiecesSlide recap={recap} /> },
      { content: <YearRewatchSlide recap={recap} /> },
      { content: <YearShareSlide data={card} />, action: { label: 'Share the report', onPress: share } },
    ],
    [recap, username, card, share],
  );

  return (
    <>
      <RecapPlayer slides={slides} onClose={onClose} />
      {/* The card the share sheet sends, parked off screen. */}
      {canvas}
    </>
  );
}
