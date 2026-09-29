// The hospital, and what is left of the old weekly training after v2.6. Training, development, load and the academy
// now live in sim/youth.ts: one development function for every player in the world, Intake Day, the academy as a
// world squad. The academy exam and rights-selling are gone (V2_DESIGN §3.12), replaced by the yearly intake.
import type { Career, Player } from '../model/types';
import { roundFee } from './season';
import { spend, staffQ } from './economy';
import type { World } from './world';

export const FOCUS_TACTICAL = 2;      // extra familiarity with the plan after a Tactical week

export const atCeiling = (p: Player) => p.rating >= p.potential;

// ---------- development points (⚡) ----------

// v2: development points are retired (a side currency that bought ratings undercut training). Kept as a no-op so the
// season code reads the same; the upgrades to save v4 and v8 turn any points left into a one-off squad morale lift.
export const earnDev = (c: Career, _n: number): Career => c;

// ---------- hospital ----------

export type Treatment = 'rehab' | 'specialist';
export function treatmentCost(w: World, c: Career, t: Treatment): number {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const share = { rehab: 0.01, specialist: 0.03 }[t];
  // A good doctor and medical centre make treatment cheaper.
  const discount = 1 - (staffQ(c.ops, 'doctor') / 400 + (c.ops.facilities.medical - 1) * 0.05);
  return roundFee(club.wageCap * share * discount);
}

export function treat(w: World, c: Career, p: Player, t: Treatment): { world: World; career: Career; ok: boolean } {
  const cost = treatmentCost(w, c, t);
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  if (p.injured === 0 || club.budget < cost) return { world: w, career: c, ok: false };
  const injured = Math.max(0, p.injured - (t === 'rehab' ? 1 : 2));
  const r = spend(w, c, 'medical', -cost);
  return { world: { ...r.world, players: r.world.players.map((x) => (x.id === p.id ? { ...x, injured } : x)) }, career: r.career, ok: true };
}

// Old careers counted academy exams per season; the field is cleared at season end and never read again.
export const resetExams = <T extends object>(ops: T): T => { const o = { ...ops } as T & { exams?: number }; delete o.exams; return o; };
