// Deterministic PRNG for Browse's discovery feed (doc 04-B / 05): replaces
// legacy's per-mount Math.random() so the same day + reroll produces the same
// shuffle, letting react-query cache the feed and native scroll restore work.
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seededPick<T>(arr: T[], rand: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rand() * arr.length)];
}
