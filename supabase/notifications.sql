-- Radar — notification system: inbox rows, delivery prefs, generators, push queue.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste the whole file
-- → Run. Run schema.sql FIRST; everything here hangs off its tables. Idempotent
-- on the same terms as schema.sql: `if not exists`, `create or replace`, and
-- guarded do-blocks only. Re-running never drops a table, a column, or a row.
--
-- Two halves:
--   1. An inbox. public.notifications is the durable record — the /inbox screen
--      reads it, and it is written by triggers (social events, as they happen)
--      and by pg_cron generators (releases, streaks, nudges, on a clock).
--   2. A push queue. Every row starts with pushed_at null; a pg_cron job pokes
--      the `send-push` edge function, which drains the queue through Expo's push
--      service and stamps pushed_at. Push is best-effort — a row the user never
--      got a banner for is still in their inbox.
--
-- Push needs three things that are NOT in this file, see the bottom section
-- "MANUAL SETUP" — the pg_cron/pg_net extensions, two Vault secrets, and the
-- deployed edge function. Without them the inbox still fills; only the banner
-- is missing.

-- ============================================================================
-- ENUM
-- ============================================================================

-- CREATE TYPE has no `if not exists`, so it is guarded; the ADD VALUEs after it
-- are what carry a database created by an earlier version of this file forward.
-- They are all no-ops on a fresh run, which matters: ADD VALUE inside the SQL
-- editor's transaction is only legal while nothing *uses* the new value in the
-- same transaction, and every use below is inside a function body (deferred).
do $$
begin
  if to_regtype('public.notification_kind') is null then
    create type public.notification_kind as enum (
      'friend_request','friend_accepted','friend_activity','reaction','comment',
      'release','release_soon','streak_risk','nudge'
    );
  end if;
end $$;

alter type public.notification_kind add value if not exists 'friend_request';
alter type public.notification_kind add value if not exists 'friend_accepted';
alter type public.notification_kind add value if not exists 'friend_activity';
alter type public.notification_kind add value if not exists 'reaction';
alter type public.notification_kind add value if not exists 'comment';
alter type public.notification_kind add value if not exists 'release';
alter type public.notification_kind add value if not exists 'release_soon';
alter type public.notification_kind add value if not exists 'streak_risk';
alter type public.notification_kind add value if not exists 'nudge';

-- ============================================================================
-- PREFERENCES — extra columns on user_settings, so the client keeps one hook
-- ============================================================================

