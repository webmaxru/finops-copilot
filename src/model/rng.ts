// Deterministic, seedable pseudo-random utilities used by the simulation
// engine so that results are stable across re-renders for a given input.

/** mulberry32 PRNG: returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box-Muller from a uniform generator. */
export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Log-normal sample with a target arithmetic mean and coefficient of
 * variation (cv = stddev / mean). cv <= 0 returns the mean exactly.
 */
export function lognormal(rng: () => number, mean: number, cv: number): number {
  if (cv <= 0 || mean <= 0) return mean;
  const sigma2 = Math.log(1 + cv * cv);
  const mu = Math.log(mean) - sigma2 / 2;
  return Math.exp(mu + Math.sqrt(sigma2) * gaussian(rng));
}
