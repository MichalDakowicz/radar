-- Radar — notification test bench. NOT part of the schema; nothing here is run
-- by the app.
--
-- DO NOT RUN THE WHOLE FILE. Paste one numbered block at a time into the
-- Supabase SQL editor — the editor runs a whole script as a single transaction,
-- so a top-to-bottom run seeds section 4 and cleans it up in section 9 before
-- you ever see it. Section 1 first, then whichever section you want.
--
-- Everything writes through the same security-definer path the real system uses
-- (private.enqueue_notification), so preferences, quiet hours, dedupe and the
-- push drain all apply exactly as they would in production. That is the point:
-- a test that bypasses the gate proves nothing about the gate.
--
-- Every seeded row carries dedupe_key prefixed 'test:', so section 9 can delete
-- the lot without touching a real notification.
--
-- Replace the email in section 1 once; the rest reads it back out.

-- ============================================================================
-- 1. WHO — set the account under test
-- ============================================================================
-- Everything below resolves the user through this view, so there is one place
-- to edit. A view rather than a psql \set because the dashboard editor has no
-- variables.

create or replace view public.zz_test_user as
  select id as user_id, email
    from auth.users
   where email = '';   -- <<< EDIT ME

-- It lives in `public`, so PostgREST would otherwise serve it — and it reads
-- auth.users with the owner's rights. Locked to the roles that already have
-- superuser-equivalent access; section 9 drops it.
revoke all on public.zz_test_user from public, anon, authenticated;

select u.user_id, u.email,
       (select count(*) from public.device_tokens d where d.user_id = u.user_id) as devices,
       (select count(*) from public.notifications n where n.user_id = u.user_id) as notifications
  from public.zz_test_user u;

-- Zero devices means the app never registered a push token: nothing will ever
-- get a banner, however healthy the rest of this file looks. Open the app,
-- accept the permission prompt, and re-check.

-- ============================================================================
-- 2. HEALTH — is the plumbing there at all
-- ============================================================================

select * from public.notification_setup_status();

-- Cron jobs and their last run. 'radar-push-drain' should show a run within the
-- last minute; a job that exists but never runs means pg_cron is installed in a
-- database the scheduler is not attached to.
select j.jobname, j.schedule, j.active,
       r.status, r.return_message, r.start_time
  from cron.job j
  left join lateral (
    select status, return_message, start_time
      from cron.job_run_details d
     where d.jobid = j.jobid
     order by start_time desc limit 1
  ) r on true
 where j.jobname like 'radar-%'
 order by j.jobname;

-- What the edge function actually answered, newest first. 200 with a JSON body
-- is success; 401 names the secret it compared against; 404 means the function
-- is not deployed under that name.
select id, status_code, left(content, 400) as content, created
  from net._http_response
 order by created desc
 limit 5;

-- ============================================================================
-- 3. PREFERENCES — see and set what the account will accept
-- ============================================================================

select s.notify_enabled, s.notify_friend_requests, s.notify_friend_activity,
       s.notify_social, s.notify_releases, s.notify_release_lead_days,
       s.notify_streaks, s.notify_nudges,
       s.notify_quiet_start, s.notify_quiet_end, s.timezone,
       s.current_streak, s.streak_updated_at,
       private.local_hour(s.timezone) as local_hour,
       private.in_quiet_hours(s.notify_quiet_start, s.notify_quiet_end, s.timezone) as quiet_now
  from public.user_settings s
  join public.zz_test_user u on u.user_id = s.user_id;

-- quiet_now = true is the single most common reason an inbox row never becomes
-- a banner: pending_push_notifications() filters those rows out entirely and
-- picks them up after the window closes. To test push right now, open the gate:
--
-- update public.user_settings s set notify_quiet_start = 0, notify_quiet_end = 0
--   from public.zz_test_user u where u.user_id = s.user_id;
--
-- Equal bounds mean "no quiet hours". Section 9 restores 23 → 8.

-- ============================================================================
-- 4. SEED — one notification of every kind
-- ============================================================================
-- The full sweep: nine rows, one per enum value, each with a data payload
-- shaped like the real producer's so tap-routing and the poster thumbnail are
-- exercised too. Any kind the account has switched off is silently skipped —
-- enqueue_notification returns null — which is itself a useful signal, so the
-- result set reports written vs blocked per kind.