alter table public.user_settings
  -- Master switch. Off means nothing is enqueued at all, so turning it back on
  -- does not dump a backlog of everything that happened while it was off.
  add column if not exists notify_enabled          boolean not null default true,
  add column if not exists notify_friend_requests  boolean not null default true,
  -- 'none' | 'collection' | 'all'. 'collection' only notifies when the title the
  -- friend touched is one you already have in your own library — the setting the
  -- feed itself cannot express, and the reason this is text and not a boolean.
  add column if not exists notify_friend_activity  text not null default 'collection',
  add column if not exists notify_social           boolean not null default true,
  add column if not exists notify_releases         boolean not null default true,
  -- Extra heads-up this many days before a release, on top of the day-of alert.
  -- 0 disables the heads-up; the day-of alert is not optional while releases are on.
  add column if not exists notify_release_lead_days int not null default 1,
  add column if not exists notify_streaks          boolean not null default true,
  add column if not exists notify_nudges           boolean not null default true,
  -- Quiet hours hold *push*, never the inbox row. Equal values mean "no quiet
  -- hours"; start > end wraps midnight (22 → 8 is the useful case).
  add column if not exists notify_quiet_start      int not null default 23,
  add column if not exists notify_quiet_end        int not null default 8,
  -- IANA zone from the device (Intl.DateTimeFormat().resolvedOptions().timeZone).
  -- Every generator below is clock-driven, and "9am" has to mean the user's 9am.
  add column if not exists timezone                text not null default 'UTC',
  -- The client owns streak maths (src/lib/stats.ts applies a weekly threshold
  -- that is not worth re-deriving in SQL), so it snapshots the answer here on
  -- every library load and the generator only decides whether to warn.
  add column if not exists current_streak          int not null default 0,
  add column if not exists streak_updated_at       timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_notify_friend_activity_check') then
    alter table public.user_settings
      add constraint user_settings_notify_friend_activity_check
      check (notify_friend_activity in ('none','collection','all'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_notify_lead_check') then
    alter table public.user_settings
      add constraint user_settings_notify_lead_check
      check (notify_release_lead_days between 0 and 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_quiet_hours_check') then
    alter table public.user_settings
      add constraint user_settings_quiet_hours_check
      check (notify_quiet_start between 0 and 23 and notify_quiet_end between 0 and 23);
  end if;
end $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- One row per device, keyed by the Expo push token rather than by user: a phone
-- handed to a second account must move its token, not accumulate one per person,
-- or the previous owner keeps getting the new owner's banners.
create table if not exists public.device_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null,
  body       text not null,
  -- Whoever caused it, when that is a person. Null for release/streak/nudge.
  actor_id   uuid references auth.users(id) on delete set null,
  -- Everything the row needs to render a poster and route on tap: movieId,
  -- tmdbId, mediaType, activityId, coverUrl. Deliberately a snapshot — a title
  -- removed from a library should not blank out the notification about it.
  data       jsonb not null default '{}',
  -- The idempotency key. Generators re-run every hour and triggers can fire
  -- twice on a retry; a stable key per real-world event is what stops a second
  -- copy. Unique per user, so two people can both be told about the same movie.
  dedupe_key text not null,
  read_at    timestamptz,
  pushed_at  timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);
-- The unread badge counts against this; partial so it stays small as history grows.
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;
-- The push drain's only query: everything not yet sent, oldest first.
create index if not exists notifications_pending_push_idx
  on public.notifications (created_at) where pushed_at is null;

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.device_tokens enable row level security;
alter table public.notifications enable row level security;

drop policy if exists device_tokens_owner_all on public.device_tokens;
create policy device_tokens_owner_all on public.device_tokens for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Read, mark read, and delete your own. No insert policy on purpose: rows are
-- written by the security-definer helper below and nowhere else, so a client
-- cannot forge a notification into someone's inbox (or its own).
drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists notifications_owner_delete on public.notifications;
create policy notifications_owner_delete on public.notifications for delete
  to authenticated using ((select auth.uid()) = user_id);

-- ============================================================================
-- ENQUEUE HELPER — the single writer
-- ============================================================================

-- Which kinds a user's preferences let through. Kept apart from the insert so
-- the generators can filter in SQL and the trigger path can ask per-recipient.
create or replace function private.notification_allowed(p_user uuid, p_kind public.notification_kind)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select s.notify_enabled and case p_kind
        when 'friend_request'  then s.notify_friend_requests
        when 'friend_accepted' then s.notify_friend_requests
        when 'friend_activity' then s.notify_friend_activity <> 'none'
        when 'reaction'        then s.notify_social
        when 'comment'         then s.notify_social
        when 'release'         then s.notify_releases
        when 'release_soon'    then s.notify_releases and s.notify_release_lead_days > 0
        when 'streak_risk'     then s.notify_streaks
        when 'nudge'           then s.notify_nudges
        else true
      end
      from public.user_settings s where s.user_id = p_user
    ),
    -- No settings row (an account predating the signup trigger): defaults are
    -- all-on, so match that rather than silently muting the user forever.
    true
  );
$$;

/**
 * Insert one inbox row, unless the user has the kind switched off or has already
 * been told. Returns the new id, or null when nothing was written — callers use
 * that to keep a count.
 */
