// "Scout picks for your needs": the chief scout's shortlist for each open need, with the line that says why he fits
// ("covers RB in Plan A · 21 · known 70 %"). Built ONLY from what the club knows (ranges, not true ratings), so a weak
// scout or a thin assignment gives worse picks. The staff's own signings (staff.ts) use the same list.
import { FREE_AGENT, type Career, type Player } from '../../model/types';
import { squadOf, strengthOf, type World } from '../world';
import { DEFAULT_TACTICS } from '../tactics';
import { loanOf } from '../loans';
import { biasOf, staffOf } from '../delegation';
import { rcOf } from './state';
import { estimateOf, knowledge } from './knowledge';
import { needs, posMatches, styleFit, type Need } from './needs';
import { askOf } from './club';
import { spendingRoom, wageRoom } from './money';
import { demandOf, interestOf } from './agent';
import { isUnhappy } from './ai';

export interface Pick { p: Player; need: Need; mid: number; lo: number; hi: number; k: number; fee: number; fit: number; age: number; natural: boolean; score: number; interest: number }

export function scoutPicks(w: World, c: Career, perNeed = 3, only?: Need[]): Pick[] {
  const list = only ?? needs(w, c).slice(0, 4);
  if (!list.length) return [];
  const rc = rcOf(c);
  const room = Math.max(0, spendingRoom(w, c));
  const wroom = Math.max(0, wageRoom(w, c));
  const my = strengthOf(w, c.clubId);
  const ph = (c.tactics ?? DEFAULT_TACTICS).philosophy ?? 'balanced';
  const b = biasOf(staffOf(c, 'scout'));
  const ours = new Set(squadOf(w, c.clubId).map((p) => p.id));
  const out: Pick[] = [];
  const taken = new Set<string>();
  for (const need of list) {
    const starter = need.starter ? squadOf(w, c.clubId).find((p) => p.id === need.starter) : undefined;
    const floor = Math.max(my - 10, (starter?.rating ?? my - 6) - (need.why.includes('noCover') || need.why.includes('thin') ? 6 : 0));
    const cands: Pick[] = [];
    for (const p of w.players) {
      if (ours.has(p.id) || taken.has(p.id) || !posMatches(p, need.pos) || loanOf(c, p.id) || p.injured > 3) continue;
      if (p.clubId !== FREE_AGENT && (rc.frozen[p.id] ?? 0) > c.season * 100 + c.round) continue;
      const k = knowledge(w, c, p, rc);
      if (k < 25) continue; // the scouts can't recommend a name they've never watched
      const e = estimateOf(w, c, p, rc);
      const mid = (e.lo + e.hi) / 2;
      if (mid < floor || mid > my + 9) continue;
      const fee = p.clubId === FREE_AGENT ? 0 : askOf(w, c, p);
      if (fee > room * 1.15) continue;
      if (demandOf(w, c, p).wage > wroom) continue; // wages we could never pay
      const age = c.season - p.birthYear;
      const fit = styleFit(p, ph);
      const tilt = b === 'youth' ? (age <= 23 ? 3 : 0) : b === 'veteran' ? (age >= 27 ? 2 : 0) : b === 'money' ? -fee / Math.max(1, room) * 3 : 0;
      // F07 (rework): the time horizon. A search that exists because the starter is old or his deal ends wants a man who
      // outlasts him: every year past 29 costs a point there (and past 32 for any need), so a 35-year-old is no longer
      // the scouts' first answer to an ageing keeper, though he can still be picked when nobody younger is close.
      const horizon = need.why.includes('old') || need.why.includes('expiring') ? Math.max(0, age - 29) : Math.max(0, age - 32);
      const score = mid + (fit - p.rating) / 4 + k / 25 + (p.position === need.pos ? 1.5 : 0) + tilt - (fee / Math.max(1, room)) * 2 + (isUnhappy(p) ? 1.5 : 0) - horizon;
      cands.push({ p, need, mid, lo: e.lo, hi: e.hi, k, fee, fit, age, natural: p.position === need.pos, score, interest: interestOf(w, c, p) });
    }
    cands.sort((a, z) => z.score - a.score);
    for (const x of cands.slice(0, perNeed)) { out.push(x); taken.add(x.p.id); }
  }
  return out;
}