do $test$
declare
  me     uuid;
  actor  uuid;
  pick   record;
  stamp  text := to_char(now(), 'HH24MISS');   -- unique per run, so re-seeding works
begin
  select user_id into me from public.zz_test_user;
  if me is null then raise exception 'No user matched — edit section 1'; end if;

  -- A real friend to attribute the social rows to; falls back to self, which
  -- still renders (the trigger path would never do this, the seed may).
  select f.friend_id into actor from public.friendships f where f.user_id = me limit 1;
  actor := coalesce(actor, me);

  -- A real title out of the account's own library, so the poster loads and the
  -- tap lands on a page that exists.
  select m.id, m.tmdb_id, m.title, m.type, m.cover_url into pick
    from public.movies m
   where m.user_id = me and m.tmdb_id is not null
   order by m.in_progress desc, m.added_at desc
   limit 1;

  perform private.enqueue_notification(me, 'friend_request',
    private.actor_name(actor), 'wants to be friends',
    'test:friend_request:' || stamp,
    jsonb_build_object('requestId', actor), actor);

  perform private.enqueue_notification(me, 'friend_accepted',
    private.actor_name(actor), 'accepted your friend request',
    'test:friend_accepted:' || stamp,
    jsonb_build_object('friendId', actor), actor);

  perform private.enqueue_notification(me, 'friend_activity',
    private.actor_name(actor),
    'finished ' || coalesce(pick.title, 'something'),
    'test:friend_activity:' || stamp,
    jsonb_build_object('movieTitle', pick.title, 'tmdbId', pick.tmdb_id,
                       'mediaType', pick.type, 'coverUrl', pick.cover_url),
    actor);

  perform private.enqueue_notification(me, 'reaction',
    private.actor_name(actor),
    'reacted 🔥 to ' || coalesce(pick.title, 'your activity'),
    'test:reaction:' || stamp,
    jsonb_build_object('movieTitle', pick.title, 'reaction', 'fire'), actor);

  perform private.enqueue_notification(me, 'comment',
    private.actor_name(actor),
    'commented: this one is genuinely great',
    'test:comment:' || stamp,
    jsonb_build_object('movieTitle', pick.title), actor);

  perform private.enqueue_notification(me, 'release',
    coalesce(pick.title, 'Something'),
    case when pick.type = 'tv' then 'premieres today' else 'is out today' end,
    'test:release:' || stamp,
    jsonb_build_object('movieId', pick.id, 'tmdbId', pick.tmdb_id,
                       'mediaType', pick.type, 'movieTitle', pick.title,
                       'coverUrl', pick.cover_url, 'releaseDate', current_date));

  perform private.enqueue_notification(me, 'release_soon',
    coalesce(pick.title, 'Something'), 'lands tomorrow',
    'test:release_soon:' || stamp,
    jsonb_build_object('movieId', pick.id, 'tmdbId', pick.tmdb_id,
                       'mediaType', pick.type, 'movieTitle', pick.title,
                       'coverUrl', pick.cover_url,
                       'releaseDate', current_date + 1));

  perform private.enqueue_notification(me, 'streak_risk',
    '7-day streak on the line', 'Log something before midnight to keep it alive',
    'test:streak_risk:' || stamp,
    jsonb_build_object('streak', 7));

  perform private.enqueue_notification(me, 'nudge',
    'Still on ' || coalesce(pick.title, 'something') || '?',
    'Pick it back up where you left off',
    'test:nudge:' || stamp,
    jsonb_build_object('movieId', pick.id, 'tmdbId', pick.tmdb_id,
                       'mediaType', pick.type, 'movieTitle', pick.title,
                       'coverUrl', pick.cover_url));
end $test$;