create or replace function private.enqueue_notification(
  p_user  uuid,
  p_kind  public.notification_kind,
  p_title text,
  p_body  text,
  p_dedupe text,
  p_data  jsonb default '{}',
  p_actor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if p_user is null or not private.notification_allowed(p_user, p_kind) then
    return null;
  end if;

  insert into public.notifications (user_id, kind, title, body, actor_id, data, dedupe_key)
  values (p_user, p_kind, p_title, p_body, p_actor, coalesce(p_data, '{}'::jsonb), p_dedupe)
  on conflict (user_id, dedupe_key) do nothing
  returning id into new_id;

  return new_id;
end $$;

-- ============================================================================
-- TRIGGERS — social events, notified as they happen
-- ============================================================================

-- The display name to put in a notification body. Falls back through the same
-- chain the UI does, so a profile with no display name still reads as a person.
create or replace function private.actor_name(p_user uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(nullif(btrim(p.display_name), ''), p.username, 'Someone')
    from public.profiles p where p.id = p_user;
$$;

create or replace function private.on_friend_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'pending' then return new; end if;
  perform private.enqueue_notification(
    new.recipient_id,
    'friend_request',
    private.actor_name(new.sender_id),
    'sent you a friend request',
    -- Re-requesting after a decline must be able to notify again, and a decline
    -- deletes the row — so the key carries the request's own timestamp.
    'friend_request:' || new.sender_id::text || ':' || extract(epoch from new.created_at)::bigint::text,
    jsonb_build_object('senderId', new.sender_id),
    new.sender_id
  );
  return new;
end $$;

drop trigger if exists notify_on_friend_request on public.friend_requests;
create trigger notify_on_friend_request
  after insert on public.friend_requests
  for each row execute function private.on_friend_request();

-- accept_friend_request() writes BOTH mirrored friendship rows, so this trigger
-- fires twice per handshake and only one of the two is news. The row that means
-- "your request was accepted" is the one whose owner sent the request in the
-- first place — the accepter already knows, they just tapped Accept.
create or replace function private.on_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.friend_requests r
     where r.sender_id = new.user_id
       and r.recipient_id = new.friend_id
       and r.status = 'accepted'
  ) then
    return new;
  end if;

  perform private.enqueue_notification(
    new.user_id,
    'friend_accepted',
    private.actor_name(new.friend_id),
    'accepted your friend request',
    -- Timestamped, so unfriending and being re-added notifies again.
    'friend_accepted:' || new.friend_id::text || ':' || extract(epoch from new.created_at)::bigint::text,
    jsonb_build_object('friendId', new.friend_id),
    new.friend_id
  );
  return new;
end $$;

drop trigger if exists notify_on_friendship on public.friendships;
create trigger notify_on_friendship
  after insert on public.friendships
  for each row execute function private.on_friendship();

-- How many friend-activity notifications one friend may cause you in a day. A
-- binge-logger should not be able to bury a friend request under twenty rows.
create or replace function private.friend_activity_cap() returns int
language sql immutable set search_path = '' as $$ select 5 $$;

/**
 * Fan an activity row out to the author's friends, honouring each recipient's
 * own none/collection/all choice. 'collection' resolves against tmdb_id, not
 * movies.id — the recipient owns their *own* row for the same title.
 */
create or replace function private.on_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r          record;
  verb       text;
  poster     record;
  actor      text;
begin
  -- Library bookkeeping is not news, matching lib/socialFeed.ts isFeedWorthy.
  if new.type in ('removed','updated') then return new; end if;

  verb := case new.type
    when 'completed'          then 'finished'
    when 'rating_changed'     then 'rated ' || coalesce(new.movie_title, 'something')
    when 'started_watching'   then 'started watching'
    when 'added_to_watchlist' then 'added to their watchlist'
    else null
  end;
  -- Only the four events that read as a statement get a banner. 'added' and
  -- 'status_changed' are too ambiguous to phrase without the feed's context.
  if verb is null then return new; end if;

  select m.tmdb_id, m.cover_url, m.type into poster
    from public.movies m where m.id = new.movie_id;

  actor := private.actor_name(new.user_id);

  for r in
    select f.friend_id as recipient, s.notify_friend_activity as scope
      from public.friendships f
      join public.user_settings s on s.user_id = f.friend_id
     where f.user_id = new.user_id
       and s.notify_enabled
       and s.notify_friend_activity <> 'none'
  loop
    if r.scope = 'collection' and not exists (
      select 1 from public.movies m
       where m.user_id = r.recipient
         and poster.tmdb_id is not null
         and m.tmdb_id = poster.tmdb_id
    ) then
      continue;
    end if;

    if (
      select count(*) from public.notifications n
       where n.user_id = r.recipient
         and n.kind = 'friend_activity'
         and n.actor_id = new.user_id
         and n.created_at > now() - interval '24 hours'
    ) >= private.friend_activity_cap() then
      continue;
    end if;

    perform private.enqueue_notification(
      r.recipient,
      'friend_activity',
      actor,
      case when new.type = 'rating_changed'
           then verb
           else verb || ' ' || coalesce(new.movie_title, 'something') end,
      'activity:' || new.id::text,
      jsonb_build_object(
        'activityId', new.id,
        'movieTitle', new.movie_title,
        'tmdbId',     poster.tmdb_id,
        'mediaType',  coalesce(new.media_type::text, poster.type::text),
        'coverUrl',   poster.cover_url,
        'rating',     new.details->'rating'
      ),
      new.user_id
    );
  end loop;

  return new;
end $$;

drop trigger if exists notify_on_activity on public.activity;
create trigger notify_on_activity
  after insert on public.activity
  for each row execute function private.on_activity();

create or replace function private.on_reaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  title    text;
  glyph    text;
begin
  select a.user_id, a.movie_title into owner_id, title
    from public.activity a where a.id = new.activity_id;
  -- Reacting to your own row is not news to you.
  if owner_id is null or owner_id = new.user_id then return new; end if;

  glyph := case new.kind when 'fire' then '🔥' when 'eyes' then '👀' else '❤️' end;

  perform private.enqueue_notification(
    owner_id,
    'reaction',
    private.actor_name(new.user_id),
    'reacted ' || glyph || ' to ' || coalesce(title, 'your activity'),
    'reaction:' || new.activity_id::text || ':' || new.user_id::text || ':' || new.kind,
    jsonb_build_object('activityId', new.activity_id, 'movieTitle', title, 'reaction', new.kind),
    new.user_id
  );
  return new;
end $$;

drop trigger if exists notify_on_reaction on public.activity_reactions;
create trigger notify_on_reaction
  after insert on public.activity_reactions
  for each row execute function private.on_reaction();

create or replace function private.on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  title    text;
begin
  select a.user_id, a.movie_title into owner_id, title
    from public.activity a where a.id = new.activity_id;
  if owner_id is null or owner_id = new.user_id then return new; end if;

  perform private.enqueue_notification(
    owner_id,
    'comment',
    private.actor_name(new.user_id),
    -- The comment itself, trimmed — a "someone commented" banner makes you open
    -- the app to learn nothing.
    left(new.body, 120),
    'comment:' || new.id::text,
    jsonb_build_object('activityId', new.activity_id, 'movieTitle', title, 'commentId', new.id),
    new.user_id
  );
  return new;
end $$;

drop trigger if exists notify_on_comment on public.activity_comments;
create trigger notify_on_comment
  after insert on public.activity_comments
  for each row execute function private.on_comment();

-- ============================================================================
-- GENERATORS — clock-driven, run hourly by pg_cron
-- ============================================================================
--
-- All three are hour-gated in the user's own timezone rather than scheduled per
-- user: one hourly job scans everyone, and each row only qualifies during its
-- own local hour. Re-running the same hour is harmless (dedupe_key).

/** Hour of the day, 0-23, as it currently reads for this user. */
create or replace function private.local_hour(p_tz text)
returns int
language sql
stable
set search_path = ''
as $$
  select extract(hour from (now() at time zone coalesce(nullif(p_tz,''), 'UTC')))::int;
$$;

create or replace function private.local_date(p_tz text)
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone coalesce(nullif(p_tz,''), 'UTC'))::date;
$$;

