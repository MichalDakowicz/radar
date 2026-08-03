import { periodLabel } from '@/lib/recapPeriod';
import type { MonthlyRecap, PosterRef, Recap, YearlyRecap } from '@/lib/recap';

// The 9:16 share card, as data. One shape for both recaps so a single component
// draws it — the monthly and the yearly differ only in which four numbers they
// lead with, and a friend reading the card does not need two layouts.

export type ShareCardData = {
  headline: string;
  stamp: string;
  cells: { label: string; value: string }[];
  posters: PosterRef[];
  postersLabel: string;
  footer: string;
};

export function shareCardFromYear(recap: YearlyRecap, username: string): ShareCardData {
  return {
    headline: 'My year\nin film.',
    stamp: `${recap.key} · @${username}`,
    cells: [
      { label: 'Titles', value: String(recap.titles) },
      { label: 'Hours', value: String(recap.hours) },
      { label: 'Top genre', value: recap.genres[0]?.name ?? '—' },
      { label: 'Streak', value: `${recap.longestStreak} days` },
    ],
    posters: recap.masterpieces,
    postersLabel:
      recap.masterpieces.length > 0
        ? `${recap.masterpieces.length} perfect ${recap.masterpieces.length === 1 ? 'score' : 'scores'}`
        : 'No perfect scores',
    footer: recap.classification.name,
  };
}

export function shareCardFromMonth(recap: MonthlyRecap, username: string): ShareCardData {
  const place = recap.leaderboard.findIndex((row) => row.isYou) + 1;
  return {
    headline: `${recap.display.charAt(0)}${recap.display.slice(1).toLowerCase()}\n${recap.year}.`,
    stamp: `${recap.display.slice(0, 3)} ${recap.year} · @${username}`,
    cells: [
      { label: 'Titles', value: String(recap.titles) },
      { label: 'Hours', value: String(recap.hours) },
      { label: 'Top genre', value: recap.topGenre?.name ?? '—' },
      {
        label: 'Among friends',
        value: place > 0 ? `#${place} of ${recap.leaderboard.length}` : 'Solo',
      },
    ],
    posters: recap.film ? [recap.film] : [],
    postersLabel: recap.film ? 'Film of the month' : '',
    footer: recap.activeDays > 0 ? `${recap.activeDays} days watching` : 'A quiet month',
  };
}

export function shareCardFor(recap: Recap, username: string): ShareCardData {
  return recap.kind === 'year' ? shareCardFromYear(recap, username) : shareCardFromMonth(recap, username);
}

/**
 * What actually leaves the app when Share is pressed. Text, not an image: an
 * image would need a native view-capture dependency, and the numbers are the
 * part a friend reacts to.
 */
export function recapShareText(recap: Recap, url: string | null): string {
  const period = periodLabel(recap.kind, recap.key);
  const lines =
    recap.kind === 'year'
      ? [
          `My ${period} in Radar`,
          `${recap.titles} titles · ${recap.hours} hours · ${recap.activeDays} active days`,
          recap.genres[0] ? `Top genre: ${recap.genres[0].name}` : null,
          `Longest streak: ${recap.longestStreak} days`,
          recap.classification.name,
        ]
      : [
          `My ${period} in Radar`,
          `${recap.titles} titles · ${recap.hours} hours · ${recap.activeDays} days watching`,
          recap.topGenre ? `Top genre: ${recap.topGenre.name}` : null,
          recap.film ? `Pick of the month: ${recap.film.title}` : null,
        ];
  return [...lines.filter(Boolean), url].filter(Boolean).join('\n');
}
