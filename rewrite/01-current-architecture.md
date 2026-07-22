# 01 — Current Architecture

Snapshot of how the app is wired today, so the rewrite can map it deliberately.

## Provider tree

From `src/App.jsx` (outer → inner):

```
QueryClientProvider (@tanstack/react-query)
└─ AuthProvider              src/features/auth/AuthContext.jsx
   └─ ThemeProvider          src/contexts/ThemeContext.jsx
      └─ ToastProvider       src/components/ui/Toast.jsx
         └─ RefreshMetadataProvider  src/contexts/RefreshMetadataContext.jsx
            └─ BrowserRouter
               ├─ AppUrlListener         (Capacitor deep-link handler)
               ├─ FriendRequestListener  (realtime friend-request toasts)
               ├─ SwipeNavigator         (global touch swipe → route change)
               └─ Routes
```

**Rewrite note:** `AuthProvider` gates rendering on `!loading` — children never mount
until auth resolves. Preserve this: in Expo Router, use a root layout that renders a
splash/loading state until auth is known.

## Routing

`react-router-dom` routes (`src/App.jsx`):

| Path                     | Page                  | Auth      | Notes                                         |
| ------------------------ | --------------------- | --------- | --------------------------------------------- |
| `/login`                 | `Login`               | public    | Google sign-in.                               |
| `/u/:userId`             | `SharedShelf`         | public    | Public read-only library.                     |
| `/u/:userId/stats`       | `Stats`               | public    | Same component, `userId` param → public mode. |
| `/u/:userId/friends`     | `PublicFriends`       | public    |                                               |
| `/`                      | `Home`                | protected | The Library.                                  |
| `/browse`                | `Browse`              | protected | Discover/search.                              |
| `/stats`                 | `Stats`               | protected | Own stats (no `userId`).                      |
| `/friends`               | `Friends`             | protected |                                               |
| `/settings`              | `Settings`            | protected |                                               |
| `/add`                   | `AddMovie`            | protected | Manual add flow.                              |
| `/edit/:movieId`         | `EditMovie`           | protected | Edit an owned title.                          |
| `/movie/:tmdbId/:type`   | `MovieDetails`        | protected | Read TMDB detail for a not-yet-owned title.   |
| `/director/:directorId`  | `DirectorDetails`     | protected |                                               |
| `/actor/:actorId`        | `ActorDetails`        | protected |                                               |
| `/genre/:genreId`        | `GenreDetails`        | protected |                                               |
| `/manage-completions`    | `ManageCompletions`   | protected | Backfill movie watch dates.                   |
| `/manage-tv-completions` | `ManageTVCompletions` | protected | Backfill TV episode dates.                    |
| `*`                      | → `/`                 |           | Fallback.                                     |

`ProtectedRoute` (`src/features/auth/ProtectedRoute.jsx`) redirects unauthenticated
users to `/login`.