-- Written vs blocked, one line per kind — the answer to "why is that one kind
-- missing". allowed = false is a preference, not a bug: notification_allowed()
-- refused it and enqueue_notification returned null. Section 3 shows which
-- switch, and note that 'friend_request' and 'friend_accepted' share one
-- (notify_friend_requests), while friend_request rows never appear in the inbox
-- list at all — the screen renders those as accept/decline cards instead.
select k.kind,
       private.notification_allowed(u.user_id, k.kind) as allowed,
       count(n.id)                                     as seeded
  from public.zz_test_user u
 cross join unnest(enum_range(null::public.notification_kind)) as k(kind)
  left join public.notifications n
    on n.user_id = u.user_id and n.kind = k.kind and n.dedupe_key like 'test:%'
 group by k.kind, u.user_id
 order by k.kind;

-- The rows themselves, newest first.
select n.kind, n.title, n.body, n.data, n.pushed_at, n.created_at
  from public.notifications n
  join public.zz_test_user u on u.user_id = n.user_id
 where n.dedupe_key like 'test:%'
 order by n.created_at desc;

-- ============================================================================
-- 5. ONE AT A TIME — a single kind, for checking copy or a channel
-- ============================================================================
-- Nine banners at once tells you delivery works but nothing about which channel
-- each landed on. Fire one, watch the phone, repeat. Edit the kind and text.

do $test$
declare me uuid;
begin
  select user_id into me from public.zz_test_user;
  perform private.enqueue_notification(
    me,
    'streak_risk',                                    -- <<< kind
    '3-day streak on the line',                       -- <<< title
    'Log something before midnight to keep it alive', -- <<< body
    'test:single:' || to_char(clock_timestamp(), 'HH24MISSMS'),
    '{}'::jsonb
  );
end $test$;

-- Android channel per kind (mirrors src/lib/notificationChannels.ts and the map
-- in the edge function) — social / releases / streaks / nudges. Long-press a
-- banner on the device to see which one it actually used.

-- ============================================================================
-- 6. GENERATORS — run the clock-driven ones out of hours
-- ============================================================================
-- Releases fire at 09:00 local, streaks at 20:00, nudges at 19:00, each read
-- from the user's own `timezone`. Rather than wait, borrow a timezone where it
-- is that hour right now, run the generator, then put the real one back. The
-- generator is unchanged — only the clock it reads moves.
--
-- Also loosens the other preconditions the generator checks, so it has
-- something to find. Read each block before running it: it edits real rows.

-- 6a. RELEASES — needs a watchlist title whose release_date is today (or today
--     + notify_release_lead_days). Moves the newest watchlist title's date to
--     today, generates, then restores it.
do $test$
declare
  me      uuid;
  real_tz text;
  fake_tz text;
  target  uuid;
  real_dt date;
  made    int;
begin
  select user_id into me from public.zz_test_user;
  select timezone into real_tz from public.user_settings where user_id = me;

  select name into fake_tz from pg_timezone_names
   where extract(hour from now() at time zone name) = 9
     and name like '%/%' limit 1;
  if fake_tz is null then raise exception 'No timezone currently reads 09:00'; end if;

  select id, release_date into target, real_dt
    from public.movies
   where user_id = me and in_watchlist
   order by added_at desc limit 1;
  if target is null then raise exception 'No watchlist title to release'; end if;

  update public.movies set release_date = (now() at time zone fake_tz)::date
   where id = target;
  update public.user_settings set timezone = fake_tz where user_id = me;

  made := private.generate_release_notifications();

  update public.user_settings set timezone = real_tz where user_id = me;
  update public.movies set release_date = real_dt where id = target;

  raise warning 'release generator wrote % row(s) using tz %', made, fake_tz;
end $test$;

-- 6b. STREAKS — needs current_streak >= 2, a snapshot under 36h old, and
--     nothing logged today. Fakes the first two; if you have logged something
--     today it will correctly write nothing, which is the rule working.
do $test$
declare
  me uuid; real_tz text; fake_tz text; real_streak int; real_at timestamptz; made int;
begin
  select user_id into me from public.zz_test_user;
  select timezone, current_streak, streak_updated_at
    into real_tz, real_streak, real_at
    from public.user_settings where user_id = me;

  select name into fake_tz from pg_timezone_names
   where extract(hour from now() at time zone name) = 20 and name like '%/%' limit 1;

  update public.user_settings
     set timezone = fake_tz, current_streak = greatest(real_streak, 5),
         streak_updated_at = now()
   where user_id = me;

  made := private.generate_streak_notifications();

  update public.user_settings
     set timezone = real_tz, current_streak = real_streak, streak_updated_at = real_at
   where user_id = me;

  raise warning 'streak generator wrote % row(s)', made;
