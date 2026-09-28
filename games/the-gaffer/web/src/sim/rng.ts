// Seeded random numbers, so a world seed always rebuilds the same world (and tests are repeatable).
export type Rng = () => number;

// mulberry32: small, fast and good enough for game data.
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
export const pick = <T,>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)];
// Roughly bell-shaped noise in [-1, 1].
export const bell = (r: Rng) => (r() + r() + r()) / 1.5 - 1;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
