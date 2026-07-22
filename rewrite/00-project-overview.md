# 00 — Project Overview

## What Radar is

Radar is a personal **movie & TV library / watchlist tracker** with a social layer.
A user signs in with Google, builds a curated library of movies and shows pulled from
TMDB, tracks watch status and personal ratings, browses/discovers new titles, views
rich statistics about their viewing habits, and optionally shares a read-only public
"shelf" and connects with friends.

It is the client's **most important project** and the rewrite must both preserve every
existing capability and improve the native feel on mobile.

## Who uses it

-   A single primary user per account (their own library, stats, settings).
-   Friends of that user (read friend libraries/stats when visibility allows).
-   Anyone with a public shelf link (`/u/:userId`) — no auth required to view.

## Core value / feature pillars

1. **Library** — grid/list of owned/tracked titles, filter, sort, group, reorder,
   search, random pick. (`src/pages/Home.jsx`)
2. **Browse/Discover** — TMDB-powered rows (trending, popular, genre, "because you
   liked…"), hero carousel, universal search (movies/TV/people/genres).
   (`src/pages/Browse.jsx`)
3. **Detail & Edit** — full metadata, per-category ratings (story/acting/ending/
   enjoyment/overall), TV season+episode tracking, notes, availability.
   (`src/pages/EditMovie.jsx`, `src/pages/MovieDetails.jsx`)
4. **Stats** — status/type breakdowns, runtime totals, genre/decade/director
   analytics, watch streak calendars, history. (`src/pages/Stats.jsx`)
5. **Social** — friend requests, friend list, public shelf & public stats/friends.
   (`src/pages/Friends.jsx`, `SharedShelf.jsx`, `PublicFriends.jsx`)
6. **Settings & data** — theme, watch-provider country, recently-added config,
   metadata refresh, JSON import/export. (`src/pages/Settings.jsx`)

Full breakdown in [03-feature-inventory.md](./03-feature-inventory.md).

## Current tech stack (being replaced)

| Concern       | Current                                     | Notes                                                                                                                               |
| ------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| UI framework  | React 19                                    | Keep the mental model; move to React Native.                                                                                        |
| Build/dev     | Vite 7                                      | → Expo / Metro.                                                                                                                     |
| Styling       | Tailwind CSS 4                              | → NativeWind 4 (Tailwind syntax on RN).                                                                                             |
| Routing       | react-router-dom 7                          | → Expo Router (file-based).                                                                                                         |
| Native shell  | Capacitor 6 (Android wrap of the web build) | → true RN runtime (no WebView).                                                                                                     |
| Data/auth     | Firebase (Auth + Realtime Database)         | **→ Supabase** (Postgres + Auth + RLS + Realtime). Firebase becomes the migration _source_ only ([11](./11-supabase-migration.md)). |
| Server cache  | @tanstack/react-query 5                     | Keep — works in RN.                                                                                                                 |
| Drag & drop   | @dnd-kit                                    | → RN gesture/reorder lib ([07](./07-rn-expo-stack.md)).                                                                             |
| Icons         | lucide-react                                | → `lucide-react-native`.                                                                                                            |
| UI primitives | Radix UI (dialog/popover/scroll-area)       | → RN equivalents / bottom sheets.                                                                                                   |
| Image crop    | react-easy-crop                             | → `expo-image-manipulator` + crop UI.                                                                                               |
| Metadata      | TMDB REST API                               | Unchanged.                                                                                                                          |

## Goals of the rewrite

-   **Native-first UX**: real native scrolling, lists, gestures, navigation
    transitions, safe-area handling, keyboard behaviour — not a WebView.
-   **Kill the state/scroll restoration bugs** by adopting native navigation stacks and
    list state that survives navigation _by default_ (see
    [05-state-and-navigation.md](./05-state-and-navigation.md)).
-   **Stable Browse content** — stop regenerating random discovery rows on every visit.
-   **Performance** at large library sizes: virtualized lists, cached images, memoized
    derivations.
-   **Add** the four requested features cleanly (see
    [06-new-features-spec.md](./06-new-features-spec.md)).
-   **Migrate the backend to Supabase** (Postgres + Auth + RLS + Realtime) with a faithful
    data migration from the current Firebase RTDB, preserving every field
    ([11-supabase-migration.md](./11-supabase-migration.md)).
-   **More login methods:** Google + email/password (Apple before iOS
    release) ([11](./11-supabase-migration.md#auth)).
-   Keep the **data shapes backward-compatible** (and the JSON export format) so the
    migration is lossless and the export/import fallback keeps working.

## Non-goals (for the first rewrite pass)

-   Redesigning the visual language wholesale — port the current dark, Netflix-ish look
    to NativeWind first, refine later.
-   A bespoke offline-first sync engine (Supabase + react-query cache is enough for v1).
-   Multi-account / account switching.

## Design language to preserve

Dark theme, near-black backgrounds (`#09090b`/`neutral-900`), blue accent
(`blue-500/600`), poster-forward cards with gradient overlays, service-logo avatars,
amber personal-rating stars vs. yellow TMDB score. Theming is already tokenized via a
`ThemeContext` + CSS variables (`bg-background`, `text-foreground`, `text-primary`,
`bg-muted`, `border-border`) — replicate these as NativeWind theme tokens so light/dark
keeps working.
