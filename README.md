# Radar

**Curate your movie watchlist & collection.**

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
- **Cross-Platform:** Built to run as a responsive web app and a native Android application.

## Tech Stack

**Frontend:**
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Lucide React](https://lucide.dev/) for icons
- [Radix UI](https://www.radix-ui.com/) primitives

**Backend & Services:**
- [Firebase](https://firebase.google.com/) (Authentication, Realtime Database)
- [TMDB API](https://www.themoviedb.org/) for movie metadata

**Mobile:**
- [Capacitor](https://capacitorjs.com/) for native Android runtime

## Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase project credentials

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

3. Configure Firebase:
   - Create a `firebase.js` or `.env` configuration (refer to `src/lib/firebase.js`).
   - Ensure your Firebase Realtime Database rules allow the appropriate read/write for auth users.

4. Run the development server:
   ```bash
   npm run dev
   ```

### Mobile Build (Android)

To build and run the app on an Android device/emulator:

```bash
npm run build
npx cap sync
npx cap open android
```
