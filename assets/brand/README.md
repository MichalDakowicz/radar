# Radar brand assets

The mark is a radar scope: an open ring sweeping around a play head, with the
blip breaking out of the gap - one title, spotted. Everything is drawn on a
64x64 grid so it stays crisp at 16px in the header and at 1024px as an app icon.

| File               | Use                                                                  |
| ------------------ | -------------------------------------------------------------------- |
| `logo.svg`         | The mark. Imported as a component (`import Logo from '@/assets/brand/logo.svg'`). |
| `logo-mono.svg`    | Single-colour mark using `currentColor` - pass `color` to tint it.    |
| `splash.svg`       | The mark, for splash/launch surfaces.                                |
| `wordmark.svg`     | Mark + "Radar" lockup, dark text (for light backgrounds).            |
| `wordmark-dark.svg`| Same lockup, light text (for dark backgrounds).                      |

`logo.svg` is the single source of truth for every PNG in `assets/images/`.
After editing it, regenerate them:

```bash
npm run icons
```

The iOS icon (`assets/expo.icon/`) carries its own white-on-gradient copy of the
mark in `Assets/radar-mark.svg`, since Apple's icon composer applies the
gradient fill itself.

## Palette

The gradient runs `#7DB3FB` -> `#3B82F6` -> `#6366F1`. `#3B82F6` is the
`--primary` token from `src/theme/colors.ts`; the backdrop everywhere is
`#09090B` (`--background`).
