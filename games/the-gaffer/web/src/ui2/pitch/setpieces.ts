// 7. Set pieces on the live pitch (plan: "خطة تحسين حركة اللاعيبة", PR C). The engine says a corner, a foul or an
// offside happened (m.events, m.flow); this only stages it: who stands where while the ball is dead. Depths are from
// the ATTACKING side's own goal (0-105), `y` across (0-68); the caller turns them into pitch coordinates.
export type SetKind = 'corner' | 'fk' | 'gk' | 'ti'; // ti: a throw-in (foundation step 3)
export interface SetPiece { kind: SetKind; side: 0 | 1; at: Pt; until: number; taker: number; rush: number; wall?: number[] }
// How much faster than a jog the players walk to their spots so that they're set (99%) well before the kick: the time
// constant of a step (move.ts) is max(120, 0.9 × ms per match minute), and 1 − e^−4.6 = 99%.
export const rushFor = (msPerMinute: number, dur: number) => Math.max(3, (4.6 * Math.max(120, msPerMinute * 0.9)) / Math.max(60, dur));
type Pt = { x: number; y: number };
const W = 68;
export const WALL_GAP = 9.15;

// The attackers' spots in the box for a corner or a free kick in range: near post, far post, penalty spot, the six-yard
// line, the back post; one waits at the edge of the box, the rest stay back. `flank` = -1 the ball is on the top side.
export function attackSpots(n: number, flank: -1 | 1): { d: number; y: number }[] {
  const near = W / 2 + flank * 4, far = W / 2 - flank * 4;
  const box = [{ d: 99, y: near }, { d: 99, y: far }, { d: 94, y: W / 2 }, { d: 97.5, y: W / 2 + flank }, { d: 95, y: W / 2 - flank * 10 }, { d: 86, y: W / 2 - flank * 4 }];
  const back = [{ d: 55, y: W / 2 - 12 }, { d: 55, y: W / 2 + 12 }, { d: 62, y: W / 2 }];
  return Array.from({ length: n }, (_, i) => box[i] ?? back[i - box.length] ?? { d: 60, y: W / 2 });
}
// The defenders: one on the near post, a zonal line across the six-yard box and the penalty spot, one at the edge, the
// last man (a forward) up for the counter. Depths from the DEFENDING side's own goal.
export function defendSpots(n: number, flank: -1 | 1): { d: number; y: number }[] {
  const out = [{ d: 1, y: W / 2 + flank * 3.4 }];
  for (const y of [26, 31, 36, 41]) out.push({ d: 6, y: flank < 0 ? y : W - y });
  out.push({ d: 11, y: W / 2 - 4 }, { d: 11, y: W / 2 + 4 }, { d: 18, y: W / 2 }, { d: 14, y: W / 2 - flank * 12 }, { d: 40, y: W / 2 });
  return Array.from({ length: n }, (_, i) => out[i] ?? { d: 20, y: W / 2 });
}
// A free kick within shooting range gets a wall: 3 to 5 men 9.15 m from the ball, across the line to the goal centre.
export const wallSize = (depth: number) => (depth > 86 ? 5 : depth > 78 ? 4 : depth > 70 ? 3 : 0);
export function wallSpots(ball: Pt, goal: Pt, n: number): Pt[] {
  const dx = goal.x - ball.x, dy = goal.y - ball.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, c = { x: ball.x + ux * WALL_GAP, y: ball.y + uy * WALL_GAP };
  return Array.from({ length: n }, (_, i) => { const o = (i - (n - 1) / 2) * 0.9; return { x: c.x - uy * o, y: c.y + ux * o }; });
}