end $test$;

-- 6c. NUDGES — needs no completed/rating/started activity in three days, and a
--     watchlist or in-progress title to recommend. Deduped to one per ISO week,
--     so a second run in the same week writes nothing by design; delete the
--     'nudge:%' row first to re-test.
do $test$
declare me uuid; real_tz text; fake_tz text; made int;
begin
  select user_id into me from public.zz_test_user;
  select timezone into real_tz from public.user_settings where user_id = me;

  select name into fake_tz from pg_timezone_names
   where extract(hour from now() at time zone name) = 19 and name like '%/%' limit 1;

  update public.user_settings set timezone = fake_tz where user_id = me;
  made := private.generate_nudge_notifications();
  update public.user_settings set timezone = real_tz where user_id = me;

  raise warning 'nudge generator wrote % row(s) (0 = logged something in the last 3 days, or already nudged this week)', made;
end $test$;

-- Re-arm the weekly nudge:
-- delete from public.notifications n using public.zz_test_user u
--  where n.user_id = u.user_id and n.dedupe_key like 'nudge:%';

-- ============================================================================
-- 7. TRIGGERS — the social path, end to end
-- ============================================================================
-- These insert into the real tables and let the triggers do the writing, which
-- is the only way to test the trigger logic itself (scope filtering, the daily
-- per-actor cap, self-suppression). Needs a second account.

-- 7a. Friend request → notifies the recipient. Swap the emails.
-- insert into public.friend_requests (sender_id, recipient_id)
-- select a.id, b.id from auth.users a, auth.users b
--  where a.email = 'sender@example.com' and b.email = 'recipient@example.com'
-- on conflict do nothing;

-- 7b. Friend activity → fans out to friends. Inserted as the *friend*, so the
--     test account receives it. Respects the recipient's notify_friend_activity
--     scope: on 'collection' nothing is written unless the recipient owns a
--     title with the same tmdb_id, and after 5 rows from one actor in 24h the
--     cap kicks in and further inserts are dropped.
-- insert into public.activity (user_id, movie_id, movie_title, media_type, type)
-- select f.friend_id, m.id, m.title, m.type, 'completed'
--   from public.zz_test_user u
--   join public.friendships f on f.user_id = u.user_id
--   join public.movies m on m.user_id = f.friend_id
--  limit 1;

-- 7c. Reaction → notifies the activity's owner. Reacting to your own row is
--     suppressed, so this must run as someone else.
-- insert into public.activity_reactions (activity_id, user_id, kind)
-- select a.id, f.friend_id, 'fire'
--   from public.zz_test_user u
--   join public.activity a on a.user_id = u.user_id
--   join public.friendships f on f.user_id = u.user_id
--  order by a.created_at desc limit 1;

-- 7d. Accept → notifies whoever *sent* the request, not whoever tapped Accept.
--     So the test account has to be the sender for the row to land in the inbox
--     you are watching. Mirrors accept_friend_request() by hand because the RPC
--     reads auth.uid(), which the SQL editor has none of — the trigger under
--     test is untouched. Destructive: drops the pair's existing friendship rows
--     and re-inserts both, so run it on a friend you can afford to re-add.
-- do $test$
-- declare me uuid; other uuid;
-- begin
--   select user_id into me from public.zz_test_user;
--   select id into other from auth.users where email = 'friend@example.com';  -- <<< EDIT
--   if other is null then raise exception 'No such account'; end if;
--
--   delete from public.friendships where (user_id, friend_id) in ((me, other), (other, me));
--   delete from public.friend_requests where sender_id = me and recipient_id = other;
--   insert into public.friend_requests (sender_id, recipient_id) values (me, other);
--
--   update public.friend_requests set status = 'accepted'
--    where sender_id = me and recipient_id = other;
--   -- Accepter's own row first, then the sender's — the second one is the news,
--   -- and private.on_friendship only speaks for that one.
--   insert into public.friendships (user_id, friend_id) values (other, me) on conflict do nothing;
--   insert into public.friendships (user_id, friend_id) values (me, other) on conflict do nothing;
-- end $test$;

