// Squad needs (V2_DESIGN §3.4): a PROJECTION of Plan A and the squad, never stored. Change the shape or the style and
// the needs change with it. The same function runs for AI clubs (their own shape), so they bid for what they lack.
//  - red: no real cover at a position of the plan (depth below the number of slots + ½)
//  - amber: thin (depth below two per slot), the starter is 32+, his contract ends next summer, he is only on loan,
//    he is a weak link for our level, or he doesn't suit how we play (style fit 6+ below his level); or the manager pinned it
import { FREE_AGENT, type Career, type Player, type Position } from '../../model/types';
import { DEFAULT_TACTICS, FORMATIONS, fitPenalty, type FormationId, type Philosophy } from '../tactics';
import { squadOf, strengthOf, type World } from '../world';
import { rcOf } from './state';

export type NeedWhy = 'noCover' | 'thin' | 'old' | 'expiring' | 'loanee' | 'weak' | 'style' | 'manual';
export interface Need { id: string; pos: Position; level: 'red' | 'amber'; why: NeedWhy[]; depth: number; want: number; slots: number; starter: string | null; source: 'plan' | 'manual' }

// Attribute weights [pace, shooting, passing, dribbling, defending, physical] each style asks of outfield players.
const STYLE_W: Record<Philosophy, number[]> = {
  balanced: [1, 1, 1, 1, 1, 1], possession: [0.6, 0.8, 1.8, 1.5, 0.8, 0.5], counter: [1.8, 1.2, 0.9, 1, 0.9, 0.9],
  gegenpress: [1.4, 0.8, 0.9, 0.8, 1.3, 1.6], bus: [0.7, 0.6, 0.8, 0.6, 1.9, 1.5], wings: [1.6, 0.9, 1.1, 1.5, 0.6, 0.8],
  direct: [1, 1.5, 0.8, 0.7, 0.9, 1.6],
};
// How well a player suits the way we play (0-99). Goalkeepers are judged on goalkeeping (and passing in possession).
export function styleFit(p: Pick<Player, 'attrs' | 'position' | 'rating'>, ph: Philosophy): number {
  if (p.position === 'GK') return Math.round(ph === 'possession' ? p.attrs[6] * 0.75 + p.attrs[2] * 0.25 : p.attrs[6]);
  const w = STYLE_W[ph];
  // Each position is measured against its own profile, so a centre-back isn't marked down for not shooting.
  const rel = POS_KEY[p.position];
  let s = 0, t = 0;
  for (let i = 0; i < 6; i++) { const k = w[i] * rel[i]; s += p.attrs[i] * k; t += k; }
  const raw = s / t;
  // Relative to the player's own level: the fit is how much of his quality points the right way.
  return Math.max(1, Math.min(99, Math.round(p.rating + (raw - baseline(p, rel)) * 1.4)));
}
const POS_KEY: Record<Position, number[]> = {
  GK: [0, 0, 1, 0, 0, 1], CB: [1, 0.2, 0.7, 0.3, 2, 1.6], LB: [1.4, 0.3, 1, 0.9, 1.2, 0.9], RB: [1.4, 0.3, 1, 0.9, 1.2, 0.9],
  CDM: [0.8, 0.4, 1.3, 0.7, 1.6, 1.3], CM: [0.9, 0.8, 1.6, 1.1, 0.9, 1], CAM: [1, 1.2, 1.6, 1.5, 0.3, 0.6],
  LW: [1.6, 1.1, 1, 1.5, 0.3, 0.7], RW: [1.6, 1.1, 1, 1.5, 0.3, 0.7], ST: [1.2, 1.8, 0.7, 1, 0.2, 1.2],
};
function baseline(p: Pick<Player, 'attrs'>, rel: number[]): number {
  let s = 0, t = 0;
  for (let i = 0; i < 6; i++) { s += p.attrs[i] * rel[i]; t += rel[i]; }
  return s / t;
}

const cover = (p: Player, pos: Position) => fitPenalty(p.position, pos) === 0 ? 1 : fitPenalty(p.position, pos) <= 4 ? 0.5 : 0;

export interface NeedCtx { formation: FormationId; philosophy: Philosophy; season: number; loanees?: Set<string>; pinned?: Position[]; level?: number }

