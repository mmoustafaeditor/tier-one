// Phase 1 of the pitch plan: each player's body (ui2/pitch/body.ts). Checks that the derived values move the right way
// with the attributes they come from, that the same player always gets the same body, and that one movement step never
// beats the player's top speed, acceleration or turning.
import { generateWorld } from '../src/sim/world';
import { bodyOf, move, reactMs } from '../src/ui2/pitch/body';
import { T } from '../src/ui2/pitch/tuning';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const w = generateWorld(7);
const ps = w.players.slice(0, 3000);
const corr = (xs: number[], ys: number[]) => {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let c = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { c += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; }
  return c / Math.sqrt(vx * vy);
};
const B = ps.map((p) => bodyOf(p, 100, 2026));
ok(corr(ps.map((p) => p.attrs[0]), B.map((b) => b.top)) > 0.95, 'faster players have a higher top speed');
ok(corr(ps.map((p) => p.attrs[0]), B.map((b) => b.acc)) > 0.6, 'faster players accelerate quicker');
ok(corr(ps.map((p) => p.attrs[3]), B.map((b) => b.turn)) > 0.6, 'better dribblers turn sharper');
ok(corr(ps.map((p) => p.rating), B.map((b) => b.reads)) > 0.5, 'better players read the game sooner');
ok(corr(ps.map((p) => p.attrs[5]), B.map((b) => b.tank)) > 0.9, 'stronger players have a bigger sprint tank');
const tired = ps.map((p) => bodyOf(p, 45, 2026));
ok(tired.every((b, i) => b.top < B[i].top && b.tank < B[i].tank && b.turn < B[i].turn), 'a tired player (45% match fitness) is slower, turns worse and has a smaller tank');
ok(ps.every((p, i) => JSON.stringify(bodyOf(p, 100, 2026)) === JSON.stringify(B[i])), 'the same player always gets the same body');
ok(reactMs(0.95, 400) < reactMs(0.05, 400) && reactMs(0.5, 10) >= T.REACT_MS[0] && reactMs(0.5, 1e5) <= T.REACT_MS[1], 'reaction: sooner for a better reader, within the bounds');

// Random steps: never beyond top speed, acceleration or turning.
let worst = { v: 0, a: 0, t: 0 };
let seed = 1;
const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let i = 0; i < 20000; i++) {
  const b = B[i % B.length], tau = 120 + r() * 3000, dt = 1 + r() * 79, boost = 1 + r();
  const vmax = (T.VMAX * b.top * boost) / tau;
  const k = { x: r() * 105, y: r() * 68, vx: (r() - 0.5) * 2 * vmax, vy: (r() - 0.5) * 2 * vmax };
  const n = move(k, r() * 105, r() * 68, dt, tau, b, boost);
  const s0 = Math.hypot(k.vx, k.vy), s1 = Math.hypot(n.vx, n.vy);
  worst.v = Math.max(worst.v, s1 / Math.max(vmax, s0));
  worst.a = Math.max(worst.a, Math.hypot(n.vx - k.vx, n.vy - k.vy) / ((vmax / (T.ACC_TAU * tau)) * b.acc * dt));
  if (s0 > T.TURN_SPEED * vmax && s1 > 1e-9) {
    let da = Math.atan2(n.vy, n.vx) - Math.atan2(k.vy, k.vx);
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    // The acceleration step can add a little swing on top of the turn limit; it stays small.
    worst.t = Math.max(worst.t, Math.abs(da) / ((T.TURN * b.turn * dt) / tau + Math.asin(Math.min(1, ((vmax / (T.ACC_TAU * tau)) * b.acc * dt) / s0))));
  }
}
ok(worst.v <= 1.0001, `never faster than top speed (or his speed coming in): ${worst.v.toFixed(3)}`);
ok(worst.a <= 1.0001, `never beyond his acceleration: ${worst.a.toFixed(3)}`);
ok(worst.t <= 1.0001, `never turns beyond his limit: ${worst.t.toFixed(3)}`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
