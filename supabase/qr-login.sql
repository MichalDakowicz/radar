-- Radar — QR login: the pairing row behind signing a signed-out device in from a
-- signed-in one (PING.md §9.14, docs/qr-login.md).
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste the whole file
-- → Run. Run schema.sql first. Idempotent on the same terms as schema.sql:
-- `if not exists` only. Re-running never drops a table, a column, or a row.
--
-- The table is a workbench for the `qr-login` edge function and nothing else.
-- Row Level Security is on and there are deliberately NO policies, and every
-- grant is revoked from the client roles: neither the anon key nor a signed-in
-- user can read or write a row. It holds a one-time sign-in token between the
-- moment it is approved and the moment the right device collects it, so the only
-- way in is the function, which checks who is asking.
--
-- The function is deployed separately — see the header of
-- supabase/functions/qr-login/index.ts.
--
-- A sibling app never touches this table, and never needs to: it calls the
-- function. It is Radar's for the same reason profiles and friendships are.

create table if not exists public.qr_logins (
  id                uuid primary key default gen_random_uuid(),

  -- Who shows the code. 'web': the signed-out side does, a signed-in phone scans
  -- it. 'phone': the signed-in side does, a signed-out device scans it.
  mode              text not null check (mode in ('web', 'phone')),

  state             text not null default 'pending'
                      check (state in ('pending', 'claimed', 'approved', 'denied', 'consumed')),

  -- Two digits both screens show, so a person can tell a pairing they started
  -- from one they were handed. Not a secret.
  match_code        text not null check (match_code ~ '^[0-9]{2}$'),

  -- The signed-in side, and the only one who may approve. Set at the scan ('web')
  -- or at the offer ('phone').
  user_id           uuid references auth.users(id) on delete cascade,

  -- SHA-256, as lower-case hex, of the verifier the signed-out side keeps and
  -- never sends until it collects. Whoever can produce the verifier gets the token.
  challenge         text check (challenge ~ '^[0-9a-f]{64}$'),

  -- SHA-256 of the secret in a 'phone' code. The secret itself is never stored.
  nonce_hash        text check (nonce_hash ~ '^[0-9a-f]{64}$'),

  -- What the requesting device calls itself. It chose the string, so the approving
  -- screen shows it as a claim.
  requester_label   text check (char_length(requester_label) <= 120),

  -- Two letters, from the connection the function saw (the CDN's country header).
  -- The one fact about the requester that was observed rather than told.
  requester_country text check (requester_country ~ '^[A-Z]{2}$'),

  -- The connection that started the code, hashed with a server secret. For rate
  -- limiting. Never an address, and not reversible without the secret.
  requester_ip_hash text,

  -- The one-time token: written at approval, erased the instant it is collected.
  token_hash        text,

  created_at        timestamptz not null default now(),

  -- Moved forward as the pairing progresses, but never past created_at + 5 minutes.
  expires_at        timestamptz not null
);

-- Counting what one connection started in the last minute.
create index if not exists qr_logins_ip_created_idx
  on public.qr_logins (requester_ip_hash, created_at);

-- The function sweeps finished pairings on each new code; this keeps that cheap.
create index if not exists qr_logins_expires_idx
  on public.qr_logins (expires_at);

alter table public.qr_logins enable row level security;

-- No policies on purpose. Revoking as well means a policy added by mistake later
-- still cannot hand a token to a client role.
revoke all on public.qr_logins from anon, authenticated;
