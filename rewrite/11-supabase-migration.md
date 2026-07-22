# 11 — Supabase Migration (backend + auth)

**Decision (confirmed):** migrate the backend from **Firebase Realtime Database + Auth**
to **Supabase** (Postgres + Supabase Auth + Row Level Security + Realtime).
**Auth methods (confirmed):** Google OAuth, **Email + password**. (Magic link considered
and dropped — not available in this project's Supabase dashboard, not needed.) Add
**Sign in with Apple** before iOS release — App Store requires it when any third-party
login is offered.

This doc supersedes the Firebase parts of [09](./09-tmdb-and-firebase.md) for the
target app. Firebase remains only as the **source system** to migrate data _from_.

> ⚠️ **Verify at build time.** Supabase APIs, `config.toml`, and auth options change
> often. Before implementing, check `https://supabase.com/changelog.md` and the current
> docs (`supabase.com/docs/...md`). Treat the SQL/config below as the design intent, not
> a copy-paste guarantee.

---

## Why Supabase fits Radar

-   **Relational stats.** The Stats screen does heavy aggregation (genre counts, decades,
    directors, streaks). SQL/views do this far better than walking an RTDB tree client-
    side ([03](./03-feature-inventory.md#stats)).
-   **Multi-provider auth built in** — Google + email/password + Apple with
    one API; matches the auth requirement directly.
-   **RLS** expresses the current visibility rules ([09](./09-tmdb-and-firebase.md#security-rules))
    as policies co-located with the data.
-   **Realtime** replaces `onValue` subscriptions for live movies/friend-requests.
-   Works on **native + Expo Web** via `@supabase/supabase-js` (single codebase — matches
    the Web target).

---

## Schema mapping (RTDB tree → Postgres)

Source shapes: [02-data-model.md](./02-data-model.md). Strategy: **scalar/queryable
fields become columns; nested arrays/objects stay `jsonb`** to keep the migration
faithful and the app code close to today's object shape.

| RTDB path                          | Postgres                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `users/<uid>/profile`              | `profiles` (1 row/user, `id = auth.users.id`)                                                      |
| `usernames/<name>`                 | unique constraint on `profiles.username` (drop the side table)                                     |
| `userSearchIndex/<uid>`            | query `profiles` directly (drop)                                                                   |
| `users/<uid>/movies/<id>`          | `movies`                                                                                           |
| `users/<uid>/activity/<id>`        | `activity`                                                                                         |
| `users/<uid>/history/<id>`         | `history` (or fold into `activity` — ❓ confirm if `history` still needed) -> Fold into `activity` |
| `users/<uid>/settings/*`           | `user_settings` (1 row/user)                                                                       |
| `users/<uid>/friends/<fid>`        | `friendships`                                                                                      |
| `users/<uid>/friendRequests/<sid>` | `friend_requests`                                                                                  |

### DDL (design intent)

```sql
-- PROFILES ---------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  pfp          text,
  created_at   timestamptz not null default now()
);

-- MOVIES -----------------------------------------------------------------
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
  -- tracking (the boolean status model from doc 02)
  in_watchlist   boolean not null default true,
  in_progress    boolean not null default false,
  watched        boolean not null default false,
  times_watched  int not null default 0,
  status         text,                       -- legacy string, kept for export compat
  completed_at   timestamptz,
  last_watched_position text,
  custom_order   double precision,
  notes          text,
  url            text,
  availability   text[] not null default '{}',
  -- nested/semi-structured (mirror current object shapes)
  director            jsonb not null default '[]',   -- [{id,name}]
  cast_members        jsonb not null default '[]',   -- [{id,name}]  ("cast" is reserved-ish; alias in app)
  genres              jsonb not null default '[]',   -- [{id,name}] | [string]
  production_companies jsonb not null default '[]',
  ratings             jsonb not null default '{}',   -- {story,acting,ending,enjoyment,overall,seasons}
  number_of_seasons   int,
  number_of_episodes  int,
  episodes_watched    jsonb not null default '{}',   -- {"s1e1":true}
  episode_watch_dates jsonb not null default '{}',   -- {"s1e1":<ms|iso>}
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
-- Hall of Fame / rating queries:
create index on public.movies (user_id, ((ratings->>'overall')::numeric));

-- ACTIVITY ---------------------------------------------------------------
create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  movie_id    uuid references public.movies(id) on delete set null,
  movie_title text,
  type        text not null,   -- added|completed|started_watching|added_to_watchlist|status_changed|rating_changed|updated|removed
  media_type  media_type,
  details     jsonb not null default '{}',  -- rating,oldStatus,newStatus,timesWatched,...
  created_at  timestamptz not null default now()
);
create index on public.activity (user_id, created_at desc);

-- USER SETTINGS ----------------------------------------------------------
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

-- FRIENDSHIPS (one row per direction, mirror both on accept) --------------
create table public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- FRIEND REQUESTS --------------------------------------------------------
create table public.friend_requests (
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending',  -- pending|accepted|declined
  created_at   timestamptz not null default now(),
  primary key (sender_id, recipient_id)
);
```

> Notes: `cast` maps to `cast_members` (avoid the SQL keyword) — the app aliases it back
> to `cast` in `normalizeMovie`. Timestamps become `timestamptz`; the migration converts
> the current epoch-ms numbers to ISO. `history` omitted above pending the confirm.

---

## RLS policies

Enable RLS on **every** table (they live in the exposed `public` schema). Rules encode
the current Firebase visibility model.

### Visibility helper (keeps policies clean)

Reading another user's movies/activity requires "public OR friend, and not noone" — the
same check the Firebase rules do. Put a helper in a **private, non-exposed schema** and
mark `security definer` so it can read `user_settings`/`friendships` during the check:

```sql
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
```

### Policies (design intent)

```sql
alter table public.profiles       enable row level security;
alter table public.movies         enable row level security;
alter table public.activity       enable row level security;
alter table public.user_settings  enable row level security;
alter table public.friendships    enable row level security;
alter table public.friend_requests enable row level security;

-- PROFILES: world-readable (public shelf + search); owner writes.
create policy profiles_read   on public.profiles for select
  to anon, authenticated using (true);
create policy profiles_write  on public.profiles for insert
  to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update
  to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- MOVIES: owner full; others read per visibility (anon allowed for public shelves).
create policy movies_owner_all on public.movies for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy movies_visible_read on public.movies for select
  to anon, authenticated using (private.can_view(user_id));

-- ACTIVITY: same visibility; writes owner-only.
create policy activity_visible_read on public.activity for select
  to anon, authenticated using (private.can_view(user_id));
create policy activity_owner_write on public.activity for insert
  to authenticated with check ((select auth.uid()) = user_id);

-- USER SETTINGS: owner read/write. (Public shelf never needs raw settings —
-- the visibility gate is evaluated inside private.can_view, not by the client.)
create policy settings_owner_all on public.user_settings for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- FRIENDSHIPS: readable per visibility; owner manages own side.
create policy friendships_read on public.friendships for select
  to anon, authenticated using (private.can_view(user_id));
create policy friendships_write on public.friendships for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- FRIEND REQUESTS: sender creates; both parties read; recipient updates status.
create policy fr_read on public.friend_requests for select
  to authenticated using ((select auth.uid()) in (sender_id, recipient_id));
create policy fr_insert on public.friend_requests for insert
  to authenticated with check ((select auth.uid()) = sender_id);
create policy fr_update on public.friend_requests for update
  to authenticated using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
```

**Checklist applied:** RLS on all tables; `TO` clause (no `auth.role()`); ownership
predicate alongside `TO authenticated`; UPDATE policies carry both `USING` and
`WITH CHECK`; helper is `security definer` but lives in a private schema with an internal
`auth.uid()`-based check and `search_path=''`. Run `supabase db advisors` after applying.

> Accepting a friend request = a transaction (RPC) that flips `friend_requests.status`
> and inserts the two mirrored `friendships` rows. Implement as a `security invoker`
> function so it runs under the caller's RLS. See the friend handshake in the current
> `database.rules.json`.

---

## Auth

Supabase Auth, providers enabled: **Google**, **Email/password**; add **Apple** for iOS.
Magic link/OTP dropped — not offered in this project's Supabase dashboard, not needed.

-   `@supabase/supabase-js` client; RN session persistence via **AsyncStorage** (or MMKV
    adapter) + `autoRefreshToken`, and call `supabase.auth.startAutoRefresh()` /
    `stopAutoRefresh()` on `AppState` foreground/background.
-   **Google (native):** `@react-native-google-signin/google-signin` → get `idToken` →
    `supabase.auth.signInWithIdToken({ provider:'google', token })`. On Web use
    `signInWithOAuth({ provider:'google' })`.
-   **Email/password:** `signUp` / `signInWithPassword` + email confirmation & reset.
-   **Never** use `user_metadata` for authorization; if roles/flags are ever needed put
    them in `app_metadata`.

### Auto-create profile on signup

Replace the `AuthContext` profile bootstrap ([09](./09-tmdb-and-firebase.md#auth)) with a
DB trigger:

```sql
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
```

(Username collision is near-impossible with the uuid slice; add a retry/suffix if you
prefer the current random-word scheme.)

---

## Realtime

Replace `onValue` with Supabase Realtime on the tables that need live updates:

```ts
supabase
    .channel("movies")
    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "movies",
            filter: `user_id=eq.${uid}`,
        },
        (payload) =>
            queryClient.invalidateQueries({ queryKey: ["movies", uid] }),
    )
    .subscribe();
```

-   Add `movies`, `friend_requests`, `activity` to the realtime publication.
-   Feed changes into **react-query** cache (same pattern as
    [05](./05-state-and-navigation.md#data-subscriptions)) so the UI stays instant.
-   `FriendRequestListener` → realtime on `friend_requests` where `recipient_id = uid`.

---

## Data migration (RTDB → Postgres)

One-time script (Node, run locally with the Supabase **service_role** key — never ship
it). The hard part: **Firebase UIDs ≠ Supabase user UUIDs.**

1. **Export RTDB:** Firebase console → export JSON, or `firebase database:get / >
dump.json`.
2. **Users:** for each Firebase user (from Auth export), create a Supabase auth user via
   the Admin API (`supabase.auth.admin.createUser({ email, email_confirm:true })`) keyed
   by **email** (the stable join key across Google accounts). Build a
   `firebaseUid → supabaseUuid` map. Users keep signing in with Google/email → same
   email → same row.
3. **Profiles/settings:** upsert from `profile` + `settings` (the trigger may have
   created empty ones — upsert over them).
4. **Movies:** transform each `users/<uid>/movies/*` node → a `movies` row: map fields
   to columns, keep nested objects as `jsonb`, convert epoch-ms → `timestamptz`, run the
   existing `migrateStatus`/`normalizeMovie` logic so boolean flags are consistent, map
   old `type:"TV Show"` → `'tv'`, `availability` through `normalizeServiceName`.
5. **Activity/friends/requests:** remap all UID references through the map; drop rows
   whose referenced user didn't migrate.
6. **Verify:** row counts per user vs RTDB; spot-check a full library round-trips
   (open in the new app, diff a few titles).
7. **Cutover:** freeze writes to Firebase, run final delta export, re-run, switch the
   app. Keep the Firebase project read-only as a backup for a while.

Because the client's own account is the priority, migrate/verify it first; friends and
public users can follow.

> The **JSON import/export** feature ([02](./02-data-model.md#importexport-format)) is a
> useful fallback: if UID remapping is messy, the primary user can export from the old
> app and import into the new one. Keep the export format stable so this works.

---

## App-side changes vs today

| Today (Firebase)                 | Rewrite (Supabase)                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/lib/firebase.js`            | `lib/supabase.ts` (client + auth persistence)                                                                   |
| `onValue(ref(db, ...))` in hooks | `supabase.from('movies').select()` + realtime channel → react-query                                             |
| `push()/set()/update()/remove()` | `insert/upsert/update/delete` (RLS-guarded)                                                                     |
| `database.rules.json`            | SQL RLS policies (above), in migrations                                                                         |
| `stripUndefined` before write    | still useful for `jsonb` payloads; Postgres is stricter on columns                                              |
| Firebase `logActivity`           | insert into `activity` (same event shapes)                                                                      |
| Client-side stats aggregation    | mostly keep client-side first; later move heavy aggregates to SQL **views** (`security_invoker = true`) or RPCs |

Keep all Supabase access behind `lib/supabase.ts` + the data hooks so screens are
unaware of the backend ([10](./10-code-conventions.md#data-access-rules)).