// The core: works for any club's squad and plan.
export function needsFor(squad: Player[], ctx: NeedCtx): Need[] {
  const slots = FORMATIONS[ctx.formation].slots;
  const count = new Map<Position, number>();
  for (const s of slots) count.set(s.pos, (count.get(s.pos) ?? 0) + 1);
  const level = ctx.level ?? (squad.map((p) => p.rating).sort((a, b) => b - a).slice(0, 11).reduce((s, x) => s + x, 0) / Math.max(1, Math.min(11, squad.length)));
  const bar = level - 7;
  const out: Need[] = [];
  for (const [pos, n] of count) {
    // Cover doesn't have to be as good as the starter: a back-up counts from 12 below our level (15 for keepers).
    const able = squad.filter((p) => p.rating >= level - (pos === 'GK' ? 15 : 12) && p.injured < 8);
    const depth = able.reduce((s, p) => s + cover(p, pos), 0);
    const natural = squad.filter((p) => p.position === pos).sort((a, b) => b.rating - a.rating);
    const starter = natural[0] ?? [...squad].sort((a, b) => (b.rating - fitPenalty(b.position, pos)) - (a.rating - fitPenalty(a.position, pos)))[0] ?? null;
    const why: NeedWhy[] = [];
    let red = false;
    if (depth < n + 0.5) { why.push('noCover'); red = true; } else if (depth < 2 * n) why.push('thin');
    if (starter) {
      const age = ctx.season - starter.birthYear;
      if (age >= 32) why.push('old');
      if (starter.contractUntil <= ctx.season + 1) why.push('expiring');
      if (ctx.loanees?.has(starter.id)) why.push('loanee');
      if (starter.rating < bar + 2) why.push('weak');
      if (ctx.philosophy !== 'balanced' && starter.position !== 'GK' && styleFit(starter, ctx.philosophy) < starter.rating - 5) why.push('style');
    }
    if (ctx.pinned?.includes(pos)) why.push('manual');
    if (!why.length) continue;
    out.push({ id: `need:${pos}`, pos, level: red ? 'red' : 'amber', why, depth: Math.round(depth * 2) / 2, want: 2 * n, slots: n, starter: starter?.id ?? null, source: ctx.pinned?.includes(pos) && why.length === 1 ? 'manual' : 'plan' });
  }
  // Manual needs for positions outside the plan still show.
  for (const pos of ctx.pinned ?? []) if (!count.has(pos) && !out.some((x) => x.pos === pos)) {
    const depth = squad.filter((p) => p.rating >= bar).reduce((s, p) => s + cover(p, pos), 0);
    out.push({ id: `need:${pos}`, pos, level: 'amber', why: ['manual'], depth, want: 2, slots: 0, starter: null, source: 'manual' });
  }
  const weight = (x: Need) => (x.level === 'red' ? 100 : 0) + x.why.length * 10 - x.depth;
  return out.sort((a, b) => weight(b) - weight(a));
}

// The user's needs from Plan A (the tactics in use).
export function needs(w: World, c: Career): Need[] {
  const t = c.tactics ?? DEFAULT_TACTICS;
  const rc = rcOf(c);
  const loanees = new Set(Object.entries(rc.loans).filter(([, l]) => l.to === c.clubId).map(([id]) => id));
  for (const l of c.loans ?? []) if (l.to === c.clubId && l.season === c.season) loanees.add(l.playerId);
  return needsFor(squadOf(w, c.clubId), { formation: t.formation, philosophy: t.philosophy ?? 'balanced', season: c.season, loanees, pinned: rc.pinned, level: strengthOf(w, c.clubId) });
}

// An AI club's red needs (what makes it bid). Its shape comes from its squad the way its manager picks one.
const AI_NEEDS = new WeakMap<Player[], Map<string, Position[]>>();
export function aiNeeds(w: World, clubId: string, season: number): Position[] {
  let m = AI_NEEDS.get(w.players);
  if (!m) { m = new Map(); AI_NEEDS.set(w.players, m); }
  let v = m.get(clubId);
  if (!v) {
    const squad = squadOf(w, clubId);
    const n = (ps: Position[]) => squad.filter((p) => ps.includes(p.position)).length;
    const formation: FormationId = n(['LW', 'RW']) >= 3 ? '4-3-3' : n(['ST']) >= 3 ? '4-4-2' : n(['CAM']) >= 2 ? '4-2-3-1' : '4-1-4-1';
    const style = w.managers?.[clubId]?.style ?? 'balanced';
    v = needsFor(squad, { formation, philosophy: style, season }).filter((x) => x.level === 'red' || x.why.includes('old') || x.why.includes('expiring') || x.why.includes('thin')).map((x) => x.pos);
    m.set(clubId, v);
  }
  return v;
}

export const posMatches = (p: Pick<Player, 'position'>, pos: Position) => cover(p as Player, pos) > 0;
export const isFree = (p: Player) => p.clubId === FREE_AGENT;
