import type { ReactNode } from 'react';

/**
 * One page of a recap.
 *
 * `justify` exists because the two cover pages spread their content to the card
 * edges (masthead at the top, credits at the bottom) while every other page
 * centres a single block.
 *
 * `action` is the page's one real button. It is declared rather than rendered
 * inside the content because the whole card is transparent to touch — see
 * RecapSlideCard — so the player draws it in a layer of its own above the tap
 * zones. A page that renders its own Pressable would find it dead.
 */
export type RecapSlide = {
  content: ReactNode;
  justify?: 'center' | 'space-between';
  action?: { label: string; onPress: () => void };
};
