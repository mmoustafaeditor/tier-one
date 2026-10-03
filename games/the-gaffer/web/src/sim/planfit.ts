// Where a player fits in the manager's current plan (rework, handoff §I "Where does he fit in my football?"): the slot
// of the formation in use where he'd help most, against the man who plays there now, with the same slot values the
// selection uses (fresh legs, normal morale, so today's tiredness doesn't decide it). Read-only.
import type { Career, Player, Position } from '../model/types';
import { DEFAULT_TACTICS, FORMATIONS, slotValue, xiFor } from './tactics';
import type { World } from './world';

export type PlanFit =
  | { k: 'starts'; pos: Position }                                        // in the XI now
  | { k: 'open'; pos: Position }                                          // nobody plays there: he would
  | { k: 'ahead' | 'close' | 'behind'; pos: Position; vs: Player; d: number } // against the man in that slot (d = his value − theirs)
  | { k: 'none'; pos: Position; d: number };                              // no natural place: best slot, d below his level

const NATURAL_GAP = 6; // a slot more than this below his level is not a natural place for him (Player page's warn tone)

export function planFit(w: World, c: Career, p: Player): PlanFit | null {
  const slots = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots;
  const { xi } = xiFor(w, c);
  const j = xi.findIndex((x) => x?.id === p.id);
  if (j >= 0) return { k: 'starts', pos: slots[j].pos };
  const val = (q: Player, pos: Position) => slotValue({ ...q, fitness: 100, morale: 60 }, pos);
  const cand = slots.map((s, i) => ({ i, pos: s.pos, v: val(p, s.pos) })).filter((x) => (x.pos === 'GK') === (p.position === 'GK'));
  if (!cand.length) return null;
  const natural = cand.filter((x) => x.v >= p.rating - NATURAL_GAP);
  if (!natural.length) { const b = [...cand].sort((a, b2) => b2.v - a.v)[0]; return { k: 'none', pos: b.pos, d: Math.round(p.rating - b.v) }; }
  // The natural slot where he gains most on the man there now (an empty slot first).
  const empty = natural.find((x) => !xi[x.i]);
  if (empty) return { k: 'open', pos: empty.pos };
  const best = natural.map((x) => ({ ...x, d: x.v - val(xi[x.i], x.pos) })).sort((a, b) => b.d - a.d)[0];
  const d = Math.round(best.d);
  return { k: d > 0 ? 'ahead' : d >= -3 ? 'close' : 'behind', pos: best.pos, vs: xi[best.i], d };
}
