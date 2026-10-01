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

// ---------- PR B ----------
// 2. Runs off the ball by role, while the side has the ball. Depths are from the attacking side's own goal (0-105),
// `y` across (0-68). `bd` = the ball's depth, `theirLine` = the depth of the other side's back line in the same frame
// (from OUR goal), `wide` = which touchline the player's own slot is near (-1 top, +1 bottom, 0 central).
export interface RunCtx { bd: number; by: number; theirLine: number; d: number; y: number; wide: -1 | 0 | 1 }
export interface Run { d: number; y: number; run: boolean } // run = a real run (counts against the cap of 3 at once)
const sideOf = (y: number): -1 | 0 | 1 => (y < W * 0.36 ? -1 : y > W * 0.64 ? 1 : 0);
const touch = (w: -1 | 0 | 1) => (w < 0 ? 4 : W - 4);
export function runFor(role: string, c: RunCtx): Run | null {
  const ballSide = sideOf(c.by);
  const sameFlank = c.wide !== 0 && ballSide === c.wide;
  switch (role) {
    case 'fullback': return sameFlank && c.bd > 45 && c.bd > c.d + 5 ? { d: Math.min(c.bd + 8, 88), y: touch(c.wide), run: true } : null;
    case 'wingback': return sameFlank && c.bd > 35 && c.bd > c.d ? { d: Math.min(c.bd + 10, 92), y: touch(c.wide), run: true } : null;
    case 'inverted_fullback': return c.bd > 30 ? { d: Math.max(c.d, c.bd - 18), y: W / 2 + (c.wide || 1) * 10, run: false } : null;
    case 'winger': return c.wide ? { d: c.bd > 50 ? Math.max(c.d, c.bd + 5) : c.d, y: touch(c.wide), run: false } : null;
    case 'inside_forward': return c.bd > 60 && c.wide ? { d: Math.min(c.bd + 12, 92), y: W / 2 + c.wide * 12, run: true } : null;
    case 'advanced_forward': return c.bd > 50 ? { d: Math.min(c.theirLine + 3, 96), y: c.y, run: true } : null;
    case 'target_man': return { d: Math.min(c.d, c.theirLine - 2), y: W / 2 + (c.y - W / 2) * 0.4, run: false };
    case 'false_nine': return c.bd > 35 ? { d: Math.max(c.bd - 6, c.theirLine - 14), y: W / 2 + (c.by - W / 2) * 0.3, run: false } : null;
    case 'box_to_box': case 'attacking_mid': case 'shadow_striker':
      return c.bd > 70 ? { d: 88, y: W / 2 + (c.y < W / 2 ? -6 : 6), run: true } : null;
    case 'playmaker': return { d: Math.max(6, c.bd - 8), y: c.y + (c.by - c.y) * 0.4, run: false };
    case 'holder': return { d: Math.min(c.d, Math.max(6, c.bd - 15)), y: c.y + (W / 2 - c.y) * 0.3, run: false };
    default: return null;
  }
}
export const wideOf = (y: number) => sideOf(y);

// 5. Transitions. For a short while after a turnover: the side that lost the ball counter-presses (cpress 2, or a
// high press) with its nearest 2-3 players, otherwise it races back; the side that won it breaks forward if told to.
export interface Transition { lost: 0 | 1; at: number }
// A match minute plays in a few real seconds, so the reaction is held for three beats to be visible.
export const TRANSITION_MS = (beatLen: number) => Math.max(900, beatLen * 3);

