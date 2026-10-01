// Phase 2 of the plan "محرك ماتش FM26": the defence as a group (presentation only). FM26's known weak spots are exactly
// here (full-backs who chase and never catch, centre-backs who don't cover, keepers glued to the near post, defenders
// who only block once the shot is coming), so each rule below is one of those, done on purpose.
//   marking  every attacker near our goal gets a man: zonal by default (the nearest free defender or midfielder takes
//            whoever enters his area), man-marking when the tactics name an opponent; markers stand goal-side
//   slide    the back line shifts across towards the ball as one and stays compact, so the far side is given up,
//            not the middle
//   double   a carrier wide in our third gets a second man
//   keeper   on the bisector of the shooting angle (the ball and both posts), further out when the ball is further away
//   block    a carrier in our box: the nearest defender steps into the line between him and the goal at once
import type { Pt } from './move';
import { W } from './move';
import { T } from './tuning';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const GOAL_HALF = 3.66;

// Who marks whom. `markers` = free defenders and midfielders (not pressing); `threats` = attackers near our goal, most
// dangerous first. A man-marking instruction pairs its target first. Returns marker slot → threat slot.
export interface Threat { k: number; p: Pt }
// `cost(marker, threat)` ranks the candidates (by default the distance); the caller uses it to send a midfielder, not a
// centre-back, to a man standing in front of the line.
export function assignMarks(markers: { k: number; p: Pt }[], threats: Threat[], man?: { threat: number; prefer: number[] }, cost: (m: { k: number; p: Pt }, t: Threat) => number = (m, t) => dist(m.p, t.p), reach = T.MARK_REACH): Map<number, number> {
  const out = new Map<number, number>();
  const used = new Set<number>();
  if (man) {
    const t = threats.find((x) => x.k === man.threat);
    const m = t && markers.filter((x) => man.prefer.includes(x.k)).sort((a, b) => dist(a.p, t.p) - dist(b.p, t.p))[0];
    if (t && m) { out.set(m.k, t.k); used.add(m.k); }
  }
  for (const t of threats) {
    if ([...out.values()].includes(t.k)) continue;
    const m = markers.filter((x) => !used.has(x.k) && dist(x.p, t.p) < reach).sort((a, b) => cost(a, t) - cost(b, t))[0];
    if (m) { out.set(m.k, t.k); used.add(m.k); }
  }
  return out;
}
// Goal-side of his man, a little towards the ball: tight near goal, looser further out.
export function markSpot(t: Pt, ownGoal: Pt, ball: Pt): Pt {
  const g = dist(t, ownGoal);
  const gap = g < 20 ? T.MARK_TIGHT : T.MARK_LOOSE;
  const ux = (ownGoal.x - t.x) / (g || 1), uy = (ownGoal.y - t.y) / (g || 1);
  const bx = ball.x - t.x, by = ball.y - t.y, bl = Math.hypot(bx, by) || 1;
  return { x: t.x + ux * gap + (bx / bl) * 0.8, y: t.y + uy * gap + (by / bl) * 0.8 };
}
// The back line's sideways shift: towards the ball, compact (at most LINE_WIDTH between its outer men).
export function slideY(ys: number[], ballY: number): number[] {
  if (!ys.length) return ys;
  const mid = ys.reduce((a, b) => a + b, 0) / ys.length;
  const centre = mid + (ballY - mid) * T.SLIDE;
  const lo = Math.min(...ys), hi = Math.max(...ys), w = hi - lo;
  const k = w > T.LINE_WIDTH ? T.LINE_WIDTH / w : 1;
  return ys.map((y) => Math.max(2, Math.min(W - 2, centre + (y - mid) * k)));
}
// The keeper: on the bisector of the angle the ball makes with the posts (angle bisector theorem gives where it
// meets the goal line), `out` metres off his line along it.
export function keeperSpot(ball: Pt, ownGoal: Pt): Pt {
  const p1 = { x: ownGoal.x, y: ownGoal.y - GOAL_HALF }, p2 = { x: ownGoal.x, y: ownGoal.y + GOAL_HALF };
  const d1 = dist(ball, p1), d2 = dist(ball, p2);
  const P = { x: ownGoal.x, y: p1.y + (2 * GOAL_HALF * d1) / (d1 + d2) };
  const db = dist(ball, P);
  const out = Math.min(T.GK_OUT[1], T.GK_OUT[0] + db * T.GK_OUT_K, db * 0.5);
  return { x: P.x + ((ball.x - P.x) / (db || 1)) * out, y: P.y + ((ball.y - P.y) / (db || 1)) * out };
}
// Into the shooting lane: on the line from the ball to the goal centre, `gap` metres from the ball.
export function blockSpot(ball: Pt, ownGoal: Pt, gap = T.BLOCK_GAP): Pt {
  const d = dist(ball, ownGoal) || 1;
  return { x: ball.x + ((ownGoal.x - ball.x) / d) * gap, y: ball.y + ((ownGoal.y - ball.y) / d) * gap };
}
export const inBox = (ball: Pt, ownGoal: Pt) => Math.abs(ball.x - ownGoal.x) < 16.5 && Math.abs(ball.y - ownGoal.y) < 20.16;
export const wideInThird = (ball: Pt, ownGoal: Pt) => Math.abs(ball.x - ownGoal.x) < 35 && (ball.y < 16 || ball.y > W - 16);