/** The morning-of alert plus the optional heads-up N days earlier. */
create or replace function private.generate_release_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r     record;
  sent  int := 0;
  days  int;
begin
  for r in
    select m.id, m.user_id, m.title, m.type, m.tmdb_id, m.cover_url, m.release_date,
           s.notify_release_lead_days as lead,
           private.local_date(s.timezone) as today
      from public.movies m
      join public.user_settings s on s.user_id = m.user_id
     where s.notify_enabled
       and s.notify_releases
       and (m.in_watchlist or m.in_progress)
       and m.release_date is not null
       and private.local_hour(s.timezone) = 9
       and m.release_date in (
             private.local_date(s.timezone),
             private.local_date(s.timezone) + s.notify_release_lead_days
           )
  loop
    days := r.release_date - r.today;
    if private.enqueue_notification(
      r.user_id,
      case when days = 0 then 'release'::public.notification_kind
           else 'release_soon'::public.notification_kind end,
      r.title,
      case
        when days = 0 then case when r.type = 'tv' then 'premieres today' else 'is out today' end
        when days = 1 then 'lands tomorrow'
        else 'lands in ' || days::text || ' days'
      end,
      case when days = 0 then 'release:' || r.id::text
           else 'release_soon:' || r.id::text || ':' || r.release_date::text end,
      jsonb_build_object(
        'movieId', r.id, 'tmdbId', r.tmdb_id, 'mediaType', r.type,
        'movieTitle', r.title, 'coverUrl', r.cover_url, 'releaseDate', r.release_date
      )
    ) is not null then
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end $$;

