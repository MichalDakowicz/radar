# Radar update notes

Written per `UPDATE-schema.md`. Newest version first.

## 2.2.0 — Unreleased

### Added

- Tap the poster on a movie or show to see it full size, then save or copy the artwork

### Changed

- Movie and show detail leads with a bigger poster on the right of the header
- Title, cast, genres and overview are read-only on detail; rating and notes stay editable

## 2.1.0 — 31.07.2026

### Added

- Pin a top 4 of favourite movies and shows to your profile from Settings › Account
- A shelf you visit leads with that person's top 4, above their collection
- Radar tells you when a newer version is out and downloads the APK from GitHub for you
- Settings › About shows the installed version and checks for a new build on demand
- On the web build, `1`–`9` jump between tabs, `n` opens Add, and `/` focuses search

### Changed

- Browse opens straight into the discovery feed instead of loading it on first visit
- Wide screens keep content centred and readable instead of stretching edge to edge
- TMDB requests back off and retry when rate-limited, so posters and cast load more reliably
