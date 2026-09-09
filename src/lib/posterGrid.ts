// How many poster tiles fit a measured width, and how wide each one gets.
//
// Derived rather than a fixed column count: the same grid renders inside a phone
// and inside a capped desktop column, and hardcoding three would give ultrawide
// screens three enormous posters. Capped at the top for the same reason the
// release calendar caps its day cells — past a point a poster stops gaining
// legibility and the grid just stops fitting.

export type GridMetrics = { columns: number; cardWidth: number };

const GAP = 10;
const MAX_CARD_W = 132;
const MIN_CARD_W = 96;

export function posterGridMetrics(available: number, gap: number = GAP): GridMetrics {
  // Measured width is 0 on the first render, before onLayout has fired. Two
  // columns of the minimum is a safe guess that never renders a broken row.
  if (!Number.isFinite(available) || available <= 0) {
    return { columns: 2, cardWidth: MIN_CARD_W };
  }
  const columns = Math.max(2, Math.min(8, Math.floor((available + gap) / (MIN_CARD_W + gap))));
  const cardWidth = Math.min(MAX_CARD_W, Math.floor((available - gap * (columns - 1)) / columns));
  return { columns, cardWidth };
}

export const POSTER_GRID_GAP = GAP;
