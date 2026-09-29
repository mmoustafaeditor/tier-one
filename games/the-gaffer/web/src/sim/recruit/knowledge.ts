// Knowledge fog (V2_DESIGN §3.4): how well the club knows each player, 0-100. It replaces the old binary reveal.
//  - base: own club 100, own league 45, same country 25, elsewhere 10; famous players (top 5 % by value) +20
//  - accrual per matchday: inside a scout assignment 3 + q/12; a shortlisted target inside one 4 + q/10; a shortlisted
//    target outside every assignment 2 + q/20 (the chief scout keeps an eye); playing against him +15
//  - decay: −1 a matchday after 20 unobserved, never below the base
//  - range: half-width 1 + round(9 × (1 − K/100)); K 100 is exact. The midpoint carries a seeded offset u ∈ [−1, 1]
//    scaled by the half-width, so the truth is ALWAYS inside and the range only ever narrows as K rises (honest and
//    monotone; see `rangeOf`). Potential adds +3 (≤21) / +2 (≤23) and is never exact before 24.
//  - reveals: personality at 50 (when the dressing-room lane supplies one), wage demand at 50, agent priority at 70.
import { FREE_AGENT, type Career, type Player } from '../../model/types';
import { playerOf, type World } from '../world';
import { hash32 } from '../rng';
import { staffQ } from '../economy';
import { rcOf, tickOf, withRC, type Assignment, type RecruitState } from './state';

export const REVEAL = { personality: 50, wage: 50, priority: 70 } as const;
export const DECAY_AFTER = 20;

// Famous: top 5 % of the world by market value (cached per players array).
const FAMOUS = new WeakMap<Player[], number>();
function famousBar(w: World): number {
  let bar = FAMOUS.get(w.players);
  if (bar === undefined) {
    const vals = w.players.filter((p) => p.clubId !== FREE_AGENT).map((p) => p.marketValue).sort((a, b) => b - a);
    bar = vals[Math.floor(vals.length * 0.05)] ?? Infinity;
    FAMOUS.set(w.players, bar);
  }
  return bar;
}

interface Where { myClub: string; myLeague: string; myCountry: string; leagueOf: Map<string, string>; countryOf: Map<string, string> }
const WHERE = new WeakMap<World['clubs'], Map<string, Where>>();
function whereOf(w: World, clubId: string): Where {
  let m = WHERE.get(w.clubs);
  if (!m) { m = new Map(); WHERE.set(w.clubs, m); }
  let x = m.get(clubId);
  if (!x) {
    const leagueOf = new Map(w.clubs.map((cl) => [cl.id, cl.leagueId]));
    const lc = new Map(w.leagues.map((l) => [l.id, l.country as string]));
    const countryOf = new Map(w.clubs.map((cl) => [cl.id, lc.get(cl.leagueId) ?? '']));
    x = { myClub: clubId, myLeague: leagueOf.get(clubId) ?? '', myCountry: countryOf.get(clubId) ?? '', leagueOf, countryOf };
    m.set(clubId, x);
  }
  return x;
}

export function baseK(w: World, c: Career, p: Player): number {
  if (p.clubId === c.clubId) return 100;
  const x = whereOf(w, c.clubId);
  let k = 10;
  if (p.clubId !== FREE_AGENT) {
    if (x.leagueOf.get(p.clubId) === x.myLeague) k = 45;
    else if (x.countryOf.get(p.clubId) === x.myCountry) k = 25;
  }
  if (p.marketValue >= famousBar(w)) k += 20;
  return k;
}

export function knowledge(w: World, c: Career, p: Player, rc: RecruitState = rcOf(c)): number {
  const b = baseK(w, c, p);
  const s = rc.k[p.id];
  return Math.max(b, s ? s[0] : 0);
}

// ---------- ranges ----------

export interface Estimate { exact: boolean; lo: number; hi: number; plo: number; phi: number; k: number }

// Seeded offset in [−1, 1] per career and player (and a second one for the potential).
const offset = (seed: number, id: string, s: string) => (hash32(`${seed >>> 0}|fog|${s}|${id}`) / 4294967295) * 2 - 1;

export const halfWidth = (k: number) => (k >= 100 ? 0 : 1 + Math.round(9 * (1 - k / 100)));

// The range for a true value `v`: [v + round(u·h) − h, v + round(u·h) + h]. Because |round(u·h)| ≤ h the truth is
// always inside, and because round(u·h) moves by at most 1 when h moves by 1, lo never falls and hi never rises as
// h shrinks: more knowledge can only narrow the band.
export function rangeOf(v: number, h: number, u: number): [number, number] {
  if (h <= 0) return [v, v];
  const mid = v + Math.round(u * h);
  return [Math.max(1, mid - h), Math.min(99, mid + h)];
}