/**
 * "Your streak ends tonight." Fires at 20:00 local when the client's snapshot
 * says a streak is running and nothing has been logged today. The snapshot has
 * to be recent — a week-old one describes a streak that is already long gone.
 */
create or replace function private.generate_streak_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r    record;
  sent int := 0;
begin
  for r in
    select s.user_id, s.current_streak, s.timezone, private.local_date(s.timezone) as today
      from public.user_settings s
     where s.notify_enabled
       and s.notify_streaks
       and s.current_streak >= 2
       and s.streak_updated_at is not null
       and s.streak_updated_at > now() - interval '36 hours'
       and private.local_hour(s.timezone) = 20
       and not exists (
         select 1 from public.activity a
          where a.user_id = s.user_id
            and a.type in ('completed','rating_changed','started_watching')
            and (a.created_at at time zone coalesce(nullif(s.timezone,''), 'UTC'))::date
                = private.local_date(s.timezone)
       )
  loop
    if private.enqueue_notification(
      r.user_id,
      'streak_risk',
      r.current_streak::text || '-day streak on the line',
      'Log something before midnight to keep it alive',
      'streak_risk:' || r.today::text,
      jsonb_build_object('streak', r.current_streak)
    ) is not null then
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end $$;

/**
 * The re-engagement nudge, for someone with no streak and nothing logged in
 * three days. Carries a real suggestion: something already in progress if there
 * is one, otherwise anything on the watchlist. Capped at one per ISO week by the
 * dedupe key, because a nudge that arrives daily is an unsubscribe.
 */
create or replace function private.generate_nudge_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r    record;
  pick record;
  sent int := 0;
begin
  for r in
    select s.user_id, s.timezone, private.local_date(s.timezone) as today
      from public.user_settings s
     where s.notify_enabled
       and s.notify_nudges
       and private.local_hour(s.timezone) = 19
       and not exists (
         select 1 from public.activity a
          where a.user_id = s.user_id
            and a.type in ('completed','rating_changed','started_watching')
            and a.created_at > now() - interval '3 days'
       )
  loop
    -- in_progress first: picking up where you left off beats starting cold.
    select m.id, m.title, m.type, m.tmdb_id, m.cover_url, m.in_progress into pick
      from public.movies m
     where m.user_id = r.user_id
       and (m.in_progress or m.in_watchlist)
       and not m.watched
     order by m.in_progress desc, random()
     limit 1;

    if pick.id is null then continue; end if;

    if private.enqueue_notification(
      r.user_id,
      'nudge',
      case when pick.in_progress then 'Still on ' || pick.title || '?' else 'Nothing on tonight?' end,
      case when pick.in_progress then 'Pick it back up where you left off'
           else pick.title || ' is waiting on your watchlist' end,
      'nudge:' || to_char(r.today, 'IYYY-"W"IW'),
      jsonb_build_object(
        'movieId', pick.id, 'tmdbId', pick.tmdb_id, 'mediaType', pick.type,
        'movieTitle', pick.title, 'coverUrl', pick.cover_url
      )
    ) is not null then
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end $$;

