import { useEffect, useRef, type RefObject } from 'react';

// Anything with a FlashList-shaped scroll method (FlashList, ScrollView via
// scrollTo is *not* this - those take {x,y}).
type Scrollable = { scrollToOffset: (params: { offset: number; animated?: boolean }) => void };

/**
 * Snaps a virtualized list back to the top whenever `signature` changes.
 *
 * Filtering, searching or re-sorting swaps the data under a list that keeps its
 * scroll offset, which drops the user into the middle of a result set they have
 * never seen. Pass a string built from every input that reshapes the list; the
 * first render is not treated as a change.
 */
export function useScrollToTopOnChange<T extends Scrollable>(signature: string): RefObject<T | null> {
  const ref = useRef<T>(null);
  const lastSignature = useRef(signature);

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    ref.current?.scrollToOffset({ offset: 0, animated: true });
  }, [signature]);

  return ref;
}
