-- Radar rewrite — initial schema, RLS, and auth trigger.
-- Source of design intent: rewrite/11-supabase-migration.md
-- Run this once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Verify against current Supabase docs/changelog before running on prod (APIs drift).

-- ============================================================================
-- SCHEMA
-- ============================================================================

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  pfp          text,
  created_at   timestamptz not null default now()
);

create type media_type as enum ('movie','tv');

create table public.movies (
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
create index on public.movies (user_id);
create index on public.movies (user_id, tmdb_id);
create index on public.movies (user_id, watched);
create index on public.movies (user_id, in_watchlist);
create index on public.movies (user_id, ((ratings->>'overall')::numeric));

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  movie_id    uuid references public.movies(id) on delete set null,
  movie_title text,
  type        text not null,
  media_type  media_type,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on public.activity (user_id, created_at desc);

create type friends_visibility as enum ('public','friends','noone');

create table public.user_settings (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  watch_provider_country    text not null default 'US',
  recently_added_days       int  not null default 30 check (recently_added_days between 1 and 365),
  show_recently_added       boolean not null default true,
  friends_visibility        friends_visibility not null default 'friends',
  streak_threshold          int not null default 2,
  tv_streak_threshold       int not null default 5,
  theme                     text default 'dark'
);

create table public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table public.friend_requests (
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  primary key (sender_id, recipient_id)
);

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

create policy profiles_read   on public.profiles for select
  to anon, authenticated using (true);
create policy profiles_write  on public.profiles for insert
  to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update
  to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy movies_owner_all on public.movies for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy movies_visible_read on public.movies for select
  to anon, authenticated using (private.can_view(user_id));

create policy activity_visible_read on public.activity for select
  to anon, authenticated using (private.can_view(user_id));
create policy activity_owner_write on public.activity for insert
  to authenticated with check ((select auth.uid()) = user_id);

create policy settings_owner_all on public.user_settings for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy friendships_read on public.friendships for select
  to anon, authenticated using (private.can_view(user_id));
create policy friendships_write on public.friendships for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy fr_read on public.friend_requests for select
  to authenticated using ((select auth.uid()) in (sender_id, recipient_id));
create policy fr_insert on public.friend_requests for insert
  to authenticated with check ((select auth.uid()) = sender_id);
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================================
-- REALTIME — needed starting Phase 1 (useMovies), harmless to enable now.
-- ============================================================================

alter publication supabase_realtime add table public.movies;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.activity;
