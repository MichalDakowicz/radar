-- Radar rewrite — schema, RLS, and auth trigger.
-- Source of design intent: rewrite/11-supabase-migration.md
-- Verify against current Supabase docs/changelog before running on prod (APIs drift).
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste the whole
-- file → Run. Safe on an empty project AND on a live one: every statement here
-- is idempotent (`if not exists`, `create or replace`, or a guarded do-block),
-- so re-running only applies what is actually missing. It never drops a table,
-- a column, or a row — the only things it replaces are policies and functions,
-- which are re-created immediately from the definitions below.

-- ============================================================================
-- SCHEMA
-- ============================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  pfp          text,
  -- Letterboxd-style "top 4": an ordered snapshot of up to 4 titles
  -- ({tmdbId,type,title,coverUrl}), not FKs into public.movies. Snapshotting
  -- keeps the pick renderable from the world-readable profiles row alone, so a
  -- favourite survives being removed from the owner's library and needs no
  -- second, RLS-gated read to draw a poster.
  -- CASE, not AND: jsonb_array_length() errors on a non-array, and Postgres
  -- does not promise left-to-right evaluation of a conjunction.
  favorites    jsonb not null default '[]'
                 check (case when jsonb_typeof(favorites) = 'array'
                             then jsonb_array_length(favorites) <= 4
                             else false end),
  created_at   timestamptz not null default now()
);

-- CREATE TYPE has no `if not exists`; to_regtype() returns null when absent.
do $$
begin
  if to_regtype('public.media_type') is null then
    create type public.media_type as enum ('movie','tv');
  end if;
  if to_regtype('public.friends_visibility') is null then
    create type public.friends_visibility as enum ('public','friends','noone');
  end if;
end $$;

