# 10 — Code Conventions & Structure

Explicit client requirement: **full rewrite**, **styling present on every screen**,
**separate elements into components**, **avoid unnecessarily large files**. This doc is
the standard the rewrite is held to. It exists because the current app violates it
(`Home.jsx` ~1200, `Browse.jsx` ~1000, `EditMovie.jsx` ~1400 lines mixing data logic
and giant JSX).

## File size & responsibility

-   **Soft cap ~200 lines per file; hard cap ~300.** If a screen file grows past it,
    extract components/hooks — do not scroll past a wall of JSX.
-   **One component per file** (plus tiny private helpers). Named exports.
-   A **screen** (`app/**/*.tsx`) is a thin composition layer: it wires hooks to
    presentational components and lays them out. **No business logic, no data massaging,
    no 300-line `useMemo` chains** in a screen file.

## Separation of concerns

Split every non-trivial screen into these layers:

1. **Route/screen** (`app/(tabs)/index.tsx`) — composition + layout only.
2. **Feature hooks** (`features/library/useLibraryFilters.ts`) — all derive/memo/filter/
   sort logic; returns plain data + handlers. Unit-testable without rendering.
3. **Presentational components** (`components/**`, `features/**`) — receive props,
   render, style. No Firebase/TMDB imports.
4. **Pure functions** (`lib/**`) — `normalizeMovie`, `buildMoviePayload`,
   `movieStatus`, `stripUndefined`, seeded shuffle. Fully testable, no React.

Example (Library): `LibraryScreen` (compose) → `useLibraryFilters` (logic) →
`LibraryToolbar` / `LibraryFilterSheet` / `LibrarySection` / `LibraryGrid` /
`MovieCard` (view). Mirror this shape for Browse, Edit, Stats
([03](./03-feature-inventory.md) has per-screen splits).

## Proposed folder layout

```
app/                      # Expo Router routes only (thin)
components/
  ui/                     # Button, Badge, Sheet, LoadingState, EmptyState, ErrorState, Toast
  media/                  # MovieCard, MovieRow, MediaCarousel, ServiceBadges
  stats/                  # ported stat widgets (one per file)
features/
  auth/                   # AuthProvider, useAuth, google sign-in
  library/                # useLibraryFilters, LibraryToolbar, sections, reorder
  browse/                 # useDiscoveryFeed, useBrowseSearch, BrowseHero, DiscoveryRow
  movies/                 # useEditMovieForm, edit tabs, add flow
  stats/                  # useHallOfFame, streak selectors
  friends/                # friend hooks + cards
  settings/
hooks/                    # cross-feature hooks (useMovies, useWatchProviderCountry, ...)
lib/                      # supabase, tmdb, movieStatus, services, normalize, utils
store/                    # zustand stores (filters, prefs) + MMKV persistence
theme/                    # NativeWind tokens, colors
```

## Styling rules

-   **Every component ships styled** — no unstyled placeholders left behind, per the
    client's requirement. Port the current Tailwind classes to NativeWind as you build
    each screen.
-   Use **theme tokens** (`bg-background`, `text-foreground`, `text-primary`,
    `bg-muted`, `border-border`) mirrored from the current `ThemeContext`, not hardcoded
    hex — so light/dark and future re-theming work.
-   Centralize repeated styling in **variants** (`cva`) or small styled wrappers, not
    copy-pasted class strings. The current app repeats the same card/badge class strings
    many times — consolidate.
-   Consistent spacing/typography scale; reuse `MovieCard`/`MediaCarousel` everywhere a
    poster row appears (Library sections, Browse, Hall of Fame) instead of re-styling.

## TypeScript

-   Rewrite in **TS**. Define `Movie`, `Ratings`, `ActivityEvent`, `Profile`,
    `ServiceName` types from [02](./02-data-model.md); use them at every boundary.
-   `normalizeMovie(raw): Movie` is the single read boundary; screens consume `Movie`,
    never raw Firebase snapshots.

## Data-access rules

-   Presentational components never import `supabase`/`tmdb` — they take props.
-   All server reads go through hooks backed by **react-query**; all writes through the
    `useMovies` mutation helpers (with activity logging + `stripUndefined`).
-   Durable UI prefs go through the **zustand+MMKV** store, never `AsyncStorage` ad hoc,
    never `sessionStorage`-style hacks.

## Testing

-   Unit test the pure `lib/` functions first: `movieStatus`, `normalizeMovie`,
    `buildMoviePayload`, seeded shuffle. These encode the subtle rules (status mutual
    exclusion, rewatch, hall-of-fame threshold) and prevent regressions.

## Lint/format

-   ESLint (RN + hooks rules) + Prettier. Enforce the file-size cap via review, and
    `eslint-plugin-import` for folder boundaries (features shouldn't import screens, ui
    shouldn't import features).
