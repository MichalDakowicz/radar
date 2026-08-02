import {
  metadataPatch,
  selectRefreshQueue,
  toRefreshCandidate,
  type RefreshCandidate,
  type RefreshCandidateRow,
} from '@/lib/metadataRefresh';
import { toMovieRow } from '@/lib/normalizeMovie';
import {
  acquireRefreshLock,
  clearRefreshStop,
  getFullRefreshSince,
  isRefreshStopRequested,
  releaseRefreshLock,
  renewRefreshLock,
  setFullRefreshSince,
  setLastRunAt,
} from '@/lib/refreshState';
import {
  showRefreshDone,
  showRefreshPaused,
  showRefreshProgress,
  showRefreshStopped,
} from '@/lib/refreshNotifications';
import { stripUndefined } from '@/lib/stripUndefined';
import { supabase } from '@/lib/supabase';
import { fetchMediaMetadata } from '@/lib/tmdb';

// Execution half of the metadata refresh. Runs identically from the Settings
// button and from the headless background task, so a sweep the user starts in
// the app and a sweep WorkManager starts hours later are the same code path -
// they just differ in budget.

/** Enough to plan over any realistic library without pulling every jsonb blob. */
const CANDIDATE_FETCH_LIMIT = 1000;

/** WorkManager gives roughly ten minutes; stop well short of being killed. */
const BACKGROUND_BUDGET_MS = 4 * 60 * 1000;
const BACKGROUND_LIMIT = 120;

/** A manual sweep is unbounded - it runs until the library is done or the app dies. */
const MANUAL_LIMIT = 5000;

// Gentle pacing so a large library doesn't hammer TMDB.
const PACE_MS = 100;

export type RefreshMode = 'manual' | 'background';

export type RefreshOutcome = {
  ok: number;
  failed: number;
  /** Titles still queued when the budget ran out. */
  remaining: number;
  /** The user stopped this sweep; `remaining` titles were left untouched. */
  stopped: boolean;
  /** Set when the pass did no work; the sweep itself is not in a bad state. */
  skipped?: 'locked' | 'signed-out' | 'nothing-due';
};

const IDLE: RefreshOutcome = { ok: 0, failed: 0, remaining: 0, stopped: false };

async function watchProviderCountry(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_settings')
    .select('watch_provider_country')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.watch_provider_country ?? 'US';
}

async function loadCandidates(userId: string): Promise<RefreshCandidate[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('id,tmdb_id,type,title,tmdb_status,release_date,metadata_synced_at')
    .eq('user_id', userId)
    .not('tmdb_id', 'is', null)
    .order('metadata_synced_at', { ascending: true, nullsFirst: true })
    .limit(CANDIDATE_FETCH_LIMIT);
  if (error) throw error;
  return (data as RefreshCandidateRow[]).map(toRefreshCandidate).filter((c): c is RefreshCandidate => c !== null);
}

export type RunOptions = {
  mode: RefreshMode;
  /** Emit a progress/result notification. Off for silent background top-ups. */
  notify?: boolean;
  onProgress?: (progress: { current: number; total: number }) => void;
  /** Lets the provider abandon a manual sweep when the user signs out. */
  isCancelled?: () => boolean;
};

/**
 * One pass of the refresh. Never throws for ordinary failures - a title TMDB
 * can't answer for is counted and skipped, so one bad row can't strand the
 * rest of the library.
 */
export async function runMetadataRefresh({
  mode,
  notify = false,
  onProgress,
  isCancelled,
}: RunOptions): Promise<RefreshOutcome> {
  const startedAt = Date.now();
  if (!acquireRefreshLock(startedAt)) return { ...IDLE, skipped: 'locked' };

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return { ...IDLE, skipped: 'signed-out' };

    const fullRefreshSince = getFullRefreshSince();
    const [country, candidates] = await Promise.all([watchProviderCountry(userId), loadCandidates(userId)]);

    const queue = selectRefreshQueue(candidates, {
      now: startedAt,
      limit: mode === 'background' ? BACKGROUND_LIMIT : MANUAL_LIMIT,
      fullRefreshSince,
    });

    if (queue.length === 0) {
      // Nothing left in a full sweep means the sweep finished, possibly in an
      // earlier pass - retire the marker so later runs go back to stale-only.
      if (fullRefreshSince) setFullRefreshSince(null);
      setLastRunAt(startedAt);
      return { ...IDLE, skipped: 'nothing-due' };
    }

    const deadline = mode === 'background' ? startedAt + BACKGROUND_BUDGET_MS : Infinity;
    let ok = 0;
    let failed = 0;
    let index = 0;
    let stopped = false;

    // A stop left over from a previous run would cancel this one before it
    // started, so the flag is cleared on the way in, not on the way out.
    clearRefreshStop();

    for (; index < queue.length; index++) {
      if (isRefreshStopRequested() || isCancelled?.()) {
        stopped = true;
        break;
      }
      if (Date.now() > deadline) break;

      const candidate = queue[index];
      onProgress?.({ current: index + 1, total: queue.length });
      if (notify) await showRefreshProgress(index + 1, queue.length, candidate.title);

      try {
        const fresh = await fetchMediaMetadata(candidate.tmdbId, candidate.type, country);
        if (fresh) {
          const row = stripUndefined(toMovieRow(metadataPatch(fresh)));
          const { error } = await supabase
            .from('movies')
            .update({ ...row, metadata_synced_at: new Date().toISOString() })
            .eq('id', candidate.id);
          if (error) throw error;
          ok++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Metadata refresh failed for ${candidate.title}:`, error);
        failed++;
      }

      renewRefreshLock(Date.now());
      await new Promise((resolve) => setTimeout(resolve, PACE_MS));
    }

    const remaining = queue.length - index;
    // Stopping abandons the sweep outright: keeping the marker would have the
    // background task quietly resume the thing the user just stopped. Titles
    // already done keep their metadata_synced_at, so a later run picks up from
    // there anyway - nothing is redone, it just isn't automatic.
    if (fullRefreshSince && (stopped || remaining === 0)) setFullRefreshSince(null);
    setLastRunAt(Date.now());
    clearRefreshStop();

    if (notify) {
      if (stopped) await showRefreshStopped(ok, remaining);
      else if (remaining > 0) await showRefreshPaused(remaining);
      else await showRefreshDone(ok, failed);
    }

    return { ok, failed, remaining, stopped };
  } finally {
    releaseRefreshLock();
  }
}

/**
 * Starts a full sweep of every title. The marker is what makes it resumable:
 * until it clears, every later pass - foreground or background - keeps working
 * through the titles not yet synced since this moment.
 */
export function beginFullRefresh(): void {
  setFullRefreshSince(new Date().toISOString());
}