export function estimateK(c: Career, p: Player, k: number): Estimate {
  const age = c.season - p.birthYear;
  const h = halfWidth(k);
  const [lo, hi] = rangeOf(p.rating, h, offset(c.seed, p.id, 'r'));
  const extra = age <= 21 ? 3 : age <= 23 ? 2 : 0;
  const [plo0, phi] = rangeOf(p.potential, h + extra, offset(c.seed, p.id, 'p'));
  return { exact: h === 0, lo, hi, plo: Math.max(plo0, lo), phi: Math.max(phi, hi), k };
}

export const estimateOf = (w: World, c: Career, p: Player, rc?: RecruitState) => estimateK(c, p, knowledge(w, c, p, rc));

// ---------- assignments ----------

export const assignSlots = (c: Career) => { const f = c.ops?.facilities.scouting ?? 1; return 1 + (f >= 3 ? 1 : 0) + (f >= 5 ? 1 : 0); };

export function inScope(w: World, a: Assignment, p: Player, x = whereOfPublic(w)): boolean {
  if (a.pos && p.position !== a.pos) return false;
  if (p.clubId === FREE_AGENT) return a.scope === 'world';
  if (a.scope === 'league') return x.leagueOf.get(p.clubId) === a.key;
  if (a.scope === 'country') return x.countryOf.get(p.clubId) === a.key;
  return a.scope === 'world' && !!a.pos;
}
const whereOfPublic = (w: World) => whereOf(w, '');

// Per matchday: what an assignment adds to one player.
export const rateAssign = (q: number, a: Assignment) => (3 + q / 12) * (a.scope === 'world' ? 0.5 : 1);
export const rateTarget = (q: number) => 4 + q / 10;
export const rateWatch = (q: number) => 2 + q / 20;
export const MET = 15;

// The weekly scouting step. `faced`: opponents who played against us today.
export function accrue(w: World, c: Career, faced: string[]): Career {
  let rc = rcOf(c);
  const q = staffQ(c.ops, 'scout');
  const now = tickOf(c);
  const k = { ...rc.k };
  const x = whereOfPublic(w);
  const gain = new Map<string, number>();
  const add = (id: string, v: number) => gain.set(id, Math.max(gain.get(id) ?? 0, v));
  const short = new Set(c.shortlist ?? []);
  const byId = new Map<string, Player>();
  if (rc.assign.length) {
    for (const p of w.players) {
      if (p.clubId === c.clubId) continue;
      for (const a of rc.assign) if (inScope(w, a, p, x)) { add(p.id, short.has(p.id) ? rateTarget(q) : rateAssign(q, a)); byId.set(p.id, p); }
    }
  }
  for (const id of short) if (!gain.has(id)) add(id, rateWatch(q));
  const bonus = new Map<string, number>();
  for (const id of faced) bonus.set(id, MET);
  const ids = new Set([...gain.keys(), ...bonus.keys()]);
  for (const id of ids) {
    const p = byId.get(id) ?? playerOf(w, id);
    if (!p || p.clubId === c.clubId) continue;
    const cur = Math.max(baseK(w, c, p), k[id]?.[0] ?? 0);
    const next = Math.min(100, cur + (gain.get(id) ?? 0) + (bonus.get(id) ?? 0));
    k[id] = [Math.round(next * 10) / 10, now];
  }
  // Decay: −1 a matchday after 20 unobserved, down to the base (and the entry goes when it reaches the base).
  for (const [id, [v, t]] of Object.entries(k)) {
    if (ids.has(id)) continue;
    const idle = (Math.floor(now / 100) - Math.floor(t / 100)) * 50 + (now % 100) - (t % 100);
    if (idle <= DECAY_AFTER) continue;
    const p = playerOf(w, id);
    if (!p) { delete k[id]; continue; }
    const b = baseK(w, c, p);
    const nv = v - 1;
    if (nv <= b) delete k[id]; else k[id] = [nv, t];
  }
  rc = { ...rc, k };
  return withRC(c, rc);
}

// How many players an assignment covers and how many of them we know well (≥ 70), for the Scouting tab.
export function coverage(w: World, c: Career, a: Assignment): { n: number; known: number } {
  const rc = rcOf(c);
  const x = whereOfPublic(w);
  let n = 0, known = 0;
  for (const p of w.players) {
    if (p.clubId === c.clubId || !inScope(w, a, p, x)) continue;
    n++;
    if (knowledge(w, c, p, rc) >= 70) known++;
  }
  return { n, known };
}

