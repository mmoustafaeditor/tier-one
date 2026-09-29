// Recruitment in the save: the v7 upgrade step, the invariants checked on every write and read, and the tidy pass.
import type { Career, SaveFile } from '../../model/types';
import type { World } from '../world';
import { emptyRC, rcOf, withRC, type RecruitState } from './state';
import { nominal } from './club';

// v6 → v7 (V2.5). Documented defaults:
//  - knowledge starts from the old shortlist watch: a player watched for ≥ 2 matchdays is known to 80, a newer one to
//    the watch-list rate after one matchday (the rest start at their base: own league 45, country 25, elsewhere 10);
//  - loans already running keep share 1 (the borrower pays all his wage) and no minutes clause;
//  - no assignments, negotiations, commitments or clauses yet (old deals were paid in full on the day).
// Idempotent and independent of the dressing-room (v6) and training (v8) steps, so the chain runs 6→7→8 in any merge order.
export function upgradeRecruit(s: SaveFile): SaveFile {
  const c = s.career as (Career & { rc?: RecruitState }) | null;
  if (!c || c.rc) return { ...s, version: Math.max(s.version, 7) };
  const rc = emptyRC();
  const now = c.season * 100 + c.round;
  for (const [id, at] of Object.entries(c.watch ?? {})) rc.k[id] = [now - at >= 2 ? 80 : 30, now];
  for (const l of c.loans ?? []) if (l.season === c.season) rc.loans[l.playerId] = { share: l.share ?? 1, minutes: 'none', from: l.from, to: l.to, since: now, apps0: c.stats?.[l.playerId]?.[0] ?? 0, days0: c.round };
  return { ...s, version: Math.max(s.version, 7), career: withRC(c, rc) };
}

// Invariants (V2_DESIGN §7.6): every reference exists; Σ instalments = the agreed fee; one open negotiation per player;
// loan terms only for live loans; knowledge within 0-100.
export function checkRecruit(w: World, c: Career): string[] {
  const rc = rcOf(c);
  const out: string[] = [];
  const players = new Set(w.players.map((p) => p.id));
  const clubs = new Set([...w.clubs.map((x) => x.id), 'free']);
  const open = new Set<string>();
  for (const n of rc.negs) {
    if (!players.has(n.playerId)) out.push(`negotiation ${n.id}: player ${n.playerId} not found`);
    if (!clubs.has(n.from)) out.push(`negotiation ${n.id}: club ${n.from} not found`);
    if (n.stage === 'club' || n.stage === 'terms') {
      if (open.has(n.playerId)) out.push(`two open negotiations for ${n.playerId}`);
      open.add(n.playerId);
    }
  }
  for (const x of rc.commits) {
    if (!clubs.has(x.to)) out.push(`commitment ${x.id}: club ${x.to} not found`);
    if (!(x.amount > 0)) out.push(`commitment ${x.id}: amount ${x.amount}`);
  }
  for (const [id, cl] of Object.entries(rc.clauses)) {
    if (!players.has(id)) out.push(`clauses: player ${id} not found`);
    if (cl.sched && cl.sched.length && cl.fee !== undefined && Math.abs(cl.sched.reduce((s, v) => s + v, 0) - cl.fee) > 1) out.push(`clauses ${id}: instalments do not add up to the fee`);
  }
  for (const n of rc.negs) if (n.fee && n.stage === 'done') {
    const cl = rc.clauses[n.playerId];
    if (cl?.fee !== undefined && Math.abs(nominal(n.fee) - cl.fee) > 1) out.push(`deal ${n.id}: fee mismatch`);
  }
  const live = new Set((c.loans ?? []).filter((l) => l.season === c.season).map((l) => l.playerId));
  for (const id of Object.keys(rc.loans)) if (!live.has(id)) out.push(`loan terms for ${id} without a loan`);
  for (const [id, [k]] of Object.entries(rc.k)) if (!(k >= 0 && k <= 100)) out.push(`knowledge ${id}: ${k}`);
  return out;
}

// Drops references that stopped meaning anything (a retired target, a loan that ended) before a save is checked.
export function tidyRecruit(w: World, c: Career): Career {
  const rc0 = (c as Career & { rc?: RecruitState }).rc;
  if (!rc0) return c;
  const rc = rcOf(c);
  const players = new Set(w.players.map((p) => p.id));
  const live = new Set((c.loans ?? []).filter((l) => l.season === c.season).map((l) => l.playerId));
  const negs = rc.negs.filter((n) => players.has(n.playerId));
  const k = Object.fromEntries(Object.entries(rc.k).filter(([id]) => players.has(id)));
  const clauses = Object.fromEntries(Object.entries(rc.clauses).filter(([id]) => players.has(id)));
  const loans = Object.fromEntries(Object.entries(rc.loans).filter(([id]) => live.has(id)));
  if (negs.length === rc.negs.length && Object.keys(k).length === Object.keys(rc.k).length && Object.keys(clauses).length === Object.keys(rc.clauses).length && Object.keys(loans).length === Object.keys(rc.loans).length) return c;
  return withRC(c, { ...rc, negs, k, clauses, loans });
}
