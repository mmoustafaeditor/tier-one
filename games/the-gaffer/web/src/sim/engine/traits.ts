// Hidden player traits (plan "خطة قفل الفجوات" A4 on the pitch, B4 in the engine), like the injury proneness: worked out
// from what the save already has (attributes, rating, age and a fixed per-player draw), never stored, the same for a
// player every time. The game has seven attributes; these are the FM ones it has no field for.
import type { Player, Position } from '../../model/types';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
// The skill a position makes its runs with: forwards shooting, midfielders passing, full-backs pace.
const RUN_SKILL: Partial<Record<Position, number>> = { ST: 1, LW: 1, RW: 1, CAM: 2, CM: 2, CDM: 2, LB: 0, RB: 0, CB: 4, GK: 6 };
// A trait 0-1: the player's level (rating), a skill it leans on, experience (a little), and his own draw (a third).
function trait(p: Pick<Player, 'id' | 'rating'>, key: string, perRating: number, skill: number, youthPenalty: number, age: number): number {
  const u = (hash(`${key}:${p.id}`) % 1000) / 1000;
  return clamp(0.5 + (p.rating - 65) * perRating + (0.25 * (skill - 60)) / 40 + 0.35 * (u - 0.5) - youthPenalty * clamp(21 - age, 0, 4) * 0.02, 0.05, 0.95);
}
export interface Traits {
  offBall: number; // movement off the ball: how often he makes his run and gets into the box
  work: number;    // work rate: how hard he gets back and presses
  calm: number;    // composure: pace kept on the ball when pressed; finishing and penalties under pressure
  vision: number;  // vision: whether he sees the pass that makes a chance
}
export function traitsOf(p: Pick<Player, 'id' | 'rating' | 'attrs' | 'position'>, age = 25): Traits {
  const [, , pass = 60, drib = 60, , phys = 60] = p.attrs;
  return {
    offBall: trait(p, 'run', 0.012, p.attrs[RUN_SKILL[p.position] ?? 2] ?? 60, 0, age),
    work: trait(p, 'work', 0.006, phys, 0.5, age),
    calm: trait(p, 'calm', 0.014, 0.5 * pass + 0.5 * drib, 0, age),
    vision: trait(p, 'vision', 0.012, 0.7 * pass + 0.3 * drib, 0, age),
  };
}
