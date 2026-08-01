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
