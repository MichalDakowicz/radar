-- Radar — streaming expirations: "leaving soon" catalogue, shared by every user.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste the whole file
-- → Run. Run schema.sql and notifications.sql FIRST. Idempotent on the same
-- terms as those: `if not exists`, `create or replace`, guarded do-blocks only.
--
-- WHY A SHARED TABLE. The upstream (Streaming Availability API, movieofthenight)
-- is metered per request, and its useful endpoint — /changes?change_type=expiring
-- — is per *catalogue*, not per title. One sync of Poland is 8 requests and
-- covers every Polish user's whole watchlist; asking it per title would be one
-- request per title per user and would burn the quota inside a day. So nothing
-- client-side ever talks to that API. The `sync-expirations` edge function pulls
-- the catalogue on a schedule into this table, and the app only ever reads here.
--
-- Rows are public knowledge (what leaves Netflix PL on the 30th is not anyone's
-- private data), so the table is world-readable and service-role-writable. The
-- personalisation — your watchlist, your services — happens in the join, not in
-- the storage.
--
-- Like push, the sync needs things that are NOT in this file: see "MANUAL SETUP"
-- at the bottom for the Vault secret, the extensions and the deployed function.
-- Without them this table simply stays empty and every surface degrades to an
-- empty state.

-- ============================================================================
-- TABLE
-- ============================================================================

create table if not exists public.streaming_expirations (
  country      text    not null,
  -- Upstream service id (`netflix`, `hbo`, `prime`, `skyshowtime`…). Kept for
  -- debugging and for re-querying upstream; the app matches on service_name.
  service      text    not null,
  -- The same service under the app's normalized name ('Prime Video', 'Max'),
  -- so user_settings.owned_services can be compared without a mapping table.
  -- lib/services.ts owns the mapping; the edge function applies it on write.
  service_name text    not null,
  tmdb_id      integer not null,
  media_type   text    not null check (media_type in ('movie', 'tv')),
  -- Last day the title is watchable. The upstream sends a unix timestamp; only
  -- the date half is meaningful, and a date is what every surface buckets by.
  expires_on   date    not null,
  title        text    not null,
  poster_url   text,
  release_year integer,
  -- Deep link into the service, straight from upstream. Nullable: not every
  -- change carries one.
  link         text,
  -- Stamped on every upsert. The sync deletes anything it did NOT restamp, which
  -- is how a cancelled expiry (title renewed, stays on the service) disappears
  -- instead of haunting the calendar until its date passes.
  synced_at    timestamptz not null default now(),
  primary key (country, service, media_type, tmdb_id)
);

-- The calendar and the discovery rail both scan one country's near future.
create index if not exists streaming_expirations_country_date_idx
  on public.streaming_expirations (country, expires_on);

-- The watchlist join goes the other way: given titles I track, what is leaving.
create index if not exists streaming_expirations_title_idx
  on public.streaming_expirations (tmdb_id, media_type);

comment on table public.streaming_expirations is
  'Shared catalogue of titles leaving streaming services, by country. Written only by the sync-expirations edge function.';

-- ============================================================================
-- RLS — everyone reads, only the service role writes
-- ============================================================================

alter table public.streaming_expirations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'streaming_expirations'
       and policyname = 'expirations_read_all'
  ) then
    -- anon included on purpose: the public shelf renders the same rails.
    create policy expirations_read_all
      on public.streaming_expirations
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- No insert/update/delete policy exists, so PostgREST refuses writes for anon
-- and authenticated. The service role bypasses RLS and is the only writer.

-- ============================================================================
-- PREFERENCES — extra columns on user_settings, so the client keeps one hook
-- ============================================================================

alter table public.user_settings
  -- "Something in your watchlist is about to leave a service you pay for."
  add column if not exists notify_leaving           boolean not null default true,
  -- How many days of warning. 3 is the useful default: enough time to actually
  -- watch a film on a weeknight, short enough that it is still urgent.
  add column if not exists notify_leaving_lead_days integer not null default 3;

-- ============================================================================
-- NOTIFICATION KIND
-- ============================================================================

alter type public.notification_kind add value if not exists 'leaving_soon';

