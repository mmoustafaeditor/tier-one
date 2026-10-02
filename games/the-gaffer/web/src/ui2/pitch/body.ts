// Phase 1 of the plan "محرك ماتش FM26": each player's body and how he reads the game. The game's players have seven
// attributes (pace, shooting, passing, dribbling, defending, physical, goalkeeping), so what FM calls Acceleration,
// Agility and Anticipation are derived here from what we have (as engine/referee.ts derives aggression): the same
// player always gets the same values, and no save needs a new field. Presentation only.
import type { LiveMatch } from '../../sim/match';
import type { Player, Position } from '../../model/types';
import type { World } from '../../sim/world';
import { speedRatio } from './move';
import { T } from './tuning';

export interface Body {
  top: number;   // top speed vs an average player (pace, match fitness)
  acc: number;   // acceleration vs average (pace, dribbling, fitness)
  turn: number;  // agility vs average (dribbling, physique, fitness)
  reads: number; // reading the game 0-1 (experience, level, the skill his position leans on): how soon he reacts
  tank: number;  // sprint capacity 0-1 (physique, match fitness)
  touch: number; // first touch 0-1 (dribbling, passing): how far a ball he fails to control gets away from him
  // Hidden traits (A4), like the injury proneness: worked out from what the save already has (attributes, rating, age,
  // a fixed per-player draw), never stored. Two players in the same role move differently because of them.
  offBall: number; // movement off the ball 0-1: how often he makes his role's run, and how far
  work: number;    // work rate 0-1: how hard he gets back and presses after losing it
  calm: number;    // composure 0-1: how much pace he keeps on the ball when pressed
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
// The skill a position reads the game with: defenders defending, midfielders passing, forwards shooting.
const READ_SKILL: Record<Position, number> = { GK: 6, CB: 4, LB: 4, RB: 4, CDM: 4, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 1 };

// The skill a position makes its runs with: forwards shooting, midfielders passing, full-backs pace.
const RUN_SKILL: Partial<Record<Position, number>> = { ST: 1, LW: 1, RW: 1, CAM: 2, CM: 2, CDM: 2, LB: 0, RB: 0, CB: 4, GK: 6 };
// A hidden trait 0-1: the player's level (rating), a skill it leans on, experience (a little), and his own draw (a third).
function trait(p: Player, key: string, perRating: number, skill: number, youthPenalty: number, age: number): number {
  const u = (hash(`${key}:${p.id}`) % 1000) / 1000;
  return clamp(0.5 + (p.rating - 65) * perRating + (0.25 * (skill - 60)) / 40 + 0.35 * (u - 0.5) - youthPenalty * clamp(21 - age, 0, 4) * 0.02, 0.05, 0.95);
}
export function bodyOf(p: Player, fit: number, season: number): Body {
  const [pace = 60, , pass = 60, drib = 60, , phys = 60] = p.attrs;
  const legs = fit < 60 ? 0.8 + (0.2 * Math.max(0, fit)) / 60 : 1;
  const u = (hash(`reads:${p.id}`) % 1000) / 1000;
  const age = season - p.birthYear;
  const skill = p.attrs[READ_SKILL[p.position]] ?? 60;
  return {
    top: speedRatio(pace, fit),
    acc: clamp(0.75 + (0.5 * (0.6 * pace + 0.4 * drib - 40)) / 55, 0.7, 1.25) * legs,
    turn: clamp(0.8 + (0.4 * (0.7 * drib + 0.3 * (100 - phys) - 40)) / 55, 0.75, 1.2) * (fit < 60 ? 0.85 + (0.15 * Math.max(0, fit)) / 60 : 1),
    reads: clamp(0.3 + (p.rating - 65) * 0.012 + clamp(age - 20, 0, 12) * 0.015 + (0.2 * (skill - 60)) / 40 + 0.2 * (u - 0.5), 0.05, 0.95),
    tank: clamp(0.5 + (0.5 * (phys - 40)) / 55, 0.4, 1) * clamp(fit / 100, 0.3, 1),
    touch: clamp((0.7 * drib + 0.3 * pass - 40) / 50, 0, 1),
    offBall: trait(p, 'run', 0.012, p.attrs[RUN_SKILL[p.position] ?? 2] ?? 60, 0, age),
    work: trait(p, 'work', 0.006, phys, 0.5, age),
    calm: trait(p, 'calm', 0.014, 0.5 * pass + 0.5 * drib, 0, age),
  };
}
export function bodiesOf(m: LiveMatch, world: World): Body[][] {
  const season = m.season ?? 2026;
  return m.sides.map((s) => s.onPitch.map((id) => {
    const p = id ? world.players.find((x) => x.id === id) : undefined;
    return p ? bodyOf(p, m.fit?.[id] ?? 100, season) : { top: 1, acc: 1, turn: 1, reads: 0.5, tank: 0.7, touch: 0.5, offBall: 0.5, work: 0.5, calm: 0.5 };
  }));
}
// Reaction to a new ball, in display ms (a better reader reacts sooner).
export const reactMs = (reads: number, beatLen: number) => {
  const f = T.REACT[1] - (T.REACT[1] - T.REACT[0]) * reads;
  return clamp(f * beatLen, T.REACT_MS[0], T.REACT_MS[1]);
};
export const decideMs = (beatLen: number) => clamp(T.DECIDE * beatLen, T.DECIDE_MS[0], T.DECIDE_MS[1]);

// One frame of movement: the player wants to go at the speed that closes the gap (as before, so the picture keeps its
// pace) but can't beat his top speed, his acceleration or his turning. `v` is his velocity (metres per ms), updated.
export interface Kin { x: number; y: number; vx: number; vy: number }
export function move(k: Kin, tx: number, ty: number, dt: number, tau: number, b: Body, boost: number, urgent = false): Kin {
  const vmax = (T.VMAX * b.top * boost) / tau;
  // An urgent run (blocking a shot) is flat out until close, then a stop; otherwise a player eases into his spot (his
  // speed falls with the distance left).
  const gain = urgent ? T.URGENT_GAIN : 1;
  let dx = ((tx - k.x) * b.top * boost * gain) / tau, dy = ((ty - k.y) * b.top * boost * gain) / tau;
  const want = Math.hypot(dx, dy);
  if (want > vmax) { dx *= vmax / want; dy *= vmax / want; }
  // Turning: at speed, the direction can only swing so far this frame.
  const sp = Math.hypot(k.vx, k.vy);
  if (sp > T.TURN_SPEED * vmax && want > 1e-9) {
    const a0 = Math.atan2(k.vy, k.vx), a1 = Math.atan2(dy, dx);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const lim = (T.TURN * b.turn * dt) / tau;
    if (Math.abs(da) > lim) {
      const a = a0 + Math.sign(da) * lim, m = Math.min(Math.hypot(dx, dy), sp);
      dx = Math.cos(a) * m; dy = Math.sin(a) * m;
    }
  }
  // Acceleration: the velocity can only change so much this frame.
  const amax = (vmax / (T.ACC_TAU * tau)) * b.acc * dt;
  let ax = dx - k.vx, ay = dy - k.vy;
  const am = Math.hypot(ax, ay);
  if (am > amax) { ax *= amax / am; ay *= amax / am; }
  const vx = k.vx + ax, vy = k.vy + ay;
  return { x: k.x + vx * dt, y: k.y + vy * dt, vx, vy };
}
