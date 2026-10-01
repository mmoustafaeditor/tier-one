// The live pitch's movement rules (UI only, plan: "خطة تحسين حركة اللاعيبة", PR A). Nothing here decides anything: the
// engine's minute (m.flow, m.events) is the truth; these rules only make the 2D picture move like football.
//   1. Speed and stamina: a player's top speed comes from his pace, and drops when his match fitness runs low.
//   3. The back line moves as one: one depth for the whole line, stepping up after a backward pass and dropping when the
//      ball carrier has time; midfield stays 8-16 m in front of it, the forwards within 38 m out of possession.
//   4. Pressing with cover: the pressing level sets where the press starts; the presser stands between the ball and his
//      own goal, a second player covers 7 m behind him; pressing roles go first, hold-shape roles never press.
import type { LiveMatch } from '../../sim/match';
import type { World } from '../../sim/world';

export const L = 105, W = 68;
export type Pt = { x: number; y: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// 1. Speed: 1 = an average player. Pace 40 → 0.8, pace 95 → 1.2; below 60% match fitness, up to 20% slower.
export function speedRatio(pace: number, fit: number): number {
  const base = clamp(0.8 + (0.4 * (pace - 40)) / 55, 0.75, 1.2);
  const legs = fit < 60 ? 0.8 + (0.2 * Math.max(0, fit)) / 60 : 1;
  return base * legs;
}
export function speedsOf(m: LiveMatch, world: World): number[][] {
  return m.sides.map((s) => s.onPitch.map((id) => {
    if (!id) return 1;
    const p = world.players.find((x) => x.id === id);
    return speedRatio(p?.attrs[0] ?? 60, m.fit?.[id] ?? 100);
  }));
}

// How far a player gets this frame towards where he wants to be. `ms` = real ms per match minute (the speed setting);
// the time constant is the same as before for an average player, so the picture's pace stays familiar.
export function step(p: Pt, t: Pt, dt: number, ms: number, ratio: number): Pt {
  const ease = 1 - Math.exp((-dt * ratio) / Math.max(120, ms * 0.9));
  return { x: p.x + (t.x - p.x) * ease, y: p.y + (t.y - p.y) * ease };
}

// 3. One depth for the whole back line (from this side's own goal line, in metres).
export interface LineState { depth: number; at: number }
export function lineDepth(defDepths: number[], prev: LineState | undefined, adjust: number, now: number): LineState {
  if (!defDepths.length) return prev ?? { depth: 20, at: now };
  const want = defDepths.reduce((s, d) => s + d, 0) / defDepths.length + adjust;
  const depth = prev ? prev.depth + (want - prev.depth) * Math.min(1, (now - prev.at) / 400) : want;
  return { depth: clamp(depth, 6, 70), at: now };
}

// 4. Who presses, who covers. `slots` = the defending side's outfield slots on the pitch; `pos` their positions;
// `ballDepth` = how far the ball is from the DEFENDING side's own goal; `pressing` 0 sit off / 1 mid-block / 2 hunt high.
export interface PressPlan { press: number[]; cover: number; trigger: boolean }
const START = [50, 68, 105]; // the press starts when the ball is within this many metres of the defenders' own goal
export function pressShape(slots: number[], pos: Pt[], ball: Pt, ballDepth: number, pressing: 0 | 1 | 2, oop: (k: number) => string): PressPlan {
  const none = { press: [], cover: -1, trigger: false };
  if (ballDepth > START[pressing]) return none;
  const can = slots.filter((k) => pos[k] && oop(k) !== 'hold_shape');
  const near = can.sort((a, b) => dist(pos[a], ball) - dist(pos[b], ball));
  const n = pressing === 2 ? 2 : 1;
  // Pressing roles step in first when they're about as close as the nearest man (within 6 m).
  const d0 = near.length ? dist(pos[near[0]], ball) : 0;
  const eager = near.filter((k) => (oop(k) === 'press_forward' || oop(k) === 'ball_winner') && dist(pos[k], ball) <= d0 + 6);
  const press = [...new Set([...eager, ...near])].slice(0, n);
  const cover = near.find((k) => !press.includes(k)) ?? -1;
  // Pressing trigger: the ball near a touchline traps the man on it.
  const trigger = ball.y < 9 || ball.y > W - 9;
  return { press, cover, trigger };
}
// Where the presser stands (between the ball and his own goal) and where the cover sits (7 m behind, same line).
export function pressSpot(ball: Pt, ownGoal: Pt, gap: number): Pt {
  const d = dist(ball, ownGoal) || 1;
  return { x: ball.x + ((ownGoal.x - ball.x) / d) * gap, y: ball.y + ((ownGoal.y - ball.y) / d) * gap };
}
