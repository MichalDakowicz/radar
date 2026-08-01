// Which titles survive the Library's streaming-service filter. Lives here
// rather than inside useLibraryFilters because the "My services" chip made it
// the one filter with real branching: three kinds of selection (a named
// service, the Other bucket, the owned-services shorthand) folded into one OR.

import { isPopularService, normalizeAvailability, OTHER_SERVICE_KEY } from '@/lib/services';
import type { Movie } from '@/types/movie';

// Sentinel chip, not a service name: "any service I said I subscribe to". Kept
// as a selection rather than expanded into individual chips so the filter
// follows the setting when subscriptions change.
export const MY_SERVICES_KEY = '__mine__';

/**
 * Drops a "My services" selection when the user has not picked any services
 * yet, so a stale chip cannot silently empty the library. A selection that
 * collapses to nothing means "no service filter".
 */
export function effectiveServiceSelection(selected: string[], ownedServices: string[]): string[] {
  if (ownedServices.length > 0) return selected;
  return selected.filter((s) => s !== MY_SERVICES_KEY);
}

/** OR across selected chips, matching the semantics of the genre/year facets. */
export function matchesServiceFilter(movie: Movie, selected: string[], ownedServices: string[] = []): boolean {
  if (selected.length === 0) return true;
  const services = normalizeAvailability(movie.availability);

  const named = selected.filter((s) => s !== OTHER_SERVICE_KEY && s !== MY_SERVICES_KEY);
  if (named.some((s) => services.includes(s))) return true;
  if (selected.includes(OTHER_SERVICE_KEY) && services.some((s) => !isPopularService(s))) return true;
  if (selected.includes(MY_SERVICES_KEY) && ownedServices.some((s) => services.includes(s))) return true;

  return false;
}
