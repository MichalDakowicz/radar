// Single source of truth for service -> {color, short} (doc 04 issue H, doc 06 #2).
// Replaces the duplicated SERVICE_CONFIG (legacy lib/services.js) and the
// hardcoded icon map that used to live inside MovieCard.jsx.

export type ServiceStyle = { color: string; textColor: string; short: string };

export const SERVICE_CONFIG: Record<string, ServiceStyle> = {
  Netflix: { color: '#dc2626', textColor: '#ffffff', short: 'N' },
  'Prime Video': { color: '#00a8e1', textColor: '#ffffff', short: 'P' },
  'Disney+': { color: '#113ccf', textColor: '#ffffff', short: 'D+' },
  Hulu: { color: '#1ce783', textColor: '#052915', short: 'H' },
  Max: { color: '#7c3aed', textColor: '#ffffff', short: 'M' },
  'Apple TV+': { color: '#e5e5e5', textColor: '#111111', short: 'A+' },
  Peacock: { color: '#facc15', textColor: '#111111', short: 'Pc' },
  'Paramount+': { color: '#1d4ed8', textColor: '#ffffff', short: 'P+' },
  Fubo: { color: '#f97316', textColor: '#ffffff', short: 'Fu' },
  'Criterion Channel': { color: '#262626', textColor: '#ffffff', short: 'CC' },
  // Added for the leaving-soon catalogue: outside the US these carry real
  // weight. SkyShowtime alone is a fifth of everything expiring in Poland, so
  // omitting it would have made "leaving my services" quietly wrong there.
  SkyShowtime: { color: '#1b1f3b', textColor: '#ffffff', short: 'SS' },
  Mubi: { color: '#000000', textColor: '#ffffff', short: 'Mu' },
  Crunchyroll: { color: '#f47521', textColor: '#ffffff', short: 'Cr' },
};

export const OTHER_SERVICE_KEY = 'Other';

// Confirmed 7 (doc 06 #2) - in display order.
export const POPULAR_SERVICES = [
  'Netflix',
  'Disney+',
  'Max',
  'Prime Video',
  'Apple TV+',
  'Paramount+',
  'Hulu',
] as const;

// Everything the app has a colour and a short code for - what Settings offers
// as "my services". Popular seven first so the picker opens on the likely
// picks, then the long tail.
export const ALL_SERVICES = [
  ...POPULAR_SERVICES,
  'Peacock',
  'SkyShowtime',
  'Mubi',
  'Crunchyroll',
  'Fubo',
  'Criterion Channel',
] as const;

export function normalizeServiceName(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.toLowerCase();

  if (n.includes('netflix')) return 'Netflix';
  if (n.includes('prime') || n.includes('amazon')) return 'Prime Video';
  if (n.includes('disney')) return 'Disney+';
  if (n.includes('hulu')) return 'Hulu';
  if (n.includes('max') || n.includes('hbo')) return 'Max';
  if (n.includes('apple') || n.includes('itunes')) return 'Apple TV+';
  if (n.includes('peacock')) return 'Peacock';
  if (n.includes('paramount')) return 'Paramount+';
  if (n.includes('fubo')) return 'Fubo';
  if (n.includes('criterion')) return 'Criterion Channel';
  if (n.includes('skyshowtime')) return 'SkyShowtime';
  if (n.includes('mubi')) return 'Mubi';
  if (n.includes('crunchyroll')) return 'Crunchyroll';

  return name;
}

export function getServiceStyle(name: string | null | undefined): ServiceStyle {
  if (!name) return { color: '#404040', textColor: '#ffffff', short: '?' };
  return SERVICE_CONFIG[name] ?? { color: '#404040', textColor: '#ffffff', short: name.slice(0, 2).toUpperCase() };
}

export function isPopularService(name: string): boolean {
  return (POPULAR_SERVICES as readonly string[]).includes(name);
}

export function normalizeAvailability(availability: (string | null | undefined)[] | null | undefined): string[] {
  if (!Array.isArray(availability)) return [];
  const names = availability.map(normalizeServiceName).filter((s): s is string => !!s);
  return Array.from(new Set(names));
}

// Brand colours are the brand's, not ours, and some of them are black — MUBI is
// #000000, Criterion #262626, SkyShowtime a near-black navy. Drawn as an
// outlined badge on a dark poster those vanish completely. Rather than invent
// replacement brand colours, lift the colour just far enough to survive the
// surface it is drawn on, and only when it needs it.

/** Perceived brightness, 0–1. Rec. 709 luma, which tracks how light a colour
 *  looks far better than a plain channel average. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  if (value.length !== 6) return 1;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Below this a colour reads as "black" against the app's near-black surfaces. */
const DARK_LIMIT = 0.28;

function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0');
}

/**
 * A service colour that stays visible on a dark background. Colours already
 * bright enough are returned untouched, so Netflix red and Hulu green keep
 * being exactly themselves; only the near-blacks get blended toward white, by
 * the smallest amount that clears the limit. A black brand lands on grey rather
 * than on some other brand's colour, which keeps it distinguishable without
 * pretending to be a hue it does not have.
 */
export function onDarkColor(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const lum = luminance(hex);
  if (lum >= DARK_LIMIT) return hex;

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  // Blend toward white by t, chosen so the result's luma is exactly DARK_LIMIT.
  // luma(mix) = lum + t * (1 - lum), so t = (limit - lum) / (1 - lum).
  const t = (DARK_LIMIT - lum) / (1 - lum);
  return `#${toHex(r + (255 - r) * t)}${toHex(g + (255 - g) * t)}${toHex(b + (255 - b) * t)}`;
}
