// send-push — drains public.notifications into Expo's push service.
//
// Runs on Supabase Edge Functions (Deno). A pg_cron job POSTs here every minute
// (see supabase/notifications.sql, "SCHEDULES"); the body is ignored, the work
// is always the same: take everything owed a banner, send it, stamp it.
//
// Deploy:
//   npx supabase functions deploy send-push --no-verify-jwt --project-ref <ref>
//
// --no-verify-jwt because the caller is pg_net with a service-role bearer token,
// which the runtime does not treat as a user JWT. The function still refuses to
// do anything without that token — see the guard in `serve`.
//
// Deliberately dependency-free: PostgREST is reachable with fetch, and a zero-
// import function has nothing to break on a Deno or supabase-js major bump.

// Types only — the edge runtime's own globals (Deno.env, Deno.serve). Excluded
// from the app's tsconfig, so this specifier is never resolved by `tsc`.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo rejects requests over 100 messages. */
const CHUNK = 100;

/** How many notifications one invocation will drain. Cron runs every minute. */
const DRAIN_LIMIT = 400;

type PendingRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  token: string;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

// Android channels, mirrored from src/lib/notificationChannels.ts. The channel
// has to already exist on the device — it is created by the app at startup — and
// a push naming an unknown channel lands on the app's default one instead.
const CHANNELS: Record<string, string> = {
  friend_request: 'social',
  friend_accepted: 'social',
  friend_activity: 'social',
  reaction: 'social',
  comment: 'social',
  release: 'releases',
  release_soon: 'releases',
  streak_risk: 'streaks',
  nudge: 'nudges',
};

// A streak warning is time-critical in a way a nudge is not; only the former
// earns the right to wake a dozing device.
const HIGH_PRIORITY = new Set(['friend_request', 'streak_risk', 'release']);

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(`${name} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

function toMessage(row: PendingRow) {
  return {
    to: row.token,
    title: row.title,
    body: row.body,
    data: row.data,
    sound: 'default' as const,
    channelId: CHANNELS[row.kind] ?? 'social',
    priority: HIGH_PRIORITY.has(row.kind) ? ('high' as const) : ('normal' as const),
  };
}

/**
 * One Expo request. Tickets come back positionally, so a ticket's index is its
 * message's index — that is the only link between a failure and the token that
 * caused it.
 */
async function sendChunk(rows: PendingRow[]): Promise<{ sent: string[]; dead: string[] }> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(rows.map(toMessage)),
  });

  if (!response.ok) {
    // A 4xx/5xx from Expo is transient as far as we are concerned: leave
    // pushed_at null and the next minute's drain tries again, until the row
    // ages out of pending_push_notifications' 24h window on its own.
    console.error('Expo push rejected the batch', response.status, await response.text());
    return { sent: [], dead: [] };
  }

  const payload = (await response.json()) as { data?: ExpoTicket[] };
  const tickets = payload.data ?? [];
  const sent: string[] = [];
  const dead: string[] = [];

  rows.forEach((row, index) => {
    const ticket = tickets[index];
    if (!ticket) return;
    if (ticket.status === 'ok') {
      sent.push(row.id);
      return;
    }
    // DeviceNotRegistered is the app being uninstalled or the token rotating.
    // The row is still "done" — there is no device left to deliver it to.
    if (ticket.details?.error === 'DeviceNotRegistered') {
      dead.push(row.token);
      sent.push(row.id);
      return;
    }
    console.error('Push ticket error', row.id, ticket.message);
  });

  return { sent, dead };
}

async function drain(): Promise<{ pending: number; pushed: number; pruned: number }> {
  const rows = await rpc<PendingRow[]>('pending_push_notifications', { p_limit: DRAIN_LIMIT });
  if (!rows || rows.length === 0) {
    // Still call the stamp: it is what abandons rows that aged past 24 hours
    // without ever being deliverable, so they stop being scanned every minute.
    await rpc('mark_notifications_pushed', { p_ids: [] });
    return { pending: 0, pushed: 0, pruned: 0 };
  }

  const pushed = new Set<string>();
  const dead = new Set<string>();

  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await sendChunk(rows.slice(i, i + CHUNK));
    result.sent.forEach((id) => pushed.add(id));
    result.dead.forEach((token) => dead.add(token));
  }

  await rpc('mark_notifications_pushed', { p_ids: [...pushed] });
  if (dead.size > 0) await rpc('drop_device_tokens', { p_tokens: [...dead] });

  return { pending: rows.length, pushed: pushed.size, pruned: dead.size };
}

Deno.serve(async (request: Request) => {
  // The only legitimate caller holds the service-role key. Without this check
  // --no-verify-jwt would leave the endpoint open to anyone who found the URL —
  // harmless in effect (it only flushes a queue) but a free way to burn quota.
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await drain();
    return Response.json(result);
  } catch (error) {
    console.error('send-push failed', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
