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

// ---------- v2: one seeded stream per purpose ----------
// FNV-1a, 32 bit. The one string hash new code uses (the older per-file helpers stay only where changing them would
// re-roll existing saves).
export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// All new randomness goes through here: the same seed, stream and keys always give the same numbers, whatever else
// happened in between (V2_DESIGN §7.5).
export const rngFor = (seed: number, stream: string, ...keys: (string | number)[]): Rng => makeRng(hash32(`${seed >>> 0}|${stream}|${keys.join('|')}`));