-- Trigger present and enabled? 'O' is enabled; a missing row means
-- notifications.sql has not been run against this database.
select c.relname as table_name, t.tgname, t.tgenabled
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal and t.tgname like 'notify_on_%'
 order by c.relname, t.tgname;

-- Did the cap bite? Five per actor per 24h is private.friend_activity_cap().
select n.actor_id, count(*) as rows_24h
  from public.notifications n
  join public.zz_test_user u on u.user_id = n.user_id
 where n.kind = 'friend_activity' and n.created_at > now() - interval '24 hours'
 group by n.actor_id;

-- ============================================================================
-- 8. PUSH — what the drain sees, and forcing one
-- ============================================================================

-- Exactly what the edge function would receive on its next call. Empty while
-- rows exist and are unpushed = quiet hours, no device token, or the row is
-- over 24h old.
select * from public.pending_push_notifications(50);

-- Why a specific row is not in that list:
select n.id, n.kind, n.title,
       n.pushed_at is not null                     as already_pushed,
       n.created_at < now() - interval '24 hours'  as aged_out,
       private.in_quiet_hours(s.notify_quiet_start, s.notify_quiet_end, s.timezone) as quiet,
       exists (select 1 from public.device_tokens d where d.user_id = n.user_id)    as has_device
  from public.notifications n
  join public.user_settings s on s.user_id = n.user_id
  join public.zz_test_user u on u.user_id = n.user_id
 order by n.created_at desc limit 20;

-- Force a drain instead of waiting for the minute cron. Uses the same Vault
-- secrets the scheduled job does, so a 401 here is the same 401 it gets. Read
-- the answer from net._http_response in section 2 a second or two later.
do $test$
declare base text; key text; post_fn text;
begin
  post_fn := case when private.function_exists('net','http_post') then 'net.http_post'
                  else 'extensions.http_post' end;
  execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 'radar_functions_url' $q$ into base;
  execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 'radar_push_secret' $q$ into key;
  if key is null then
    execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 'radar_service_role_key' $q$ into key;
  end if;
  if base is null or key is null then
    raise exception 'Vault secrets missing — see MANUAL SETUP in notifications.sql';
  end if;
  execute format(
    $job$ select %s(
      url     := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
      body    := '{}'::jsonb,
      timeout_milliseconds := 20000
    ); $job$, post_fn, base || '/send-push', key);
end $test$;

-- Delivery scoreboard.
select n.kind, n.title,
       n.pushed_at is not null as pushed,
       n.read_at   is not null as read,
       n.created_at
  from public.notifications n
  join public.zz_test_user u on u.user_id = n.user_id
 order by n.created_at desc limit 20;

-- pushed_at filling in with no banner on the phone means Expo accepted the
-- message and Android dropped it: battery optimisation, a channel the user
-- turned off in system settings, or a stale token. Check the token is the one
-- the running app holds:
select token, platform, updated_at from public.device_tokens d
  join public.zz_test_user u on u.user_id = d.user_id;

-- ============================================================================
-- 9. CLEANUP
-- ============================================================================

-- Commented on purpose. Running this file top to bottom in one go would seed
-- section 4 and delete it again here, in the same transaction — nine rows in,
-- nine rows out, an empty inbox and no clue why. Uncomment when you actually
-- mean to clean up.

-- Seeded rows only. Real notifications keep their own dedupe prefixes.
-- delete from public.notifications n using public.zz_test_user u
--  where n.user_id = u.user_id and n.dedupe_key like 'test:%';

-- Restore the default quiet window if section 3 opened it.
-- update public.user_settings s set notify_quiet_start = 23, notify_quiet_end = 8
--   from public.zz_test_user u where u.user_id = s.user_id;

-- Everything for this account, seeded or not. Destructive — the inbox is gone.
-- delete from public.notifications n using public.zz_test_user u
--  where n.user_id = u.user_id;

-- Drops the section 1 view. Everything above needs it, so leave it until last.
-- drop view if exists public.zz_test_user;
