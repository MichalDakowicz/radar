<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
    <img src="assets/brand/wordmark.svg" alt="Radar" width="240">
  </picture>
</p>

<p align="center"><strong>Curate your movie watchlist &amp; collection.</strong></p>

Radar is a modern, cross-platform application designed for movie enthusiasts to track, manage, and share their watchlist. Radar helps you keep a beautiful digital archive of your watchlist.

## Features

- **Unified Collection:** Manage all your formats (Digital, DVD, Blu-ray, VHS) in one place.
- **TMDB Integration:** Easily add movies by searching the TMDB database to auto-fill metadata and posters.
- **Social & Friends:** Connect with other users, send friend requests, and browse your friends' public libraries.
- **Deep Statistics:** Visualize your collection with charts showing genre distribution, library value, format metrics, and viewing habits.
- **Watch History:** Log your "watches" and keep a history of what you've been watching.
- **Public Shelf:** Share a read-only link to your collection so anyone can browse your library.
- **Rich Organization:** Filter and group by Director, Genre, Year, Format, or Status (Watchlist, Watched, etc.).
- **Data Management:** Easy JSON import/export to backup your hard-curated data.
- **Preloaded Browse:** The discovery feed warms in the background after login, so the first open of the Browse tab is instant instead of a spinner.
- **Cross-Platform:** A single Expo codebase running as a native iOS and Android app, plus a responsive web build.

## Tech Stack

**App:**
- [Expo](https://expo.dev/) + [React Native](https://reactnative.dev/) (`react-native-web` for web)
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing
- [NativeWind](https://www.nativewind.dev/) / [TailwindCSS](https://tailwindcss.com/) for styling
- [TanStack Query](https://tanstack.com/query) for data fetching & caching
- [Zustand](https://zustand-demo.pmnd.rs/) for local state
- [Lucide](https://lucide.dev/) icons, [Reanimated](https://docs.swmansion.com/react-native-reanimated/) + [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)

**Backend & Services:**
- [Supabase](https://supabase.com/) (Auth, Postgres, Realtime)
- [TMDB API](https://www.themoviedb.org/) for movie metadata

## Getting Started

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) project
- A [TMDB API](https://www.themoviedb.org/settings/api) read access token

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MichalDakowicz/radar.git
   cd radar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Create a `.env` file in the project root:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_TMDB_ACCESS_TOKEN=your-tmdb-read-access-token
   ```

4. Start the dev server:
   ```bash
   npm start
   ```
   Then press `i` (iOS), `a` (Android), or `w` (web) — or scan the QR code with Expo Go / a dev client.

### Native Builds

Run directly on a device/emulator:

```bash
npm run android   # build & run on Android
npm run ios       # build & run on iOS
```
