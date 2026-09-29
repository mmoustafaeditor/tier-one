// Seeded RNG shared by every v3 simulation. mulberry32 over an FNV-1a string hash.
// The same helpers are meant to be the engine's RNG, so client, server and sims agree bit for bit.
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export class RNG {
  constructor(seed) { this.s = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed)); }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
  chance(p) { return this.next() < p; }
  pick(a) { return a[this.int(a.length)]; }
  // index drawn from a probability vector
  w(p) { let r = this.next(), i = 0; for (; i < p.length - 1; i++) { r -= p[i]; if (r < 0) return i; } return i; }
  shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = this.int(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; }
}

export const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
export const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
export const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); const i = (b.length - 1) * p; const lo = Math.floor(i); return b[lo] + (b[Math.ceil(i)] - b[lo]) * (i - lo); };
export const pct = (x, d = 0) => (100 * x).toFixed(d) + '%';
