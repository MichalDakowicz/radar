import { supabase } from '@/lib/supabase';
import { RECAP_VERSION, type Recap } from '@/lib/recap';
import type { RecapKind } from '@/lib/recapPeriod';

// Supabase side of Radar Recap: read a stored payload, write a freshly built
// one, list what is already stored. Everything here tolerates the table not
// existing yet (supabase/recaps.sql has to be run by hand, like the rest of the
// schema) — a missing table degrades the feature to "rebuild every time", not to
// an error screen.

export type StoredRecap = { kind: RecapKind; key: string; generatedAt: string };

const MISSING_TABLE = new Set(['PGRST205', 'PGRST202', '42P01']);

function isMissingTable(error: { code?: string } | null): boolean {
  return !!error?.code && MISSING_TABLE.has(error.code);
}

/** Logged once per session so a missing table is diagnosable but not noisy. */
let warned = false;
function warnMissing() {
  if (warned) return;
  warned = true;
  console.warn('public.recaps is missing — run supabase/recaps.sql to cache recaps. Rebuilding on every open until then.');
}

/**
 * A stored payload, or null when there is none. A payload written by an older
 * client version is treated as a miss so the caller rebuilds it rather than
 * feeding a slide a field it does not have.
 */
export async function fetchRecap(userId: string, kind: RecapKind, key: string): Promise<Recap | null> {
  const { data, error } = await supabase
    .from('recaps')
    .select('payload')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('period_key', key)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      warnMissing();
      return null;
    }
    throw error;
  }
  const payload = (data as { payload: Recap } | null)?.payload ?? null;
  if (!payload || payload.version !== RECAP_VERSION) return null;
  return payload;
}

/**
 * Upserts the payload. Month retention (current + previous only) is the
 * database's job — recaps_trim_months fires on this write.
 *
 * Never throws: a recap the user is already watching must not fail because the
 * cache write did.
 */
export async function saveRecap(userId: string, recap: Recap): Promise<void> {
  const { error } = await supabase.from('recaps').upsert(
    {
      user_id: userId,
      kind: recap.kind,
      period_key: recap.key,
      payload: recap,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,kind,period_key' },
  );
  if (error) {
    if (isMissingTable(error)) warnMissing();
    else console.error('Failed to store recap', error);
  }
}

/**
 * Every stored payload, keyed `kind:period`. The archive draws each recap as its
 * own share card, which means it needs the real numbers — one query for all of
 * them beats one per tile, and a period with no stored payload simply falls back
 * to cover art.
 */
export async function fetchRecapPayloads(userId: string): Promise<Record<string, Recap>> {
  const { data, error } = await supabase.from('recaps').select('kind, period_key, payload').eq('user_id', userId);

  if (error) {
    if (isMissingTable(error)) {
      warnMissing();
      return {};
    }
    throw error;
  }
  const payloads: Record<string, Recap> = {};
  for (const row of data as { kind: RecapKind; period_key: string; payload: Recap }[]) {
    if (row.payload?.version === RECAP_VERSION) payloads[`${row.kind}:${row.period_key}`] = row.payload;
  }
  return payloads;
}

/** What is already cached, newest first. Drives the "ready" marks in the archive. */
export async function listRecaps(userId: string): Promise<StoredRecap[]> {
  const { data, error } = await supabase
    .from('recaps')
    .select('kind, period_key, generated_at')
    .eq('user_id', userId)
    .order('period_key', { ascending: false });

  if (error) {
    if (isMissingTable(error)) {
      warnMissing();
      return [];
    }
    throw error;
  }
  return (data as { kind: RecapKind; period_key: string; generated_at: string }[]).map((row) => ({
    kind: row.kind,
    key: row.period_key,
    generatedAt: row.generated_at,
  }));
}

/**
 * Drops a stored payload so the next open rebuilds it. Used by the archive's
 * refresh action on the *current* period, whose numbers are still moving.
 */
export async function deleteRecap(userId: string, kind: RecapKind, key: string): Promise<void> {
  const { error } = await supabase
    .from('recaps')
    .delete()
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('period_key', key);
  if (error && !isMissingTable(error)) console.error('Failed to clear recap', error);
}
