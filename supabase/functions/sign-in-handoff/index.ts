// sign-in-handoff — lets one Ping app sign a sibling in on the same phone.
//
// The app that is already signed in calls this with its own session. It gets
// back a one-time token for the same account, which it hands to the sibling
// over an explicit Android intent; the sibling redeems it with
// `auth.verifyOtp({ token_hash, type: 'email' })` and ends up with a session of
// its own (PING.md §9.13).
//
// Why a fresh session rather than a copy of the caller's: Supabase rotates
// refresh tokens, and a refresh token reused more than ten seconds after it was
// spent revokes the whole session. Two apps holding one session would sign
// each other out on their first overlapping refresh.
//
// Deploy:
//   npx supabase functions deploy sign-in-handoff --no-verify-jwt --project-ref <ref>
//
// --no-verify-jwt because the function checks the caller itself, and more
// strictly than the gateway would: `/auth/v1/user` validates the signature *and*
// that the session behind the token still exists, so an app that has been
// signed out cannot mint — whichever key the project happens to sign with.
//
// Deliberately dependency-free, like send-push: GoTrue is reachable with fetch.

// Types only — the edge runtime's own globals (Deno.env, Deno.serve). Excluded
// from the app's tsconfig, so this specifier is never resolved by `tsc`.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

/** Injected by the edge runtime. Used for the admin generate_link call only. */
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Injected by the edge runtime. The `apikey` a user token is presented with. */
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type GoTrueUser = { id: string; email?: string | null };

/** The subset of GoTrue's generate_link response this needs. */
type GeneratedLink = { hashed_token?: string };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The caller's user, if the bearer is a live session. Null for anything else. */
async function callerOf(authorization: string): Promise<GoTrueUser | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: authorization },
  });
  if (!response.ok) return null;
  return (await response.json()) as GoTrueUser;
}

/**
 * A magic-link token for `email`. The admin endpoint only *generates* the link —
 * nothing is emailed — and the token is single-use, expiring on the project's
 * email OTP expiry.
 */
async function magicLinkToken(email: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!response.ok) {
    throw new Error(`generate_link failed: ${response.status} ${await response.text()}`);
  }
  const link = (await response.json()) as GeneratedLink;
  if (!link.hashed_token) throw new Error('generate_link returned no hashed_token');
  return link.hashed_token;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'Sign in first' });

  const user = await callerOf(authorization);
  if (!user) return json(401, { error: 'Sign in first' });

  // Every account on this project has one today — Google and email/password
  // both carry it — but a phone-only account would have nothing to mint for.
  if (!user.email) return json(422, { error: 'This account has no email to sign in with' });

  try {
    return json(200, { token_hash: await magicLinkToken(user.email) });
  } catch (error) {
    // The user id, never the email: logs are readable by anyone on the project.
    console.error(`sign-in-handoff for ${user.id}:`, error);
    return json(502, { error: 'Could not start the sign-in' });
  }
});
