# 07 — React Native / Expo Stack

Recommended libraries and a 1:1 mapping from every current dependency. Prefer Expo SDK
modules and libraries with New Architecture support.

## Core

| Concern         | Choice                                            | Why                                                                                                  |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Runtime         | **Expo (managed) + expo-dev-client**              | OTA, EAS build, native modules without ejecting.                                                     |
| Language        | **TypeScript**                                    | The current app is JS; the rewrite should be TS for the data-model safety this doc set relies on.    |
| Navigation      | **Expo Router** (file-based, on React Navigation) | Native stacks/tabs → free scroll & state restoration ([05](./05-state-and-navigation.md)).           |
| Styling         | **NativeWind 4**                                  | Tailwind syntax on RN; port existing classes. Define theme tokens to mirror `ThemeContext` CSS vars. |
| Lists           | **@shopify/flash-list**                           | Virtualized, fast poster grids/rows; `initialScrollIndex` for anchored restore.                      |
| Server cache    | **@tanstack/react-query** (keep)                  | Already used; powers the Browse-stability fix.                                                       |
| Local KV        | **react-native-mmkv**                             | Fast synchronous store for durable prefs (filters/sort/view).                                        |
| Global UI store | **zustand** (+ MMKV persist)                      | Tiny store for filter/tab state; replaces window-event sync.                                         |
| Images          | **expo-image**                                    | Disk/mem caching, placeholders, blurhash — essential for posters.                                    |
| Gestures        | **react-native-gesture-handler**                  | Swipe, reorder, sheets.                                                                              |
| Animation       | **react-native-reanimated**                       | Carousels, hero, transitions.                                                                        |
| Bottom sheets   | **@gorhom/bottom-sheet**                          | Replaces Radix popover/dialog for filters, pickers, modals.                                          |
| Safe area       | **react-native-safe-area-context**                | Replaces `pb-safe` etc.                                                                              |

## Feature-specific

| Current                                              | Replacement                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `react-router-dom`                                   | Expo Router.                                                                                                                                                                                     |
| `@dnd-kit/*` (Library reorder)                       | **FlashList/FlatList drag** via `react-native-draggable-flatlist` (or Reanimated-based reorder).                                                                                                 |
| `@radix-ui/react-dialog` / `popover` / `scroll-area` | `@gorhom/bottom-sheet` + RN `Modal`; scroll-area → native ScrollView/FlashList.                                                                                                                  |
| `cmdk` (command menu)                                | Custom search list / bottom sheet (command palette is desktop-centric; on mobile use a search screen).                                                                                           |
| `lucide-react`                                       | **lucide-react-native**.                                                                                                                                                                         |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Keep `clsx`; NativeWind handles class merge. `cva` works with RN too.                                                                                                                            |
| `react-easy-crop` + `cropImage.js`                   | **expo-image-manipulator** (+ `expo-image-picker`) for pfp crop.                                                                                                                                 |
| `firebase` (JS SDK: Auth + RTDB)                     | **@supabase/supabase-js** (Postgres + Auth + Realtime) — [11](./11-supabase-migration.md).                                                                                                       |
| `@codetrix-studio/capacitor-google-auth`             | Supabase Auth: **@react-native-google-signin/google-signin** → `signInWithIdToken` (native) / `signInWithOAuth` (web); plus email/password — [11](./11-supabase-migration.md#auth). |
| `@capacitor/*` (app, deep links)                     | **expo-linking** / Expo Router deep links; **expo-web-browser**.                                                                                                                                 |
| Charts in Stats (currently CSS/SVG divs)             | **react-native-svg** + hand-built bars (port current SVG components) or `victory-native`/`react-native-gifted-charts` for streak calendars.                                                      |
| `@tailwindcss/vite` build                            | NativeWind Metro config.                                                                                                                                                                         |
| Toasts (`Toast.jsx`)                                 | keep custom, or `burnt` / `react-native-toast-message`.                                                                                                                                          |

## Backend: Supabase

Confirmed — backend moves from Firebase to **Supabase**. Full schema/RLS/auth/migration
design in [11-supabase-migration.md](./11-supabase-migration.md). Client packages:

| Package                                                         | Use                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| **@supabase/supabase-js**                                       | DB queries, auth, realtime. One codebase across native + Expo Web. |
| **@react-native-async-storage/async-storage** (or MMKV adapter) | Supabase Auth session persistence in RN.                           |
| **@react-native-google-signin/google-signin**                   | Native Google → `supabase.auth.signInWithIdToken`.                 |
| **expo-linking** / **expo-web-browser**                         | OAuth redirect (`radar://`).                          |

-   Wrap **all** Supabase access behind `lib/supabase.ts` + data hooks so screens are
    backend-agnostic ([10](./10-code-conventions.md#data-access-rules)); this also keeps
    the migration blast radius small.
-   Auth session: `autoRefreshToken`, persist to AsyncStorage/MMKV, and toggle
    `startAutoRefresh`/`stopAutoRefresh` on `AppState`.
-   Realtime channels replace the old `onValue` subscriptions, feeding react-query
    ([05](./05-state-and-navigation.md#data-subscriptions), [11](./11-supabase-migration.md#realtime)).

## Theming

-   Port `ThemeContext` → NativeWind `dark`/`light` with a `useColorScheme` + manual
    override toggle stored in MMKV.
-   Recreate the CSS-var tokens (`background`, `foreground`, `primary`, `muted`,
    `border`) as NativeWind theme colors so ported `bg-background` etc. resolve.

## Project config to add

-   `app.json`/`app.config.ts` (name, scheme `radar://`, icons/splash from existing
    `assets/`, `icon.svg`).
-   EAS (`eas.json`) for Android/iOS builds.
-   `.env` → `expo-constants` / `EXPO_PUBLIC_*` for TMDB + **Supabase** URL & anon
    (publishable) key (currently `VITE_*` in `.env`). Never ship the `service_role` key.
-   Metro + NativeWind + Reanimated Babel plugin config.
