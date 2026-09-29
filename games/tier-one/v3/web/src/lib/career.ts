// Career: local blogger → Tier One (DESIGN §6). Runs the Daily engine with rank modifiers, locally. Never ranked.
import { RULES, E, type Rules, type Source, type Result, type CastSaga, type Game, OUTS } from './engine';
import type { CareerSave } from './save';

export const RANKS = [
  { sagas: 3, contacts: 3, src: ['kitman', 'barber', 'agent'], rivals: ['tabloid'], pool: 'small' as const, gate: [0, 0], dd: 60 },
  { sagas: 4, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter'], rivals: ['tabloid', 'itk'], pool: 'small' as const, gate: [8, 55], dd: 60 },
  { sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'top' as const, gate: [20, 65], dd: 60 },
  { sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'top' as const, gate: [36, 75], dd: 60 },
  { sagas: 6, contacts: 5, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], pool: 'stars' as const, gate: [56, 85], dd: 45 },
];
export const TRUST_LV = [6, 15, 28, 45, 70];
export const trustLevel = (pts: number) => TRUST_LV.filter((x) => pts >= x).length;
export const FOLLOWER_MILESTONES: [number, number][] = [[10000, 50], [50000, 100], [100000, 200], [250000, 300]];

export function newCareer(slot = 1, restarts = 0): CareerSave {
  return {
    slot, paper: '', rank: 0, windows: 0, rep: 50, followers: 0, favours: { burner: 1, tipoff: 1, stakeout: 0 },
    contacts: {}, relations: {}, t1: 0, exclusives: 0, right: 0, calls: 0, uturns: 0, history: [], live: null, restarts,
  };
}

// Trust makes an 'own' source more accurate: each level removes 12% of its remaining error (L5 = 60% fewer).
function trusted(so: Source, src: string, lv: number): Source {
  if (!lv) return so;
  if (so.kind === 'street') return { ...so, rel: Math.min(0.95, (so.rel || 0.45) + 0.05 * lv) };
  if (!so.M) return so;
  const f = 1 - 0.12 * lv, right = (t: number) => rightReport(src, t);
  const M = so.M.map((row, t) => {
    const r0 = right(t); const wrong = row.map((p, r) => (r === r0 ? 0 : p * f));
    const sumW = wrong.reduce((a, b) => a + b, 0);
    return row.map((_, r) => (r === r0 ? 1 - sumW : wrong[r]));
  });
  const from = lv >= 3 && src === 'spotter' ? 2 : lv >= 3 && src === 'physio' ? 4 : so.from;
  return { ...so, M, from };
}
function rightReport(src: string, t: number) {
  if (src === 'kitman') return t <= 1 ? 0 : 1;
  if (src === 'spotter' || src === 'physio') return t === 0 ? 0 : t === 1 ? 1 : 2;
  return t;
}

export function careerRules(c: CareerSave, cast: CastSaga[]): Rules {
  const rk = RANKS[c.rank];
  const SOURCES: Record<string, Source> = {};
  for (const k of rk.src) SOURCES[k] = trusted(RULES.SOURCES[k], k, trustLevel((c.contacts[k] || { trust: 0 }).trust));
  const PER: Record<number, Record<string, Source>> = {};
  if (c.rank >= 2) cast.forEach((s) => {
    const rel = Math.max(rel0(c, s.from.id), rel0(c, s.to.id)), low = Math.min(rel0(c, s.from.id), rel0(c, s.to.id));
    if (rel >= 3) PER[s.i] = { ...(PER[s.i] || {}), leak: RULES.LEAK };
    if (low <= -3 && SOURCES.kitman) PER[s.i] = { ...(PER[s.i] || {}), kitman: { cost: 1, from: 1, kind: 'street', rel: 0.45, says: ['LEAVING', 'STAYING'], map: [0, 0, 1, 1] } as Source };
  });
  const AGAIN = c.rank >= 3 ? rk.src.filter((k) => trustLevel((c.contacts[k] || { trust: 0 }).trust) >= 5) : [];
  return { ...RULES, SAGAS: rk.sagas, CONTACTS: rk.contacts, DD_SECONDS: rk.dd, SOURCES, RIVALS: RULES.RIVALS.filter((r) => rk.rivals.includes(r.id)), PER, AGAIN, FAVOURS: true } as Rules;
}
const rel0 = (c: CareerSave, id: string) => (c.relations[id] ? c.relations[id].v : 0);
export const castOpts = (c: CareerSave) => ({ n: RANKS[c.rank].sagas, pool: RANKS[c.rank].pool, ...(c.rank < 2 ? { maxStar: 2 } : {}) });

