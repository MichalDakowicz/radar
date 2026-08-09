import type { FaceEntry, Recap } from '@/lib/recap';
import { fetchPersonImages } from '@/lib/tmdb';

// A recap's faces are counted from the cast stored on each title, and a library
// added before cast photos were stored carries names only - which is a recap of
// monograms. The count is still right, so the fix is not to re-sync the whole
// library before a report can be opened: the eight-odd people who actually make
// the cards get their headshot fetched once, at build time, and it is written
// into the payload like every other snapshotted value.

/** Faces with an id but no photo — the only ones worth a request. */
export function facesNeedingImages(actors: FaceEntry[]): number[] {
  return actors.filter((actor) => !actor.image && actor.id != null).map((actor) => actor.id as number);
}

export function applyFaceImages(actors: FaceEntry[], images: Record<number, string | null>): FaceEntry[] {
  return actors.map((actor) =>
    actor.image || actor.id == null ? actor : { ...actor, image: images[actor.id] ?? null },
  );
}

/**
 * The same recap with its faces photographed. Never throws: a build that cannot
 * reach TMDB is still a correct recap, just a monogrammed one.
 */
export async function hydrateRecapFaces<T extends Recap>(recap: T): Promise<T> {
  const missing = facesNeedingImages(recap.actors);
  if (missing.length === 0) return recap;

  try {
    const images = await fetchPersonImages(missing);
    return { ...recap, actors: applyFaceImages(recap.actors, images) };
  } catch {
    return recap;
  }
}
