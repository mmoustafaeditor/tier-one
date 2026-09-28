// Weekly training, development points, the hospital and the academy for the user's club.
// E2E lessons: hard training costs fitness (#10) and every session has a real report; players at their ceiling say so;
// development points are earned and spending them without enough says why (#9, #48); the hospital charges exactly
// what it shows; the academy's "sell rights" really exists (#47).
import type { Career, ClubOps, Player, Position } from '../model/types';
import { playerName } from '../data/names';
import { bell, clamp, int, makeRng, pick } from './rng';
import { makeAttrs, shiftAttrs, squadOf, valueOf, wageOf, freeShirt, type World } from './world';
import { roundFee } from './season';
import { spend, staffQ } from './economy';
import { addNews } from './news';

// Weekly progress towards the next +1 rating, by age.
const AGE_RATE = (age: number) => (age <= 19 ? 2 : age <= 21 ? 1.6 : age <= 24 ? 1.2 : age <= 28 ? 0.6 : 0.2);
const LOAD_PROGRESS = [1, 3.5, 6.5];
const LOAD_RECOVERY = [18, 12, 6];

export const atCeiling = (p: Player) => p.rating >= p.potential;

// One training week for the user's squad (runs after each league matchday). Other clubs develop once a year.
export function trainingWeek(w: World, c: Career): { world: World; career: Career } {
  const r = makeRng((c.seed ^ c.season) + c.round * 811);
  const ops = c.ops;
  const load = ops.training.load;
  const facility = 1 + 0.1 * (ops.facilities.training - 1);
  const assistant = 1 + staffQ(ops, 'assistant') / 400;
  const fellowship = c.coach.courses.includes('fellowship') ? 1.15 : 1;
  const improved: string[] = [], hurt: string[] = [];
  const mine = new Set(squadOf(w, c.clubId).map((p) => p.id));
  const players = w.players.map((p) => {
    if (!mine.has(p.id)) return p;
    const age = c.season - p.birthYear;
    // Fitness: the base recovery between matchdays is +12; recovery training adds, hard training takes.
    let q: Player = { ...p, fitness: clamp(p.fitness + LOAD_RECOVERY[load] - 12, 20, 100) };
    if (p.injured === 0 && !atCeiling(p)) {
      const young = age <= 21 ? fellowship : 1;
      const prog = (p.prog ?? 0) + LOAD_PROGRESS[load] * AGE_RATE(age) * facility * assistant * young;
      if (prog >= 100) {
        const focus = ops.training.focus[p.id];
        const attrs = shiftAttrs(p.attrs, 1).map((a, i) => (focus === i ? Math.min(99, a + 1) : a));
        q = { ...q, rating: p.rating + 1, attrs, prog: prog - 100, marketValue: valueOf(p.rating + 1, age, p.potential) };
        improved.push(p.id);
      } else q = { ...q, prog };
    }
    return q;
  });
  // Hard weeks carry a small injury risk; a good fitness coach lowers it.
  if (load === 2 && r() < 0.18 * (1 - staffQ(ops, 'fitness') / 200)) {
    const pool = players.filter((p) => mine.has(p.id) && p.injured === 0);
    const who = pool[Math.floor(r() * pool.length)];
    if (who) { who.injured = int(r, 1, 2); hurt.push(who.id); }
  }
  return { world: { ...w, players }, career: { ...c, ops: { ...ops, report: { improved, hurt } } } };
}

// ---------- development points (⚡) ----------

export const DEV_COST = { rating: 50, potential: 35, fitness: 15, morale: 20 } as const;
export type DevUse = keyof typeof DEV_COST;
export type DevCheck = { ok: true } | { ok: false; reason: 'points' | 'ceiling' | 'age' | 'full' };

export function canUseDev(c: Career, p: Player | null, use: DevUse): DevCheck {
  if (c.ops.devPoints < DEV_COST[use]) return { ok: false, reason: 'points' };
  if (use === 'rating' && p && atCeiling(p)) return { ok: false, reason: 'ceiling' };
  if (use === 'potential' && p && c.season - p.birthYear > 26) return { ok: false, reason: 'age' };
  if (use === 'fitness' && p && p.fitness >= 100) return { ok: false, reason: 'full' };
  return { ok: true };
}

export function useDev(w: World, c: Career, p: Player | null, use: DevUse): { world: World; career: Career } {
  const ops: ClubOps = { ...c.ops, devPoints: c.ops.devPoints - DEV_COST[use] };
  const mine = new Set(squadOf(w, c.clubId).map((x) => x.id));
  const players = w.players.map((x) => {
    if (use === 'morale') return mine.has(x.id) ? { ...x, morale: clamp(x.morale + 10, 0, 100) } : x;
    if (!p || x.id !== p.id) return x;
    if (use === 'rating') return { ...x, rating: x.rating + 1, attrs: shiftAttrs(x.attrs, 1) };
    if (use === 'potential') return { ...x, potential: Math.min(99, x.potential + 2) };
    return { ...x, fitness: Math.min(100, x.fitness + 15) };
  });
  return { world: { ...w, players }, career: { ...c, ops } };
}

// Points come from results and achievements (called from playDay / season end).
export const earnDev = (c: Career, n: number): Career => ({ ...c, ops: { ...c.ops, devPoints: c.ops.devPoints + n } });

