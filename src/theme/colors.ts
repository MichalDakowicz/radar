import { vars } from 'nativewind';

/**
 * Ported 1:1 from the current app's src/index.css HSL tokens (doc 10) so
 * bg-background/text-foreground/etc resolve to the same colors as today.
 */
const dark = {
  '--background': '0 0% 3.9%',
  '--foreground': '0 0% 98%',
  '--card': '0 0% 3.9%',
  '--card-foreground': '0 0% 98%',
  '--popover': '0 0% 3.9%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '217 91% 60%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 14.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '0 0% 14.9%',
  '--muted-foreground': '0 0% 63.9%',
  '--accent': '0 0% 14.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 62.8% 30.6%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 14.9%',
  '--input': '0 0% 14.9%',
  '--ring': '217 91% 60%',
};

const light = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 9%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 9%',
  '--primary': '158 64% 42%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 96%',
  '--secondary-foreground': '0 0% 9%',
  '--muted': '0 0% 96%',
  '--muted-foreground': '0 0% 45%',
  '--accent': '0 0% 96%',
  '--accent-foreground': '0 0% 9%',
  '--destructive': '0 62.8% 40%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 90%',
  '--input': '0 0% 90%',
  '--ring': '217 91% 52%',
};

export const themeVars = {
  dark: vars(dark),
  light: vars(light),
};

// Raw (unwrapped) maps, for also writing these vars onto document.documentElement
// on web - see ThemeProvider's comment on why that's needed.
export const rawThemeVars = { dark, light };

export type ResolvedTheme = keyof typeof themeVars;