export interface CareerReport {
  repBefore: number; repAfter: number; followers: number; favours: number; promoted: number | null; trust: Record<string, [number, number]>;
  rel: Record<string, [number, number]>; leaks: string[]; frozen: string[]; milestoneCredits: number;
}
const STAR = [1, 1, 1.5, 2.5];
// Apply a finished window to the career (DESIGN §6.2–6.6). Returns what changed, for the results page.
export function applyWindow(c: CareerSave, g: Game, res: Result, cast: CastSaga[], milestonesPaid: Record<string, number>): CareerReport {
  const rep0 = c.rep, trust0: Record<string, number> = {}, rel0s: Record<string, number> = {};
  let delta = 0, followers = 0, favours = 0;
  res.per.forEach((p) => {
    const s = cast[p.i], star = STAR[s.player.star] || 1;
    const clubs = [s.from.id, s.to.id];
    // Trust: +1 per ask; +2 when a read pointed to the truth and you published a call that matched it.
    for (const cl of g.clues[p.i]) {
      const k = cl.src; if (!(k in c.contacts)) c.contacts[k] = { trust: 0 };
      if (!(k in trust0)) trust0[k] = c.contacts[k].trust;
      c.contacts[k].trust += 1;
      const w = E.weights(g.R, k, cl.r);
      if (p.right && p.call && w[p.truth] > 0 && w[p.truth] === Math.max(...w)) c.contacts[k].trust += 2;
    }
    if (!p.call) return;
    c.calls++;
    const st = p.call.s;
    for (const id of clubs) { if (!(id in rel0s)) rel0s[id] = rel0(c, id); }
    if (p.right) {
      c.right++; delta += [0.5, 1, 2][st]; followers += 100 * [1, 2, 4][st] * star;
      if (p.excl) { delta += 2; followers += 500 * star; favours++; c.exclusives++; }
      for (const id of clubs) bump(c, id, p.excl ? 2 : 1);
    } else {
      delta -= [0.5, 1.5, 4][st];
      if (st === 2) { followers -= 300 * star; for (const id of clubs) bump(c, id, -2); }
      if (st === 1) for (const id of clubs) bump(c, id, -1);
    }
    if (p.call.ut) c.uturns++;
  });
  c.windows++;
  // Drift: a relation with no story for 10 windows moves one step toward 0.
  for (const [id, r] of Object.entries(c.relations)) if (!(id in rel0s) && c.windows - r.last >= 10 && r.v !== 0) { r.v += r.v > 0 ? -1 : 1; r.last = c.windows; }
  c.rep = Math.max(0, Math.min(100, Math.round((c.rep + delta - 0.05 * (c.rep - 50)) * 10) / 10));
  c.followers = Math.max(0, Math.round(c.followers + followers));
  if (res.tier === 'T1') { c.t1++; favours++; }
  const fav = favours;
  for (let k = 0; k < fav; k++) { const kinds = ['burner', 'tipoff', 'stakeout'] as const; const kind = kinds[(c.windows + k) % 3]; if (totalFavours(c) < 5) c.favours[kind]++; }
  let promoted: number | null = null;
  const nx = RANKS[c.rank + 1];
  if (nx && c.windows >= nx.gate[0] && c.rep >= nx.gate[1]) { c.rank++; promoted = c.rank; }
  c.history = [{ n: c.windows, total: res.total, tier: res.tier, repAfter: c.rep, at: Date.now() }, ...c.history].slice(0, 12);
  let milestoneCredits = 0;
  for (const [f, cr] of FOLLOWER_MILESTONES) if (c.followers >= f && !milestonesPaid['f' + f]) { milestonesPaid['f' + f] = Date.now(); milestoneCredits += cr; }
  const trust: Record<string, [number, number]> = {};
  for (const k of Object.keys(trust0)) trust[k] = [trust0[k], c.contacts[k].trust];
  const rel: Record<string, [number, number]> = {}, leaks: string[] = [], frozen: string[] = [];
  for (const id of Object.keys(rel0s)) { const a = rel0s[id], b = rel0(c, id); rel[id] = [a, b]; if (a < 3 && b >= 3) leaks.push(id); if (a > -3 && b <= -3) frozen.push(id); }
  return { repBefore: rep0, repAfter: c.rep, followers, favours: fav, promoted, trust, rel, leaks, frozen, milestoneCredits };
}
function bump(c: CareerSave, id: string, d: number) {
  const r = c.relations[id] || { v: 0, last: c.windows };
  r.v = Math.max(-5, Math.min(5, r.v + d)); r.last = c.windows; c.relations[id] = r;
}
export const totalFavours = (c: CareerSave) => c.favours.burner + c.favours.tipoff + c.favours.stakeout;
export const repEquilibrium = (d: number) => Math.round(50 + 20 * d);
export const outKey = (o: number) => OUTS[o];