**Rewrite → Expo Router** proposed file tree in
[05-state-and-navigation.md](./05-state-and-navigation.md#proposed-expo-router-tree).
The `Stats` component doubling as public+private via a `userId` param maps cleanly to
Expo Router's `(tabs)/stats.tsx` + `u/[userId]/stats.tsx` sharing one component.

## Navigation UX (mobile)

-   **`BottomNav`** (`src/components/layout/BottomNav.jsx`): 5 tabs — Library, Browse,
    Stats, Friends, Settings. Hidden ≥780px (desktop uses `Navbar`). Tapping the active
    tab **resets** that page (clears its persisted state + dispatches a `resetPage`
    custom event). This is a hand-rolled version of what native tab navigators do for
    free (tap active tab → pop to top / scroll to top).
-   **`SwipeNavigator`** (`src/components/layout/SwipeNavigator.jsx`): a global
    `window` touch listener that turns horizontal swipes into route changes across the
    tab order. It manually excludes `[data-scrollable="true"]` elements. **This is
    fragile** — a native swipe-tab navigator (or material top tabs) replaces it.
-   **`PublicBottomNav`** / **`PublicHeader`**: nav chrome for the public shelf pages.

## Data flow

Three separate persistence layers coexist today — a key source of complexity:

1. **Firebase Realtime Database** — the durable data (movies, activity, settings,
   friends, profiles). Read via `onValue` subscriptions in hooks.
2. **localStorage** — Library UI preferences (`mt_viewMode`, `mt_groupBy`,
   `mt_filter*`, `mt_sortBy`, `mt_gridSize`) via a `usePersistedState` hook defined
   _inline_ in `src/pages/Home.jsx`. Also a movies cache (`radar_movies_<uid>`) in
   `useMovies`.
3. **sessionStorage** — transient page state + scroll position
   (`pageState_home`, `pageState_browse`) via `src/hooks/usePageState.js`.

See [05-state-and-navigation.md](./05-state-and-navigation.md) for why this triad
causes the reported bugs and how the rewrite collapses it.

### Key data hooks (`src/hooks/`)

| Hook                                      | Responsibility                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useMovies.js`                            | Subscribes to `users/<uid>/movies`; exposes `movies`, `loading`, `addMovie`, `updateMovie`, `removeMovie`. Also **writes an activity log** on every mutation. Has an in-memory + localStorage cache to render instantly on remount. |
| `usePublicMovies.js`                      | Read-only movies for a `userId` (public shelf).                                                                                                                                                                                     |
| `useActivity.js` / `usePublicActivity`    | Recent activity feed.                                                                                                                                                                                                               |
| `useUserProfile.js`                       | Profile (username/displayName/pfp).                                                                                                                                                                                                 |
| `useFriends.js`, `useFriendVisibility.js` | Friend list + visibility (`public`/`friends`/`noone`).                                                                                                                                                                              |
| `useDirectorSearch.js`                    | TMDB person search + batch lookups (used in Stats).                                                                                                                                                                                 |
| `useRecentlyAddedSettings.js`             | `recentlyAddedDays`, `showRecentlyAddedSection` in settings.                                                                                                                                                                        |
| `useWatchProviderCountry.js`              | `watchProviderCountry` (default `US`) for TMDB availability.                                                                                                                                                                        |
| `usePageState.js`                         | Scroll/page-state persistence helpers (**to be removed** — see [05](./05-state-and-navigation.md)).                                                                                                                                 |

### Services / libs

-   `src/services/tmdb.js` — all TMDB REST calls (search, metadata, trending,
    by-genre, person credits, similar, season details). See
    [09-tmdb-and-firebase.md](./09-tmdb-and-firebase.md).
-   `src/lib/firebase.js` — Firebase app/auth/db init.
-   `src/lib/movieStatus.js` — the boolean status model + legacy-string migration.
-   `src/lib/services.js` — streaming service normalization + styling.
-   `src/lib/utils.js` — `cn()` (clsx+tailwind-merge), `directorToDisplayString`, etc.
-   `src/lib/migrateDatabase.js` — one-off data migration helpers.
-   `src/lib/cineby.js`, `src/lib/cropImage.js` — external-link helper / image crop.

## Feature folders (`src/features/`)

-   `auth/` — `AuthContext`, `ProtectedRoute`.
-   `movies/` — cards, rows, carousels, add/edit tab components, modals, star rating.
-   `friends/` — friend cards, request items, user search, request listener.
-   `settings/` — edit profile modal, import/export modal.

Stats sub-components live in `src/components/stats/`.

## Native shell today

Capacitor wraps the Vite web build (`capacitor.config.json`, `android/`). Native
Google sign-in uses `@codetrix-studio/capacitor-google-auth` with a fallback to web
popup (`AuthContext.jsx`). `AppUrlListener` handles deep links. **All of this is
replaced** by the RN runtime + Expo modules ([07](./07-rn-expo-stack.md)).
