// "Compare taste" — the overlap ring, the agree/split lists, and the titles a
// friend rated highly that you have never logged.
//
// Takes flattened {key, title, score} rows rather than Movie objects so the
// scoring rule (personalScore, which lives with the stars component) stays at
// the call site and this file stays a pure set operation.

import type { MediaType } from '@/types/movie';

export type RatedTitle = {
  /** Stable identity across two libraries — see titleKey. */
  key: string;
  title: string;
  coverUrl: string | null;
  tmdbId: number | null;
  type: MediaType;
  score: number;
};

/**
 * Two people's rows for the same film are separate database rows, so the match
 * is on TMDB id. Manual entries have no id and fall back to a normalised title,
 * which is the best available and occasionally wrong — a manual "Dune" matches
 * another manual "dune".
 */
export function titleKey(tmdbId: number | null, type: MediaType, title: string): string {
  return tmdbId != null ? `${type}:${tmdbId}` : `${type}:t:${title.trim().toLowerCase()}`;
}

/** Within half a star counts as agreement — the rating UI's own granularity. */
export const CLOSE_THRESHOLD = 0.5;
/** A star and a half apart is a real disagreement, not rounding. */
export const SPLIT_THRESHOLD = 1.5;
/** What counts as "they rated it high" for a recommendation. */
export const HIGH_SCORE = 4;

export type CompareRow = {
  key: string;
  title: string;
  coverUrl: string | null;
  tmdbId: number | null;
  type: MediaType;
  yours: number;
  theirs: number;
  gap: number;
};

export type TasteComparison = {
  sharedCount: number;
  closeCount: number;
  /** closeCount / sharedCount, 0-100. 0 when you share nothing. */
  overlapPct: number;
  agree: CompareRow[];
  split: CompareRow[];
  /** They rated it >= HIGH_SCORE, you have not rated it at all. */
  gaps: Omit<CompareRow, 'yours' | 'gap'>[];
};

export function compareTaste(yours: RatedTitle[], theirs: RatedTitle[], limit = 4): TasteComparison {
  const mine = new Map(yours.map((row) => [row.key, row]));
  const agree: CompareRow[] = [];
  const split: CompareRow[] = [];
  const gaps: TasteComparison['gaps'] = [];
  let sharedCount = 0;
  let closeCount = 0;

  for (const their of theirs) {
    const my = mine.get(their.key);
    if (!my) {
      if (their.score >= HIGH_SCORE) {
        const { score, ...rest } = their;
        gaps.push({ ...rest, theirs: score });
      }
      continue;
    }

    sharedCount += 1;
    const gap = Math.abs(my.score - their.score);
    if (gap <= CLOSE_THRESHOLD) closeCount += 1;

    const row: CompareRow = {
      key: their.key,
      title: their.title,
      coverUrl: their.coverUrl ?? my.coverUrl,
      tmdbId: their.tmdbId ?? my.tmdbId,
      type: their.type,
      yours: my.score,
      theirs: their.score,
      gap,
    };
    if (gap <= CLOSE_THRESHOLD) agree.push(row);
    else if (gap >= SPLIT_THRESHOLD) split.push(row);
  }

  // Agreement leads with the titles you both rated highest — a shared 5 says
  // more than a shared 2. Disagreement leads with the widest gap.
  agree.sort((a, b) => b.yours + b.theirs - (a.yours + a.theirs) || a.title.localeCompare(b.title));
  split.sort((a, b) => b.gap - a.gap || a.title.localeCompare(b.title));
  gaps.sort((a, b) => b.theirs - a.theirs || a.title.localeCompare(b.title));

  return {
    sharedCount,
    closeCount,
    overlapPct: sharedCount === 0 ? 0 : Math.round((closeCount / sharedCount) * 100),
    agree: agree.slice(0, limit),
    split: split.slice(0, limit),
    gaps: gaps.slice(0, limit),
  };
}

/** Threshold at which the headline stops hedging. */
const AGREEABLE_PCT = 62;

export function compareHeadline(firstName: string, comparison: TasteComparison): string {
  if (comparison.sharedCount === 0) return `You and ${firstName} have not rated the same title yet`;
  return comparison.overlapPct >= AGREEABLE_PCT
    ? `You and ${firstName} mostly agree`
    : `You and ${firstName} are a coin flip`;
}

export function compareSubtitle(comparison: TasteComparison): string {
  const { sharedCount, closeCount } = comparison;
  if (sharedCount === 0) return 'Rate a title you have both seen and the overlap shows up here.';
  const subject = sharedCount === 1 ? 'shared title lands' : 'shared titles land';
  return `${closeCount} of ${sharedCount} ${subject} within half a star.`;
}
