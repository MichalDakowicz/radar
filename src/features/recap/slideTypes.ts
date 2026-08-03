import type { ReactNode } from 'react';

/**
 * One page of a recap. `justify` exists because the two cover pages spread their
 * content to the card edges (masthead at the top, credits at the bottom) while
 * every other page centres a single block.
 */
export type RecapSlide = {
  content: ReactNode;
  justify?: 'center' | 'space-between';
};