// ---------- hospital ----------

export type Treatment = 'rehab' | 'specialist' | 'instant';
export function treatmentCost(w: World, c: Career, t: Treatment): number {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const share = { rehab: 0.01, specialist: 0.03, instant: 0.06 }[t];
  // A good doctor and medical centre make treatment cheaper.
  const discount = 1 - (staffQ(c.ops, 'doctor') / 400 + (c.ops.facilities.medical - 1) * 0.05);
  return roundFee(club.wageCap * share * discount);
}

export function treat(w: World, c: Career, p: Player, t: Treatment): { world: World; career: Career; ok: boolean } {
  const cost = treatmentCost(w, c, t);
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  if (p.injured === 0 || club.budget < cost) return { world: w, career: c, ok: false };
  const injured = t === 'instant' ? 0 : Math.max(0, p.injured - (t === 'rehab' ? 1 : 2));
  const r = spend(w, c, 'medical', -cost);
  return { world: { ...r.world, players: r.world.players.map((x) => (x.id === p.id ? { ...x, injured } : x)) }, career: r.career, ok: true };
}

// ---------- academy ----------

const POSITIONS: Position[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST'];
export const ACADEMY_MAX = 8;
export const scoutCost = (w: World, c: Career) => roundFee(w.clubs.find((x) => x.id === c.clubId)!.wageCap * 0.08);

// Scouting exam: finds 2 + scouting level prospects aged 15-17. Better academy and club, better prospects.
export function scoutProspects(w: World, c: Career): { world: World; career: Career; found: number; ok: boolean } {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const lg = w.leagues.find((l) => l.id === club.leagueId)!;
  const cost = scoutCost(w, c);
  const room = ACADEMY_MAX - c.ops.academy.length;
  if (club.budget < cost || room <= 0) return { world: w, career: c, found: 0, ok: false };
  const r = makeRng((c.seed ^ c.season) + c.round * 1301 + c.ops.academy.length);
  const n = Math.min(room, 2 + c.ops.facilities.scouting + (staffQ(c.ops, 'scout') > 70 ? 1 : 0));
  const kids: Player[] = [];
  for (let i = 0; i < n; i++) {
    const pos = pick(r, POSITIONS);
    const age = int(r, 15, 17);
    const potential = clamp(Math.round(52 + c.ops.facilities.academy * 5 + club.reputation * 0.2 + bell(r) * 9), 50, 94);
    const rating = clamp(Math.round(potential - 22 - r() * 10), 35, 70);
    const nationality = r() < 0.85 ? lg.country : pick(r, ['BRA', 'SEN', 'NGA', 'MAR', 'FRA']);
    const value = valueOf(rating, age, potential);
    kids.push({
      id: `ac_${c.season}_${c.round}_${c.ops.academy.length + i}`, clubId: club.id, name: playerName(nationality, r), nationality,
      birthYear: c.season - age, position: pos, rating, potential, marketValue: value, wage: Math.max(500, roundFee(wageOf(value, lg.id) / 3)),
      contractUntil: c.season + 3, shirtNumber: 0, attrs: makeAttrs(r, rating, pos), fitness: 100, morale: 75, injured: 0, banned: 0,
    });
  }
  const s = spend(w, c, 'scouting', -cost);
  return { world: s.world, career: { ...s.career, ops: { ...s.career.ops, academy: [...s.career.ops.academy, ...kids] } }, found: n, ok: true };
}

// Promote a prospect to the first-team squad (he becomes a real player of the world).
export function promote(w: World, c: Career, id: string): { world: World; career: Career; ok: boolean } {
  const kid = c.ops.academy.find((k) => k.id === id);
  if (!kid || squadOf(w, c.clubId).length >= 32) return { world: w, career: c, ok: false };
  const player: Player = { ...kid, clubId: c.clubId, shirtNumber: freeShirt(w, c.clubId, kid.position) };
  const career = addNews({ ...c, grads: [...(c.grads ?? []), kid.id], ops: { ...c.ops, academy: c.ops.academy.filter((k) => k.id !== id) } }, 'youth', 'promoted', { player: kid.id, pn: kid.name, club: c.clubId });
  return { world: { ...w, players: [...w.players, player] }, career, ok: true };
}

export const releaseProspect = (c: Career, id: string): Career => ({ ...c, ops: { ...c.ops, academy: c.ops.academy.filter((k) => k.id !== id) } });

// Sell a prospect's rights to another academy for most of his value.
export function sellRights(w: World, c: Career, id: string): { world: World; career: Career; fee: number } {
  const kid = c.ops.academy.find((k) => k.id === id);
  if (!kid) return { world: w, career: c, fee: 0 };
  const fee = roundFee(kid.marketValue * 0.7);
  const s = spend(w, releaseProspect(c, id), 'sales', fee);
  return { ...s, fee };
}

// Prospects grow a little every week in the academy.
export function academyWeek(c: Career): Career {
  if (!c.ops.academy.length || c.round % 4 !== 0) return c;
  const r = makeRng((c.seed ^ c.season) + c.round * 57);
  const academy = c.ops.academy.map((k) => (k.rating < k.potential && r() < 0.4 ? { ...k, rating: k.rating + 1, attrs: shiftAttrs(k.attrs, 1) } : k));
  return { ...c, ops: { ...c.ops, academy } };
}

