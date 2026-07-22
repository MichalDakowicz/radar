# Radar — Rewrite Documentation

This folder is the source of truth for rewriting **Radar** (movie/TV tracker) from
its current **React + Vite + Capacitor** web-wrapper into a **native-first React
Native app** using **Expo + NativeWind + Expo Router**, and migrating the backend from
**Firebase** to **Supabase**.

Target platforms (confirmed): **Android + iOS + Web** (Web via `react-native-web`
through Expo, mainly to preserve the public "shared shelf" links).

> 🗂️ **Live progress:** open [`tasklist.html`](./tasklist.html) in a browser — an
> interactive build tracker (phases → subtasks, per-doc links, progress bars). The AI
> updates task status there as it works. **Start at Step 0** (keys & accounts you must
> provide before the build can begin).

## How to read these docs

Read in order the first time. During the rewrite, jump to the doc for the surface
you are working on. Every doc references concrete files in the current codebase
(`src/...`) so behaviour can be verified against the original before it is ported.

| Doc                                                                      | Purpose                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [00-project-overview.md](./00-project-overview.md)                       | What Radar is, who uses it, the goals and non-goals of the rewrite.                                                                                                                                      |
| [01-current-architecture.md](./01-current-architecture.md)               | How the app is wired today: providers, routing, data flow, folders.                                                                                                                                      |
| [02-data-model.md](./02-data-model.md)                                   | The **source** (Firebase RTDB) schema: movie object shape, status model, ratings, TV episode tracking, activity, friends, settings. The relational **target** lives in [11](./11-supabase-migration.md). |
| [03-feature-inventory.md](./03-feature-inventory.md)                     | Every screen and feature, page by page, with file references. The porting checklist.                                                                                                                     |
| [04-known-issues-and-fixes.md](./04-known-issues-and-fixes.md)           | Concrete bugs & smells in the current app and how the rewrite should solve each.                                                                                                                         |
| [05-state-and-navigation.md](./05-state-and-navigation.md)               | Deep dive on the #1 pain point: scroll/page-state restoration, the Browse "content changes" bug, and the native architecture that fixes both.                                                            |
| [06-new-features-spec.md](./06-new-features-spec.md)                     | Detailed specs for the 4 requested new features (In-Progress carousel, better service filtering, watchlist+watched "rewatch", Hall of Fame).                                                             |
| [07-rn-expo-stack.md](./07-rn-expo-stack.md)                             | Recommended RN/Expo library choices and a 1:1 mapping from every current dependency.                                                                                                                     |
| [08-migration-plan.md](./08-migration-plan.md)                           | Phased, buildable plan from empty Expo app to feature parity + new features.                                                                                                                             |
| [09-tmdb-and-firebase.md](./09-tmdb-and-firebase.md)                     | External integration reference: TMDB endpoints used; Firebase auth/rules **as the source system** (superseded by Supabase for the target — see [11](./11-supabase-migration.md)).                        |
| [10-code-conventions.md](./10-code-conventions.md)                       | Code structure standard: small files, component/hook/pure-fn separation, folder layout, styling & TypeScript rules.                                                                                      |
| [11-supabase-migration.md](./11-supabase-migration.md)                   | **Backend rewrite:** target Postgres schema, RLS policies, Supabase Auth (Google + email/password), Realtime, and the RTDB→Postgres data migration.                                         |
| [12-ui-unification-and-add-flow.md](./12-ui-unification-and-add-flow.md) | **One `MovieCard`/grid/carousel** used everywhere (kills per-page divergence) + a **simplified Quick-Add** (name → pick → status).                                                                       |

## Confirmed product decisions (from the client)

These answers were given up front and drive several specs below:

1. **Platforms:** Android + iOS + Web (keep Expo Web for the public shelf).
2. **Hall of Fame** qualifies a title when its **`ratings.overall === 5`** (see
   [06](./06-new-features-spec.md#4-hall-of-fame)).
3. **Watchlist + Watched simultaneously** = a **"Want to rewatch"** item: appears in
   _both_ the Watched and Watchlist filters and gets a `Rewatch` badge
   (see [06](./06-new-features-spec.md#3-rewatch-state-watchlist--watched)).
4. **Service filter** is restricted to a fixed popular set: **Netflix, Disney+, Max,
   Prime Video, Apple TV+, Paramount+, Hulu**
   (see [06](./06-new-features-spec.md#2-better-service-filtering)).
5. **Backend:** migrate Firebase → **Supabase** (Postgres + Auth + RLS + Realtime)
   (see [11](./11-supabase-migration.md)).
6. **Auth methods:** Google + **Email/password** (add
   Apple before iOS release) (see [11](./11-supabase-migration.md#auth)). Magic link
   considered and dropped — not offered by Supabase in this project's dashboard, and
   the client doesn't need it.
7. **UI unification:** a single `MovieCard`/grid/carousel across all screens, and a
   **simplified Quick-Add** (type name → pick → set status) (see
   [12](./12-ui-unification-and-add-flow.md)).

## Open questions still worth confirming

Collected in each doc under an **"❓ Confirm"** callout. Nothing blocks starting the
rewrite scaffold, but resolve them before building the affected screen.
