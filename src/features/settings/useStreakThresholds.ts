import { useState } from 'react';

import { useUserSettings, type UserSettings } from '@/hooks/useUserSettings';
import { dateKey, weekStart } from '@/lib/stats';
import { applyThresholdChanges, type ThresholdScope } from '@/lib/streakThresholds';

/**
 * The two weekly streak thresholds as drafts. A stepper tap edits the draft and
 * nothing is written until Apply, because a change has to say how far back it
 * reaches (lib/streakThresholds) and that cannot be asked on every tap.
 */
export function useStreakThresholds() {
  const { settings, updateSettings } = useUserSettings();
  // null = untouched, so the field keeps following the saved value while settings load.
  const [movieDraft, setMovieDraft] = useState<number | null>(null);
  const [tvDraft, setTvDraft] = useState<number | null>(null);

  const movie = movieDraft ?? settings.streakThreshold;
  const tv = tvDraft ?? settings.tvStreakThreshold;
  const dirty = movie !== settings.streakThreshold || tv !== settings.tvStreakThreshold;

  const discard = () => {
    setMovieDraft(null);
    setTvDraft(null);
  };

  const apply = async (scope: ThresholdScope) => {
    const patch: Partial<UserSettings> = {};
    if (movie !== settings.streakThreshold) patch.streakThreshold = movie;
    if (tv !== settings.tvStreakThreshold) patch.tvStreakThreshold = tv;

    // "From now on" starts at the Monday of this week: the week in progress is
    // measured against the new number, every week before it against the old one.
    const history = applyThresholdChanges(
      settings.streakThresholdHistory,
      {
        movie: { previous: settings.streakThreshold, next: movie },
        tv: { previous: settings.tvStreakThreshold, next: tv },
      },
      scope,
      dateKey(weekStart(new Date())),
    );
    // Only sent when it moved, so "whole history" on a title with no steps never
    // touches the column and works even before its migration has been run.
    if (history !== settings.streakThresholdHistory) patch.streakThresholdHistory = history;

    await updateSettings(patch);
    discard();
  };

  return { movie, tv, setMovie: setMovieDraft, setTv: setTvDraft, dirty, discard, apply };
}