-- notification_allowed() in notifications.sql switches on the kind and defaults
-- unknown kinds to notify_enabled alone, which would ignore notify_leaving.
-- Re-declared here so this file is self-sufficient; the body is the original
-- plus the one new branch.
--
-- Switched on `p_kind::text`, not on the enum. A `language sql` body is parsed
-- and its literals resolved when the function is CREATED, so an enum literal
-- here would be resolved in the same transaction as the ADD VALUE above and
-- Postgres refuses that outright:
--
--   55P04: unsafe use of new value "leaving_soon" of enum type
--   HINT: New enum values must be committed before they can be used.
--
-- Comparing text to text never looks the value up, so the whole file still runs
-- as one script. (The plpgsql generator below can keep using the enum: a plpgsql
-- body is only syntax-checked at creation and resolves its literals when it
-- actually runs, which is a later transaction.)
create or replace function private.notification_allowed(
  p_user uuid,
  p_kind public.notification_kind
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select s.notify_enabled and case p_kind::text
           when 'friend_request'  then s.notify_friend_requests
           when 'friend_accepted' then s.notify_friend_requests
           when 'friend_activity' then s.notify_friend_activity <> 'none'
           when 'reaction'        then s.notify_social
           when 'comment'         then s.notify_social
           when 'release'         then s.notify_releases
           when 'release_soon'    then s.notify_releases
           when 'streak_risk'     then s.notify_streaks
           when 'nudge'           then s.notify_nudges
           when 'leaving_soon'    then s.notify_leaving
           else true
         end
    from public.user_settings s
   where s.user_id = p_user;
$$;

-- ============================================================================
-- GENERATOR — clock-driven, run hourly by pg_cron alongside the others
-- ============================================================================

/**
 * "Kill Bill leaves Netflix in 3 days." Fires at 09:00 local for a title that is
 * in the user's watchlist (or already started), on a service they told us they
 * subscribe to, in their region, on the lead day or on the last day itself.
 *
 * Scoped to owned_services deliberately: a film leaving a service you do not pay
 * for is not news. A user with no services configured gets nothing rather than
 * everything — the alternative is a daily firehose about HBO Max they cannot use.
 */
create or replace function private.generate_leaving_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r    record;
  sent int := 0;
  days int;
begin
  for r in
    select m.id, m.user_id, m.title, m.type, m.tmdb_id, m.cover_url,
           e.service_name, e.expires_on,
           private.local_date(s.timezone) as today
      from public.movies m
      join public.user_settings s
        on s.user_id = m.user_id
      join public.streaming_expirations e
        on e.tmdb_id    = m.tmdb_id
       and e.media_type = m.type
       and e.country    = s.watch_provider_country
     where s.notify_enabled
       and s.notify_leaving
       and (m.in_watchlist or m.in_progress)
       and not m.watched
       and m.tmdb_id is not null
       and e.service_name = any (s.owned_services)
       and private.local_hour(s.timezone) = 9
       and e.expires_on in (
             private.local_date(s.timezone),
             private.local_date(s.timezone) + s.notify_leaving_lead_days
           )
  loop
    days := r.expires_on - r.today;
    -- Dedupe on the date as well as the title: the lead-day warning and the
    -- last-day warning are two different, both-wanted notifications, and a date
    -- that moves upstream should be allowed to warn again.
    if private.enqueue_notification(
      r.user_id,
      'leaving_soon'::public.notification_kind,
      r.title,
      case
        when days <= 0 then 'leaves ' || r.service_name || ' today — last chance'
        when days = 1  then 'leaves ' || r.service_name || ' tomorrow'
        else 'leaves ' || r.service_name || ' in ' || days::text || ' days'
      end,
      'leaving:' || r.id::text || ':' || r.service_name || ':' || r.expires_on::text,
      jsonb_build_object(
        'movieId', r.id, 'tmdbId', r.tmdb_id, 'mediaType', r.type,
        'movieTitle', r.title, 'coverUrl', r.cover_url,
        'service', r.service_name, 'expiresOn', r.expires_on
      )
    ) is not null then
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end $$;

/**
 * Drop expirations whose day has passed. The sync itself removes cancelled and
 * re-dated rows; this only clears the ones that simply happened. A week of grace
 * so "left last Tuesday" can still be shown before it is forgotten.
 */
create or replace function private.prune_streaming_expirations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  delete from public.streaming_expirations
   where expires_on < current_date - 7;
  get diagnostics n = row_count;
  return n;
end $$;

-- ============================================================================
-- SCHEDULES — guarded, so this file runs with or without pg_cron
-- ============================================================================

do $$
declare
  post_fn  text;
  base_url text;
  secret   text;
begin
  if not private.function_exists('cron', 'schedule') then
    raise warning 'pg_cron not installed - no schedules created. Run: create extension if not exists pg_cron;';
    return;
  end if;

  -- The generator rides the same hourly tick as the other clock-driven ones; it
  -- self-limits to 09:00 local per user.
  perform cron.unschedule('radar-generate-leaving') where exists (
    select 1 from cron.job where jobname = 'radar-generate-leaving');
  perform cron.schedule('radar-generate-leaving', '10 * * * *',
    $job$ select private.generate_leaving_notifications(); $job$);

  perform cron.unschedule('radar-prune-expirations') where exists (
    select 1 from cron.job where jobname = 'radar-prune-expirations');
  perform cron.schedule('radar-prune-expirations', '30 4 * * *',
    $job$ select private.prune_streaming_expirations(); $job$);

  -- The catalogue sync is an HTTP call out to the edge function, so it needs
  -- pg_net and the same Vault secrets the push drain uses.
  post_fn := case
    when private.function_exists('net', 'http_post')        then 'net.http_post'
    when private.function_exists('extensions', 'http_post') then 'extensions.http_post'
    else null
  end;

  if post_fn is null then
    raise warning 'pg_net not installed - expirations will never sync. Run: create extension if not exists pg_net;';
    return;
  end if;

  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'radar_functions_url';
  select decrypted_secret into secret   from vault.decrypted_secrets where name = 'radar_push_secret';

  if base_url is null or secret is null then
    raise warning 'vault secrets radar_functions_url / radar_push_secret missing - expirations will never sync.';
    return;
  end if;

  -- Twice weekly, Monday and Thursday at 03:00 UTC. Measured cost is 8 upstream
  -- requests per sync for Poland and 32 for the US; daily for both would be
  -- ~1200/month against a 1000/month quota, twice-weekly is ~320. Expiry dates
  -- are published weeks ahead, so a three-day-stale catalogue loses nothing.
  perform cron.unschedule('radar-sync-expirations') where exists (
    select 1 from cron.job where jobname = 'radar-sync-expirations');
  perform cron.schedule('radar-sync-expirations', '0 3 * * 1,4', format(
    $job$ select %s(
            url     := %L,
            headers := jsonb_build_object(
                         'Content-Type',  'application/json',
                         'Authorization', %L),
            body    := '{}'::jsonb
          ); $job$,
    post_fn,
    rtrim(base_url, '/') || '/sync-expirations',
    'Bearer ' || secret));
end $$;

-- ============================================================================
-- MANUAL SETUP
-- ============================================================================
--
-- 1. Extensions (once per project, same ones push already needs):
--      create extension if not exists pg_cron;
--      create extension if not exists pg_net;
--
-- 2. Vault secrets. radar_functions_url and radar_push_secret are shared with
--    the push drain — if push already works, they are set. Otherwise see the
--    MANUAL SETUP block in notifications.sql.
--
-- 3. The upstream API key, as an edge-function secret (NOT in Vault, NOT in the
--    repo). Get a key from https://developers.movieofthenight.com — the free
--    tier's 1000 requests/month covers the schedule above for ~3 countries:
--      npx supabase secrets set MOTN_API_KEY=<key> --project-ref <ref>
--
-- 4. Deploy the function:
--      npx supabase functions deploy sync-expirations --no-verify-jwt --project-ref <ref>
--
-- 5. Prime the table without waiting for Monday:
--      select net.http_post(
--        url     := '<functions url>/sync-expirations',
--        headers := jsonb_build_object('Content-Type','application/json',
--                                      'Authorization','Bearer <radar_push_secret>'),
--        body    := '{}'::jsonb);
--
-- Health check:
--   select country, count(*), min(expires_on), max(expires_on), max(synced_at)
--     from public.streaming_expirations group by country;
