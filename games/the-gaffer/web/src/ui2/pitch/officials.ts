// The officials on the pitch: the referee and his two assistants, and the VAR monitor at the side of the pitch.
// Presentation only (the referee's decisions are the engine's: engine/referee.ts and the event log). The referee
// follows play on a diagonal, a dozen metres from the ball and out of the passing lanes; each assistant runs one half
// along his own touchline (the top one on the right half, the bottom one on the left, the diagonal system), level with
// the second-last defender of the side defending that half, or with the ball when it is nearer the goal line. An
// on-field review: the referee jogs to the monitor by the halfway line and watches it.
import type { Pt } from './move';
import { L, W } from './move';

export interface Officials {
  ref: Pt;
  ar: [Pt, Pt];                // [0] top touchline (right half), [1] bottom touchline (left half)
  review: { from: number; until: number } | null; // an on-field review (minute clock, ms)
}
export const MONITOR: Pt = { x: L / 2 + 4, y: W + 2.6 };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const newOfficials = (): Officials => ({ ref: { x: L / 2 - 8, y: W / 2 + 10 }, ar: [{ x: L * 0.75, y: -1.2 }, { x: L * 0.25, y: W + 1.2 }], review: null });

// Where each official wants to be. `lastDef[s]`: the depth (x) of side s's second-last defender, its own goal at x 0
// (side 0) or x L (side 1). `reviewing`: the referee is at the monitor.
export function officialTargets(ball: Pt, attacking: 0 | 1, lastDef: [number, number], reviewing: boolean): { ref: Pt; ar: [Pt, Pt] } {
  // The referee: behind and to the side of play (left diagonal, as most referees run it), keeping out of the middle.
  const back = attacking === 0 ? -1 : 1;
  const ref = reviewing ? { x: MONITOR.x - 1.6, y: W - 0.5 } : {
    x: clamp(ball.x + back * 9, 8, L - 8),
    y: clamp(ball.y + (ball.y < W / 2 ? 11 : -11), 4, W - 4),
  };
  // Assistants: the top one runs the right half (side 1 defends x = L), the bottom one the left half (side 0, x = 0).
  const top = clamp(Math.max(lastDef[1], ball.x), L / 2, L - 0.5);
  const bottom = clamp(Math.min(lastDef[0], ball.x), 0.5, L / 2);
  return { ref, ar: [{ x: top, y: -1.2 }, { x: bottom, y: W + 1.2 }] };
}

// Move them (a referee jogs; an assistant side-steps quickly along his line). `secMs`: screen ms per second of play.
export function moveOfficials(o: Officials, t: { ref: Pt; ar: [Pt, Pt] }, dt: number, secMs: number, snap: boolean) {
  const step = (p: Pt, q: Pt, v: number) => {
    if (snap) return { ...q };
    const d = Math.hypot(q.x - p.x, q.y - p.y), s = (v * dt) / secMs;
    if (d <= s || d < 0.05) return { ...q };
    // ease in over the last few metres, as a person does
    const k = Math.min(s, d * Math.min(1, dt / (secMs * 0.6)) + s * 0.2);
    return { x: p.x + ((q.x - p.x) / d) * k, y: p.y + ((q.y - p.y) / d) * k };
  };
  o.ref = step(o.ref, t.ref, 6.5);
  o.ar = [step(o.ar[0], t.ar[0], 7), step(o.ar[1], t.ar[1], 7)];
}

// A referee's kit that stands out from both teams' (black, yellow, red or teal; the one furthest from both).
const hex = (c: string) => { const h = c.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export function refKit(kits: string[]): string {
  const opts = ['#111111', '#ffd400', '#e53935', '#00acc1'];
  let best = opts[0], bd = -1;
  for (const c of opts) {
    const a = hex(c);
    const d = Math.min(...kits.map((k) => { try { const b = hex(k); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } catch { return 999; } }));
    if (d > bd) { bd = d; best = c; }
  }
  return best;
}