create table if not exists public.movies (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tmdb_id        bigint,
  imdb_id        text,
  type           media_type not null default 'movie',
  title          text not null,
  release_date   date,
  cover_url      text,
  overview       text,
  runtime        int,
  vote_average   numeric,
  vote_count     int,
  in_watchlist   boolean not null default true,
  in_progress    boolean not null default false,
  watched        boolean not null default false,
  times_watched  int not null default 0,
  status         text,
  completed_at   timestamptz,
  last_watched_position text,
  custom_order   double precision,
  notes          text,
  url            text,
  availability   text[] not null default '{}',
  director            jsonb not null default '[]',
  cast_members        jsonb not null default '[]',
  genres              jsonb not null default '[]',
  production_companies jsonb not null default '[]',
  ratings             jsonb not null default '{}',
  number_of_seasons   int,
  number_of_episodes  int,
  episodes_watched    jsonb not null default '{}',
  episode_watch_dates jsonb not null default '{}',
  season_episode_counts jsonb not null default '{}',
  tmdb_status         text,
  tagline             text,
  budget              bigint,
  revenue             bigint,
  added_at       timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Named explicitly, matching what Postgres auto-generated for the unnamed
-- `create index on ...` these replaced — `if not exists` can only match a name,
-- so an anonymous index would be re-created under a second name on every run.
create index if not exists movies_user_id_idx              on public.movies (user_id);
create index if not exists movies_user_id_tmdb_id_idx      on public.movies (user_id, tmdb_id);
create index if not exists movies_user_id_watched_idx      on public.movies (user_id, watched);
create index if not exists movies_user_id_in_watchlist_idx on public.movies (user_id, in_watchlist);
create index if not exists movies_user_id_expr_idx         on public.movies (user_id, ((ratings->>'overall')::numeric));

create table if not exists public.activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  movie_id    uuid references public.movies(id) on delete set null,
  movie_title text,
  type        text not null,
  media_type  media_type,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists activity_user_id_created_at_idx on public.activity (user_id, created_at desc);

create table if not exists public.user_settings (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  watch_provider_country    text not null default 'US',
  recently_added_days       int  not null default 30 check (recently_added_days between 1 and 365),
  show_recently_added       boolean not null default true,
  friends_visibility        friends_visibility not null default 'friends',
  streak_threshold          int not null default 2,
  tv_streak_threshold       int not null default 5,
  theme                     text default 'dark'
);

create table if not exists public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table if not exists public.friend_requests (
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  primary key (sender_id, recipient_id)
);

-- ============================================================================
-- COLUMN MIGRATIONS — for tables that predate a column. The CREATE TABLEs above
-- are skipped entirely on a live database, so anything added after the initial
-- deploy has to be applied here too.
-- ============================================================================

-- profiles.favorites (profile top 4).
alter table public.profiles
  add column if not exists favorites jsonb not null default '[]';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_favorites_check') then
    alter table public.profiles
      add constraint profiles_favorites_check
      check (case when jsonb_typeof(favorites) = 'array'
                  then jsonb_array_length(favorites) <= 4
                  else false end);
  end if;
end $$;

-- ============================================================================
-- RLS
-- ============================================================================

create schema if not exists private;

create or replace function private.can_view(target uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    target = auth.uid()
    or exists (
      select 1 from public.user_settings s
      where s.user_id = target
        and (
          s.friends_visibility = 'public'
          or ( s.friends_visibility <> 'noone'
               and exists (
                 select 1 from public.friendships f
                 where f.user_id = target and f.friend_id = auth.uid()
               ))
        )
    );
$$;
revoke all on function private.can_view(uuid) from public;
grant execute on function private.can_view(uuid) to authenticated, anon;

alter table public.profiles       enable row level security;
alter table public.movies         enable row level security;
alter table public.activity       enable row level security;
alter table public.user_settings  enable row level security;
alter table public.friendships    enable row level security;
alter table public.friend_requests enable row level security;

-- CREATE POLICY has no `if not exists` and no `or replace`, so each one is
-- dropped and re-created. The drop/create pair runs inside the SQL Editor's
-- single transaction, so there is no window where a table sits unprotected.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read   on public.profiles for select
  to anon, authenticated using (true);
drop policy if exists profiles_write on public.profiles;
create policy profiles_write  on public.profiles for insert
  to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists movies_owner_all on public.movies;
create policy movies_owner_all on public.movies for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists movies_visible_read on public.movies;
create policy movies_visible_read on public.movies for select
  to anon, authenticated using (private.can_view(user_id));

drop policy if exists activity_visible_read on public.activity;
create policy activity_visible_read on public.activity for select
  to anon, authenticated using (private.can_view(user_id));
drop policy if exists activity_owner_write on public.activity;
create policy activity_owner_write on public.activity for insert
  to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists settings_owner_all on public.user_settings;
create policy settings_owner_all on public.user_settings for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists friendships_read on public.friendships;
create policy friendships_read on public.friendships for select
  to anon, authenticated using (private.can_view(user_id));
drop policy if exists friendships_write on public.friendships;
create policy friendships_write on public.friendships for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists fr_read on public.friend_requests;
create policy fr_read on public.friend_requests for select
  to authenticated using ((select auth.uid()) in (sender_id, recipient_id));
drop policy if exists fr_insert on public.friend_requests;
create policy fr_insert on public.friend_requests for insert
  to authenticated with check ((select auth.uid()) = sender_id);
drop policy if exists fr_update on public.friend_requests;
create policy fr_update on public.friend_requests for update
  to authenticated using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- ============================================================================
-- AUTH TRIGGER — auto-create profile + settings row on signup
-- ============================================================================

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name, pfp)
  values (
    new.id,
    'user' || substr(replace(new.id::text,'-',''),1,6),
    coalesce(new.raw_user_meta_data->>'full_name','New User'),
    coalesce(new.raw_user_meta_data->>'avatar_url','')
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================================
-- SOCIAL RPCs (Phase 8) — friend handshake + public-shelf visibility probe.
-- ============================================================================
--
-- friendships / friend_requests writes are owner-scoped by RLS
-- (friendships_write: user_id = auth.uid()), so a client can only ever touch
-- its own side. Accepting a request has to write BOTH mirrored friendship rows
-- (mine + the sender's) atomically, and removing a friend has to delete both
-- sides — neither is expressible under owner-only RLS. These security-definer
-- functions do the cross-side write after re-checking the caller is the right
-- party, mirroring the atomic multi-path update the Firebase rules did.

-- Accept: only the recipient of a *pending* request may accept it. Flips the
-- request to 'accepted' and inserts the two mirrored friendship rows.
create or replace function public.accept_friend_request(p_sender uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.friend_requests
     set status = 'accepted'
   where sender_id = p_sender
     and recipient_id = auth.uid()
     and status = 'pending';

  if not found then
    raise exception 'no pending request from %', p_sender;
  end if;

  insert into public.friendships (user_id, friend_id)
    values (auth.uid(), p_sender)
    on conflict do nothing;
  insert into public.friendships (user_id, friend_id)
    values (p_sender, auth.uid())
    on conflict do nothing;
end $$;
revoke all on function public.accept_friend_request(uuid) from public;
grant execute on function public.accept_friend_request(uuid) to authenticated;

-- Decline: recipient deletes the request row (delete, not a status flip, so a
-- later re-request from the same sender isn't blocked by the composite PK).
create or replace function public.decline_friend_request(p_sender uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.friend_requests
   where sender_id = p_sender and recipient_id = auth.uid();
end $$;
revoke all on function public.decline_friend_request(uuid) from public;
grant execute on function public.decline_friend_request(uuid) to authenticated;

-- Remove friend: delete both directions (either row referencing the pair).
create or replace function public.remove_friend(p_friend uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.friendships
   where (user_id = auth.uid() and friend_id = p_friend)
      or (user_id = p_friend and friend_id = auth.uid());
end $$;
revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;

-- Public-shelf visibility probe: exposes private.can_view over PostgREST so the
-- client can distinguish "shelf is private" from "shelf is empty" (the raw RLS
-- filter just returns 0 rows either way). anon may call it for public web shelves.
create or replace function public.can_view_user(p_target uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.can_view(p_target);
$$;
grant execute on function public.can_view_user(uuid) to authenticated, anon;

-- ============================================================================
-- REALTIME — needed starting Phase 1 (useMovies), harmless to enable now.
-- ============================================================================

-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member,
-- so each is added only when missing.
do $$
declare
  t text;
begin
  foreach t in array array['movies','friend_requests','friendships','activity'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