/** One call for the hourly cron job, so the schedule has a single entry point. */
create or replace function private.generate_scheduled_notifications()
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.generate_release_notifications()
       + private.generate_streak_notifications()
       + private.generate_nudge_notifications();
$$;

-- ============================================================================
-- HOUSEKEEPING
-- ============================================================================

-- An inbox is not an archive. Read rows go after a month, unread after three —
-- an unread release alert for a film that came out in spring is not news.
create or replace function private.prune_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed int;
begin
  delete from public.notifications
   where (read_at is not null and created_at < now() - interval '30 days')
      or (read_at is null     and created_at < now() - interval '90 days');
  get diagnostics removed = row_count;

  -- Expo tokens rotate; one untouched for half a year is a phone that is gone.
  delete from public.device_tokens where updated_at < now() - interval '180 days';
  return removed;
end $$;

-- ============================================================================
-- PUSH DELIVERY — quiet hours + the drain the edge function calls
-- ============================================================================

/** True while the user has asked not to be buzzed. Equal bounds mean always-on. */
create or replace function private.in_quiet_hours(p_start int, p_end int, p_tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_start = p_end then false
    -- A window that wraps midnight (23 → 8) is two ranges, not one.
    when p_start > p_end then private.local_hour(p_tz) >= p_start or private.local_hour(p_tz) < p_end
    else private.local_hour(p_tz) >= p_start and private.local_hour(p_tz) < p_end
  end;
$$;

/**
 * Everything owed a banner right now, joined to the devices to send it to.
 * Called by the `send-push` edge function through PostgREST (service role), not
 * by the app — hence security definer and an execute grant to service_role only.
 *
 * Rows held back by quiet hours simply are not returned; the next drain picks
 * them up. Anything older than a day is abandoned as a push (stamped by the
 * function's own sweep) — a banner for yesterday's nudge is worse than none.
 */
create or replace function public.pending_push_notifications(p_limit int default 200)
returns table (
  id       uuid,
  user_id  uuid,
  kind     text,
  title    text,
  body     text,
  data     jsonb,
  token    text
)
language sql
security definer
set search_path = ''
as $$
  select n.id, n.user_id, n.kind::text, n.title, n.body,
         n.data || jsonb_build_object('notificationId', n.id, 'kind', n.kind::text),
         d.token
    from public.notifications n
    join public.user_settings s on s.user_id = n.user_id
    join public.device_tokens d on d.user_id = n.user_id
   where n.pushed_at is null
     and n.created_at > now() - interval '24 hours'
     and not private.in_quiet_hours(s.notify_quiet_start, s.notify_quiet_end, s.timezone)
   order by n.created_at
   limit p_limit;
$$;
revoke all on function public.pending_push_notifications(int) from public, anon, authenticated;
grant execute on function public.pending_push_notifications(int) to service_role;

/** Stamp a batch as delivered, and give up on anything that aged out. */
create or replace function public.mark_notifications_pushed(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set pushed_at = now()
   where pushed_at is null
     and (id = any(coalesce(p_ids, '{}'::uuid[])) or created_at < now() - interval '24 hours');
$$;
revoke all on function public.mark_notifications_pushed(uuid[]) from public, anon, authenticated;
grant execute on function public.mark_notifications_pushed(uuid[]) to service_role;

/** Expo told us a token is dead (DeviceNotRegistered) — drop it. */
create or replace function public.drop_device_tokens(p_tokens text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.device_tokens where token = any(coalesce(p_tokens, '{}'::text[]));
$$;
revoke all on function public.drop_device_tokens(text[]) from public, anon, authenticated;
grant execute on function public.drop_device_tokens(text[]) to service_role;

-- ============================================================================
-- REALTIME — the inbox badge updates without a poll
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ============================================================================
-- SCHEDULES — guarded, so this file runs with or without pg_cron installed
-- ============================================================================

/**
 * Does schema.name exist as a function, whatever its arguments?
 *
 * NOT to_regproc(): that returns null for an *overloaded* name as readily as for
 * a missing one, and pg_cron ships cron.schedule in both a two-argument and a
 * three-argument form. The guard below spent a whole debugging session reporting
 * pg_cron as absent on a database where it was installed and working.
 */
create or replace function private.function_exists(p_schema text, p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = p_schema and p.proname = p_name
  );
$$;

-- `raise warning`, not `raise notice`: the Supabase SQL editor does not surface
-- notices, so a guard that bailed out looked exactly like a clean success — the
-- one failure mode this block must not have.
do $$
declare
  base    text;
  key     text;
  post_fn text;
begin
  if not private.function_exists('cron', 'schedule') then
    raise warning 'pg_cron not installed - no schedules created. Run: create extension if not exists pg_cron;';
    return;
  end if;

  -- unschedule_if_exists: cron.schedule() on an existing name updates it in
  -- recent pg_cron, but errored in older ones. Removing first works on both.
  perform cron.unschedule(jobname) from cron.job
    where jobname in ('radar-generate-notifications','radar-prune-notifications','radar-push-drain');

  perform cron.schedule('radar-generate-notifications', '5 * * * *',
    $job$ select private.generate_scheduled_notifications(); $job$);

  perform cron.schedule('radar-prune-notifications', '20 4 * * *',
    $job$ select private.prune_notifications(); $job$);

  -- The push drain needs pg_net plus two Vault secrets; without them the inbox
  -- still fills and only the banner is missing, so this half is skipped.
  --
  -- pg_net lands in `net` when installed bare and in `extensions` when installed
  -- the way the Supabase dashboard does it, and the function name is the only
  -- part that is stable. Resolve it rather than assuming one of the two.
  post_fn := case
    when private.function_exists('net', 'http_post')        then 'net.http_post'
    when private.function_exists('extensions', 'http_post') then 'extensions.http_post'
  end;

  if post_fn is null then
    raise warning 'pg_net not installed - inbox will fill but nothing will be pushed. Run: create extension if not exists pg_net;';
    return;
  end if;

  if to_regclass('vault.decrypted_secrets') is null then
    raise warning 'Supabase Vault unavailable - push drain not scheduled.';
    return;
  end if;

  execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 'radar_functions_url' $q$ into base;
  execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 'radar_service_role_key' $q$ into key;
  if base is null or key is null then
    raise warning 'Vault secrets radar_functions_url / radar_service_role_key missing - push drain not scheduled.';
    return;
  end if;

  perform cron.schedule('radar-push-drain', '* * * * *', format(
    $job$ select %s(
      url     := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
      body    := '{}'::jsonb,
      timeout_milliseconds := 20000
    ); $job$, post_fn, base || '/send-push', key));

  raise notice 'Radar notification schedules installed.';
end $$;

-- ============================================================================
-- SETUP CHECK — one query that says what is still missing
-- ============================================================================

/**
 * Every precondition push delivery has, as a readable table. Written because the
 * failure mode of the block above is silence: a missing extension skips a
 * schedule, and `select ... from cron.job` then returns no rows without saying
 * why. Run this instead of guessing.
 */
create or replace function public.notification_setup_status()
returns table (item text, ok boolean, detail text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_name  text;
  found     boolean;
  secret_ok boolean;
  pending   int;
  total     int;
  devices   int;
begin
  -- Everything here is probed dynamically. A `language sql` body would be parsed
  -- at CREATE time and fail outright on a database where cron.job does not yet
  -- exist — which is precisely the database this function has to diagnose.
  item := 'pg_cron extension';
  ok := private.function_exists('cron', 'schedule');
  detail := case when ok then 'cron.schedule' else 'run: create extension if not exists pg_cron;' end;
  return next;

  item := 'pg_net extension';
  ok := private.function_exists('net', 'http_post') or private.function_exists('extensions', 'http_post');
  detail := case
    when private.function_exists('net', 'http_post')        then 'net.http_post'
    when private.function_exists('extensions', 'http_post') then 'extensions.http_post'
    else 'run: create extension if not exists pg_net;'
  end;
  return next;

  foreach job_name in array array['radar_functions_url','radar_service_role_key'] loop
    secret_ok := false;
    if to_regclass('vault.secrets') is not null then
      execute format('select exists (select 1 from vault.secrets where name = %L)', job_name) into secret_ok;
    end if;
    item := 'vault secret ' || job_name;
    ok := secret_ok;
    detail := case when secret_ok then 'present' else 'run vault.create_secret(...) - see MANUAL SETUP' end;
    return next;
  end loop;

  foreach job_name in array array['radar-generate-notifications','radar-prune-notifications','radar-push-drain'] loop
    found := false;
    if to_regclass('cron.job') is not null then
      execute format('select exists (select 1 from cron.job where jobname = %L)', job_name) into found;
    end if;
    item := 'cron job ' || job_name;
    ok := found;
    detail := case when found then 'scheduled' else 're-run notifications.sql once the rows above are true' end;
    return next;
  end loop;

  select count(*) into devices from public.device_tokens;
  item := 'registered devices';
  ok := devices > 0;
  detail := devices::text || ' row(s) in device_tokens';
  return next;

  select count(*), count(*) filter (where pushed_at is null) into total, pending
    from public.notifications;
  item := 'notifications';
  ok := true;
  detail := total::text || ' total, ' || pending::text || ' awaiting push';
  return next;
end $$;
grant execute on function public.notification_setup_status() to authenticated, service_role;

-- ============================================================================
-- MANUAL SETUP — the four steps this file cannot do for you
-- ============================================================================
--
-- 1. FCM credentials. Expo's Android push goes through Firebase Cloud Messaging
--    v1. In the Firebase console for the project behind the app, create a
--    service account key (Project settings → Service accounts → Generate new
--    private key) and upload the JSON at
--      https://expo.dev/accounts/<account>/projects/radar/credentials
--    Also drop the app's google-services.json in the repo root and add
--    "googleServicesFile": "./google-services.json" under expo.android in
--    app.json, then re-run `npx expo prebuild -p android`.
--    Until this is done, getExpoPushTokenAsync() fails and no token is stored —
--    the app catches it and carries on with a local-notification-only inbox.
--
-- 2. Extensions, in the SQL editor:
--      create extension if not exists pg_cron;
--      create extension if not exists pg_net with schema extensions;
--
-- 3. Vault secrets, so the cron job can reach the edge function:
--      select vault.create_secret('https://<project-ref>.supabase.co/functions/v1',
--                                 'radar_functions_url');
--      select vault.create_secret('<service-role-key>', 'radar_service_role_key');
--    Then re-run this file so the schedule block picks them up.
--
-- 4. Deploy the function:
--      npx supabase functions deploy send-push --no-verify-jwt --project-ref <ref>
--
-- Check it is alive — one query, says what is still missing:
--   select * from public.notification_setup_status();
--
-- Then:
--   select * from public.notifications order by created_at desc limit 20;
--   select private.generate_scheduled_notifications();   -- force a generator run
--   select * from net._http_response order by created desc limit 5;  -- drain results
--
-- Note that steps 2 and 3 have to happen BEFORE the schedules can be created, so
-- this file needs running twice on a fresh project: once to create the tables,
-- and again after the extensions and secrets exist. The second run is what
-- registers the cron jobs.