// ---------- PR C ----------
// 6. Pass and shot types. Depths are from the passing side's own goal (0-105), `y` across (0-68).
export type PassKind = 'short' | 'long' | 'through' | 'cross' | 'cutback';
export function passKind(df: number, yf: number, dt: number, yt: number, len: number): PassKind {
  const wideFrom = yf < 17 || yf > W - 17, central = Math.abs(yt - W / 2) < 18;
  if (df > 92 && wideFrom && dt < df - 2 && dt > 80 && central) return 'cutback';
  if (df > 66 && wideFrom && dt > 85 && central) return 'cross';
  if (dt - df > 16 && dt > 60) return 'through';
  if (len > 30) return 'long';
  return 'short';
}
// Peak height in metres and how much longer than a short pass the ball takes. A through ball is played into space,
// THROUGH_LEAD metres ahead of the runner.
export const ARC: Record<PassKind, { h: number; t: number }> = {
  short: { h: 0, t: 1 }, cutback: { h: 0, t: 0.9 }, through: { h: 0.4, t: 1.1 }, long: { h: 7, t: 1.5 }, cross: { h: 5, t: 1.35 },
};
export const THROUGH_LEAD = 5;
// The ball's height at t (0-1) of a flight with this peak, ending at `end` metres (a shot over the bar).
export const arcHeight = (peak: number, t: number, end = 0) => 4 * peak * t * (1 - t) + end * t;
// The engine's shot type (MatchEvent.how) decides the ball that set it up and where the shooter stands.
export function deliveryOf(how: string | undefined): PassKind | null {
  return how === 'header' || how === 'corner' || how === 'set' ? 'cross' : how === 'cutback' ? 'cutback' : how === 'through' ? 'through' : null;
}
export function shooterSpot(how: string | undefined, sy: number): { d: number; y: number } {
  if (how === 'pen') return { d: 93.5, y: W / 2 };
  if (how === 'long' || how === 'fk') return { d: 77, y: W / 2 + (sy - 50) * 0.25 };
  if (how === 'header' || how === 'corner' || how === 'set') return { d: 95, y: W / 2 + (sy - 50) * 0.1 };
  return { d: 88, y: W / 2 + (sy - 50) * 0.12 };
}
// Where a shot ends up: spread across the goal (7.32 m wide, 2.44 m high); misses go wide or over.
export const GOAL_HALF = 3.66, BAR = 2.44;
export function shotTarget(result: 'goal' | 'save' | 'miss' | 'block', r: () => number): { y: number; h: number } {
  if (result === 'miss') {
    if (r() < 0.45) return { y: W / 2 + (r() * 2 - 1) * 3, h: BAR + 0.4 + r() * 2 };
    return { y: W / 2 + (r() < 0.5 ? -1 : 1) * (GOAL_HALF + 0.6 + r() * 5), h: r() * 1.5 };
  }
  return { y: W / 2 + (r() * 2 - 1) * (GOAL_HALF - 0.4), h: r() * (BAR - 0.3) };
}

// 8. Build-up when the engine's minute has no contest to show (a quiet minute): a passing chain in the side's style.
//   possession: 5-6 short passes, back line → midfield → (a forward); balanced / high press: 3-5 the same way;
//   direct, counter, park the bus: 2-3, a long ball from the back to a forward and a lay-off; wings: back → wide
//   defender → wide forward on the same flank → inside to midfield.
export interface Mate { k: number; line: 'def' | 'mid' | 'fwd'; y: number }
const PATTERN: Record<string, ('def' | 'mid' | 'fwd' | 'wdef' | 'wfwd')[]> = {
  possession: ['def', 'def', 'mid', 'def', 'mid', 'mid', 'fwd'],
  balanced: ['def', 'mid', 'mid', 'fwd', 'mid'],
  gegenpress: ['def', 'mid', 'mid', 'fwd', 'mid'],
  direct: ['def', 'fwd', 'mid'], counter: ['def', 'fwd', 'mid'], bus: ['def', 'fwd', 'mid'],
  wings: ['def', 'wdef', 'wfwd', 'mid'],
};
const LEN: Record<string, [number, number]> = { possession: [5, 6], balanced: [3, 5], gegenpress: [3, 5], direct: [2, 3], counter: [2, 3], bus: [2, 3], wings: [3, 4] };
export function buildUp(philosophy: string, mates: Mate[], from: number, r: () => number): number[] {
  const pat = PATTERN[philosophy] ?? PATTERN.balanced, [lo, hi] = LEN[philosophy] ?? LEN.balanced;
  const n = Math.min(pat.length, lo + Math.floor(r() * (hi - lo + 1)));
  const flank = r() < 0.5 ? -1 : 1;
  const out: number[] = [];
  let prev = from;
  for (let i = 0; i < n; i++) {
    const want = pat[i];
    const wide = want === 'wdef' || want === 'wfwd';
    const line = want === 'wdef' ? 'def' : want === 'wfwd' ? 'fwd' : want;
    let c = mates.filter((x) => x.line === line && x.k !== prev);
    if (wide) { const w = c.filter((x) => (x.y - W / 2) * flank > 8); if (w.length) c = w; }
    // Before the ball goes wide, it starts with a centre-back (not the full-back who gets the next pass).
    else if (pat[i + 1] === 'wdef') { const m = c.filter((x) => Math.abs(x.y - W / 2) <= 8); if (m.length) c = m; }
    if (!c.length) c = mates.filter((x) => x.k !== prev);
    if (!c.length) break;
    prev = c[Math.floor(r() * c.length)].k;
    out.push(prev);
  }
  return out;
}
