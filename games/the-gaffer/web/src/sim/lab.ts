// Tactics Lab (rework, handoff §J "try another plan"): the next match replayed in the engine's own odds under other
// plans, so the manager can compare before committing. Each plan is the career's tactics with another philosophy (and
// optionally another shape) applied exactly as `tactics.preset` / `tactics.patch` would apply it, the XI picked again
// for that shape, then `predict` and `expected` on the match that would be played. Read-only: nothing changes until
// the manager taps Use.
import type { Career } from '../model/types';
import type { World } from './world';
import { nextUserMatch } from './season';
import { playerOf } from './world';
import { expected, predict } from './match';
import { applyPreset, DEFAULT_TACTICS, PHILOSOPHIES, type FormationId, type Philosophy, type UserTactics } from './tactics';

export interface LabRow { ph: Philosophy; tactics: UserTactics; win: number; draw: number; xg: [number, number]; now: boolean }

// The plan the lab would set: the current tactics re-shaped (a new shape drops the hand-picked XI, as tactics.patch
// does) with the philosophy's preset on top.
export function labPlan(c: Career, ph: Philosophy, formation?: FormationId): UserTactics {
  const t = c.tactics ?? DEFAULT_TACTICS;
  const shaped: UserTactics = formation && formation !== t.formation ? { ...t, formation, xi: null } : t;
  return applyPreset(shaped, ph);
}

// Our win/draw chances and xG (ours, theirs) for the next match under `t`.
export function labOdds(w: World, c: Career, t: UserTactics): { win: number; draw: number; xg: [number, number] } | null {
  const m = nextUserMatch(w, { ...c, tactics: t });
  if (!m) return null;
  const me = m.sides[0].clubId === c.clubId ? 0 : 1;
  const get = (id: string) => playerOf(w, id)!;
  const p = predict(m, get), e = expected(m, get).xg;
  return { win: me === 0 ? p[0] : p[2], draw: p[1], xg: [e[me], e[1 - me]] };
}

// The current plan first, then every philosophy in `formation` (default: the current shape), best chance first.
export function tacticsLab(w: World, c: Career, formation?: FormationId): { now: LabRow; rows: LabRow[] } | null {
  const t = c.tactics ?? DEFAULT_TACTICS;
  const base = labOdds(w, c, t);
  if (!base) return null;
  const now: LabRow = { ph: t.philosophy ?? 'balanced', tactics: t, ...base, now: true };
  const rows: LabRow[] = [];
  for (const ph of PHILOSOPHIES) {
    const plan = labPlan(c, ph, formation);
    const o = labOdds(w, c, plan);
    if (o) rows.push({ ph, tactics: plan, ...o, now: false });
  }
  rows.sort((a, b) => b.win - a.win || b.xg[0] - b.xg[1] - (a.xg[0] - a.xg[1]));
  return { now, rows };
}
