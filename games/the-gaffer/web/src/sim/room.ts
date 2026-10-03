// V2.4 — the dressing room (V2_DESIGN §3.1, §3.2, §4). Two numbers per player: morale (weeks, existing) and TRUST
// (seasons). On top: a squad role in every contract, a three-tier hierarchy with 3–4 leaders who pull the room's mood,
// team COHESION (club-owned, read by the engine: sim/cohesion.ts), typed promises you give in one-to-one talks, and
// transfer requests from players who stop believing you.
//
//   consumes  results and starters (the MatchRecord of each of the user's matches), arrivals and departures, contracts,
//             the transfer window, talks and captaincy (commands)
//   trigger   `roomDay` once per clock step (sim/clock.ts), the room.* commands, the signing/renewal/promotion hooks
//   changes   player.trust / role / release / req, club.cohesion, career.room (promises, asks, causes, clauses)
//   feeds     engine (cohesion ±2 levels; morale settle point pulled by the leaders), renewals (trust gate), offers for
//             unsettled players and release clauses (the market), Today decisions, inbox, news, the Why card
// Everything is pure and seeded (no Math.random): same state + same commands → same room.
import { lastMatchHere } from './record';
import type { Archetype, Career, LocalizedName, Player, Pledge, PledgeType, RoomAsk, RoomCause, RoomState, SquadRole, TalkWhy, Tier } from '../model/types';
import { FREE_AGENT } from '../model/types';
import { clamp, hash32, rngFor } from './rng';
import { playerOf, squadOf, squadStrength, type World } from './world';
import { autoXI, available, DEFAULT_TACTICS, xiFor } from './tactics';
import { emit } from './events';
import { addMsg } from './coach';
import { addNews } from './news';
import { windowOf, isDeadlineDay } from './windows';
import { GROUP_OF } from './groups';
import { COH0, cohLevel, cohesionOfClub } from './cohesion';
import { acceptOffer, dropFromXI } from './transfers';
import { settleSellOn } from './recruit/deals';
import { roundFee } from './season';
import { levelOf, biasOf, staffOf } from './delegation';
import { matchRatings } from './ratings';
import type { LiveMatch } from './match';

export { COH0, cohLevel };

// ---------- numbers (judgement, V2_DESIGN §3.2; tune in playtests) ----------
export const TRUST0 = 50;
export const ROLES: SquadRole[] = ['star', 'starter', 'rotation', 'prospect'];
// Share of league starts while fit that each role promises (prospects: appearances instead).
export const ROLE_SHARE: Record<SquadRole, number> = { star: 0.7, starter: 0.5, rotation: 0.25, prospect: 0 };
export const ROLE_WINDOW = 10;        // league matchdays a role promise is judged over
export const PROSPECT_WINDOW = 20;    // …and a prospect promise (10 appearances, or a loan)
export const PROSPECT_APPS = 10;
export const CONTRACT_DAYS = 8;       // a "new contract" promise must be kept within this many matchdays
export const TALK_GAP = 4;            // one conversation per player per 4 matchdays
export const ASK_DAYS = 3;            // a player waits this long for his word, then takes it as an answer
export const KEPT = 8, BROKEN = -20, UNDER = -4, RENEWED_AT_ASK = 5, REFUSED = -15;
export const COH = { settled: 1, win: 1, loss: -1, arrival: -2, arrivalDays: 6, leaderBroken: -4, leaderRequest: -5, leaderSold: -3, drift: 0.1 };
export const REQUEST_AFTER = 5;       // matchdays with trust < 25 and morale < 40 before he asks to leave
// A room with fewer than 25 players has 3 leaders, otherwise 4. The next 8 are the core.
const LEADERS = (n: number) => (n < 25 ? 3 : 4);
const CORE = 8;

// ---------- reading a player ----------
export const trustOf = (p: Pick<Player, 'trust'>) => p.trust ?? TRUST0;
export const now = (c: Career) => c.coach?.days ?? 0;

// One personality per player, fixed by his id (own players are always known; V2.5 fogs other clubs' at knowledge < 50).
export function archetypeOf(p: Pick<Player, 'id'>): Archetype {
  const h = hash32(`arch:${p.id}`) % 100;
  return h < 30 ? 'steady' : h < 50 ? 'driven' : h < 65 ? 'loyal' : h < 77 ? 'volatile' : h < 90 ? 'mercenary' : 'leader';
}

const byRating = (ps: Player[]) => [...ps].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
export const rankRole = (rank: number, age: number): SquadRole => (rank < 3 ? 'star' : rank < 11 ? 'starter' : age <= 21 ? 'prospect' : 'rotation');
// The role a player's place implies before he has one in his contract: the three best of the current XI are Stars, the
// rest of it Starters, everyone else Rotation (21 and under: Prospect). The user's club reads its own XI.
export function defaultRoles(w: World, c: Career | null, clubId: string): Map<string, SquadRole> {
  const squad = squadOf(w, clubId);
  const season = c?.season ?? 2026;
  const xi = c && c.clubId === clubId ? xiFor(w, c).xi : autoXI(squad, DEFAULT_TACTICS.formation);
  const inXI = new Set(xi.map((p) => p.id));
  const top = new Set(byRating(xi).slice(0, 3).map((p) => p.id));
  return new Map(squad.map((p) => [p.id, top.has(p.id) ? 'star' : inXI.has(p.id) ? 'starter' : season - p.birthYear <= 21 ? 'prospect' : 'rotation'] as [string, SquadRole]));
}
// His contract role, or (before he has one) the role his place implies.
export function roleOf(w: World, c: Career | null, p: Player): SquadRole {
  return p.role ?? defaultRoles(w, c, p.clubId).get(p.id) ?? 'rotation';
}
// The share of starts below which a player feels his role isn't being respected (softer than a promise's bar); only
// the roles that mean regular football complain about minutes.
export const ROLE_FEEL: Record<SquadRole, number> = { star: 0.6, starter: 0.4, rotation: 0, prospect: 0 };
const roleStep = (r: SquadRole) => (r === 'star' ? 3 : r === 'starter' ? 2 : r === 'rotation' ? 1 : 0);

// ---------- hierarchy ----------
export interface Standing { id: string; score: number; tier: Tier; rank: number }
// Status = seasons at the club (cap 5) × 8 + rating rank (the XI's worth: 20/17/14/12/10/8/6/5/4/3/2 — the spec's top-5
// ladder stretched so a first-choice player is never 'fringe') + 10 at 28 or older + 15 for the captain
// + 10 for a natural leader. Derived every time, never stored.
export function hierarchy(w: World, c: Career): Map<string, Standing> {
  const squad = squadOf(w, c.clubId);
  const ranked = byRating(squad);
  const loanIn = new Set((c.loans ?? []).filter((l) => l.to === c.clubId && l.season === c.season).map((l) => l.playerId));
  const scored = squad.map((p) => {
    const rank = ranked.indexOf(p);
    const seasons = Math.min(5, Math.max(0, c.season - (p.jc === c.clubId && p.since !== undefined ? p.since : c.season)));
    const score = seasons * 8 + ([20, 17, 14, 12, 10, 8, 6, 5, 4, 3, 2][rank] ?? 0) + (c.season - p.birthYear >= 28 ? 10 : 0) + (p.captain ? 15 : 0)
      + (archetypeOf(p) === 'leader' ? 10 : 0) - (loanIn.has(p.id) ? 15 : 0);
    return { id: p.id, score, rank };
  }).sort((a, b) => b.score - a.score || a.rank - b.rank);
  const nL = LEADERS(squad.length);
  const out = new Map<string, Standing>();
  scored.forEach((s, i) => out.set(s.id, { ...s, tier: i < nL ? 'leader' : i < nL + CORE ? 'core' : 'fringe' }));
  return out;
}
export const leadersOf = (w: World, c: Career) => {
  const h = hierarchy(w, c);
  return squadOf(w, c.clubId).filter((p) => h.get(p.id)?.tier === 'leader').sort((a, b) => h.get(b.id)!.score - h.get(a.id)!.score);
};

// The leaders pull the room: the squad's morale settles at 60 + … + 0.25 × (mean leader morale − 60); a natural leader's
// mood counts double. Read by the matchday (season.ts playRound).
export function roomPull(w: World, c: Career): number {
  const L = leadersOf(w, c);
  if (!L.length) return 0;
  let sum = 0, n = 0;
  for (const p of L) { const k = archetypeOf(p) === 'leader' ? 2 : 1; sum += p.morale * k; n += k; }
  return 0.25 * (sum / n - 60);
}

export const cohesionOf = (w: World, clubId: string) => cohesionOfClub(w.clubs, clubId);

// ---------- read-only helpers for other systems ----------
// Players at a club who want out: a transfer request, or trust and morale both gone. Any club (other clubs' players
// carry the defaults, so they only show up once something really went wrong). Recruitment / AI bidding reads this;
// the matching domain event is 'room.request' (type 'room', refs.p = [player], data: { club, value, leader }).
export interface Unhappy { player: Player; requested: boolean; refused: boolean; trust: number; morale: number; since?: number }
export function unhappyPlayers(w: World, clubId: string): Unhappy[] {
  return squadOf(w, clubId)
    .filter((p) => p.req !== undefined || (trustOf(p) < 25 && p.morale < 40))
    .map((p) => ({ player: p, requested: p.req !== undefined, refused: !!p.reqNo, trust: trustOf(p), morale: p.morale, since: p.req }))
    .sort((a, b) => Number(b.requested) - Number(a.requested) || b.player.rating - a.player.rating);
}

// ---------- room state ----------
const emptyRoom = (clubId: string, squad: string[]): RoomState => ({
  club: clubId, squad, xi: [], pledges: [], asks: [], causes: [], talks: {}, asked: {}, roll: {}, under: {}, low: {}, heard: {}, debt: [], story: {}, exits: [], clauses: [],
});
export const roomOf = (c: Career): RoomState => c.room ?? emptyRoom(c.clubId, []);

// Seasons a player has probably been at his club when we first meet him (the data has no join dates): the captain
// longest, everyone else spread by a hash, never before he was 17.
export function tenureGuess(p: Player, season: number): number {
  const age = season - p.birthYear;
  const guess = p.captain ? 4 : hash32(`since:${p.id}`) % 5;
  return Math.max(0, Math.min(guess, age - 17));
}

// Gives the user's squad its dressing-room fields (idempotent). Used by the save migration (v6) and on the first tick
// of a new career or a new job: trust 50 (60 if signed this season), roles from squad rank, cohesion 55 if unset.
export function ensureRoom(w: World, c: Career): { world: World; career: Career } {
  if (c.room && c.room.club === c.clubId) return { world: w, career: c };
  const squad = squadOf(w, c.clubId);
  const roles = defaultRoles(w, c, c.clubId);
  const signed = new Set(c.deals.filter((d) => d.season === c.season && d.to === c.clubId && (d.kind === 'in' || d.kind === 'free')).map((d) => d.playerId));
  const set = new Map<string, Player>();
  for (const p of squad) {
    if (p.jc === c.clubId && p.role) continue;
    set.set(p.id, {
      ...p, trust: p.trust ?? (signed.has(p.id) ? 60 : TRUST0), role: p.role ?? roles.get(p.id) ?? 'rotation',
      jc: c.clubId, since: p.jc === c.clubId && p.since !== undefined ? p.since : signed.has(p.id) ? c.season : c.season - tenureGuess(p, c.season),
    });
  }
  const players = set.size ? w.players.map((p) => set.get(p.id) ?? p) : w.players;
  const clubs = w.clubs.some((x) => x.id === c.clubId && x.cohesion === undefined) ? w.clubs.map((x) => (x.id === c.clubId ? { ...x, cohesion: COH0 } : x)) : w.clubs;
  return { world: { ...w, players, clubs }, career: { ...c, room: emptyRoom(c.clubId, squad.map((p) => p.id)) } };
}

// ---------- small mutable context used by the tick and the commands ----------
class Ctx {
  w: World; c: Career; room: RoomState;
  private changed = new Map<string, Player>();
  moved = new Set<string>();
  coh: number;
  constructor(w: World, c: Career) { this.w = w; this.c = c; this.room = { ...roomOf(c) }; this.coh = cohesionOf(w, c.clubId); }
  get(id: string): Player | undefined { return this.changed.get(id) ?? playerOf(this.w, id); }
  set(p: Player) { this.changed.set(p.id, p); }
  trust(id: string, d: number, why: string) {
    const p = this.get(id);
    if (!p || !d) return 0;
    const a = archetypeOf(p);
    let x = d;
    if (a === 'loyal' && x < 0) x /= 2;
    if (a === 'mercenary') x *= 0.75;
    x = Math.round(x);
    if (!x) return 0;
    const t = clamp(trustOf(p) + x, 0, 100);
    this.set({ ...p, trust: t, dt: [t - trustOf(p), why] });
    return t - trustOf(p);
  }
  morale(id: string, d: number, why: string) {
    const p = this.get(id);
    if (!p || !d) return 0;
    const m = clamp(Math.round(p.morale + d), 5, 100);
    this.moved.add(id);
    this.set({ ...p, morale: m, dm: [m - p.morale, why] });
    return m - p.morale;
  }
  cohesion(d: number, k: string, pn?: LocalizedName) {
    if (!d) return;
    this.coh = clamp(Math.round((this.coh + d) * 10) / 10, 0, 100);
    if (Math.abs(d) >= 0.5) this.room.causes = [{ k, d: Math.round(d * 10) / 10, at: now(this.c), pn } as RoomCause, ...this.room.causes].slice(0, 8);
  }
  event(name: string, pid: string | null, data: Record<string, string | number | boolean | null> = {}) {
    const e = emit(this.c, 'room', name, { refs: pid ? { p: [pid] } : {}, data: { club: this.c.clubId, ...data } });
    this.c = e.career;
    return e.id;
  }
  msg(key: string, p: Pick<Player, 'id' | 'name'>, ev: string, ref: { n?: number; s?: string; club?: string } = {}) {
    const before = this.c.inbox;
    this.c = addMsg(this.c, 'room', key, { player: p.id, pn: p.name, ...ref });
    if (this.c.inbox !== before && this.c.inbox[0]) this.c = { ...this.c, inbox: [{ ...this.c.inbox[0], ev }, ...this.c.inbox.slice(1)] };
  }
  news(key: string, p: Pick<Player, 'id' | 'name'>, ev: string, ref: { n?: number; s?: string; club?: string; club2?: string } = {}) {
    const before = this.c.news;
    this.c = addNews(this.c, 'room', key, { player: p.id, pn: p.name, club: this.c.clubId, ...ref });
    if (this.c.news !== before && this.c.news?.[0]) this.c = { ...this.c, news: [{ ...this.c.news[0], ev }, ...this.c.news.slice(1)] };
  }
  done(): { world: World; career: Career } {
    let w = this.w;
    if (this.changed.size) w = { ...w, players: w.players.map((p) => this.changed.get(p.id) ?? p) };
    this.changed = new Map();
    if (cohesionOf(w, this.c.clubId) !== this.coh) w = { ...w, clubs: w.clubs.map((x) => (x.id === this.c.clubId ? { ...x, cohesion: this.coh } : x)) };
    this.w = w;
    return { world: w, career: { ...this.c, room: this.room } };
  }
  flush() { const r = this.done(); this.w = r.world; this.c = r.career; }
}

// ---------- joining ----------
export type JoinHow = 'signed' | 'loan' | 'grad' | 'other';
// A player arrives in the first team: trust 60 (academy graduates 65, loanees 55), his contract role, a promise of that
// role if he was signed with one, and −2 cohesion that the room recovers over 6 matchdays (graduates don't unsettle it).
export function joinRoom(w: World, c: Career, id: string, how: JoinHow, role?: SquadRole): { world: World; career: Career } {
  const base = ensureRoom(w, c);
  const x = new Ctx(base.world, base.career);
  join(x, id, how, role);
  return x.done();
}
function join(x: Ctx, id: string, how: JoinHow, role?: SquadRole) {
  const p = x.get(id);
  if (!p || p.clubId !== x.c.clubId) return;
  const r: SquadRole = role ?? (how === 'grad' ? 'prospect' : roleOf(x.w, x.c, p));
  x.set({ ...p, trust: how === 'grad' ? 65 : how === 'loan' ? 55 : 60, role: r, jc: x.c.clubId, since: x.c.season, req: undefined, reqNo: undefined, dt: undefined, dm: undefined });
  if (!x.room.squad.includes(id)) x.room.squad = [...x.room.squad, id];
  if (how !== 'grad') { x.cohesion(COH.arrival, 'arrival', p.name); x.room.debt = [...x.room.debt, COH.arrivalDays]; }
  if (how === 'signed' && role) addPledge(x, p, { type: 'role', role });
  if (how === 'grad') addPledge(x, p, { type: 'role', role: 'prospect' });
}

// ---------- promises ----------
export interface PledgeReq { type: PledgeType; role?: SquadRole; group?: number }
export type PledgeNo = 'pledged' | 'window' | 'role' | 'long' | 'group' | 'gone';
export function pledgeCheck(_w: World, c: Career, p: Player, q: PledgeReq): PledgeNo | null {
  if (p.clubId !== c.clubId) return 'gone';
  if (roomOf(c).pledges.some((x) => x.status === 'open' && x.playerId === p.id)) return 'pledged';
  if (q.type === 'role') {
    if (!q.role || !ROLES.includes(q.role)) return 'role';
    if (q.role === 'prospect' && c.season - p.birthYear > 21) return 'role';
  }
  if (q.type === 'sign') {
    if (!windowOf(c)) return 'window';
    if (q.group === undefined || q.group < 0 || q.group > 3) return 'group';
    if (roomOf(c).pledges.some((x) => x.status === 'open' && x.type === 'sign' && x.group === q.group)) return 'pledged';
  }
  if (q.type === 'keep' && !windowOf(c)) return 'window';
  if (q.type === 'contract' && p.contractUntil > c.season + 2) return 'long';
  return null;
}
function addPledge(x: Ctx, p: Player, q: PledgeReq): Pledge {
  const t = now(x.c);
  const pl: Pledge = {
    id: `pl${x.c.season}.${t}.${p.id}.${q.type}`, playerId: p.id, pn: p.name, type: q.type, role: q.role, group: q.group, made: t, season: x.c.season,
    due: q.type === 'contract' ? t + CONTRACT_DAYS : q.role === 'prospect' ? PROSPECT_WINDOW : ROLE_WINDOW, n: 0, st: 0, el: 0, apps: 0,
    cu0: q.type === 'contract' ? p.contractUntil : undefined, d0: q.type === 'sign' ? x.c.deals.length : undefined, status: 'open',
  };
  if (q.type === 'role' && q.role) { const cur = x.get(p.id)!; x.set({ ...cur, role: q.role }); }
  x.room.pledges = [pl, ...x.room.pledges.filter((y) => !(y.playerId === p.id && y.status === 'open'))];
  return pl;
}
// How a role promise stands: starts and fit matchdays so far, what the role needs, whether it can still be kept.
// `margin`: matchdays left minus the starts he still needs (below 0 it can't be kept any more).
export function pledgeState(pl: Pledge): { share: number; need: number; left: number; slipping: boolean; lost: boolean; margin: number } {
  const need = pl.role ? ROLE_SHARE[pl.role] : 0;
  const left = Math.max(0, pl.due - pl.n);
  if (pl.type !== 'role') return { share: 0, need, left, slipping: false, lost: false, margin: left };
  if (pl.role === 'prospect') { const m = left - (PROSPECT_APPS - pl.apps); return { share: pl.apps / PROSPECT_APPS, need: 1, left, slipping: m <= 2, lost: m < 0, margin: m }; }
  const share = pl.el ? pl.st / pl.el : 1;
  const needed = Math.ceil(need * (pl.el + left) - 1e-9) - pl.st;
  const margin = left - needed;
  return { share, need, left, slipping: pl.el >= 2 && share < need, lost: margin < 0, margin };
}

function closePledge(x: Ctx, pl: Pledge, kept: boolean) {
  const t = now(x.c);
  const p = x.get(pl.playerId);
  const closed: Pledge = { ...pl, status: kept ? 'kept' : 'broken', closed: t };
  x.room.pledges = [closed, ...x.room.pledges.filter((y) => y.id !== pl.id)].slice(0, 16);
  if (!p) return;
  const here = p.clubId === x.c.clubId;
  const tier = hierarchy(x.w, x.c).get(p.id)?.tier;
  const ev = x.event(kept ? 'promise.kept' : 'promise.broken', p.id, { type: pl.type, role: pl.role ?? null, leader: tier === 'leader' });
  closed.ev = ev;
  if (kept) {
    if (here) { x.trust(p.id, KEPT, `kept.${pl.type}`); x.morale(p.id, 4, `kept.${pl.type}`); }
    x.msg('dr.kept', p, ev, { s: pledgeKey(pl) });
    return;
  }
  if (here) {
    x.trust(p.id, BROKEN, `broken.${pl.type}`);
    x.morale(p.id, -10, `broken.${pl.type}`);
    x.room.asks = [{ playerId: p.id, pn: p.name, why: 'broken' as TalkWhy, made: t, until: t + ASK_DAYS, ev }, ...x.room.asks.filter((a) => a.playerId !== p.id)];
    x.room.asked = { ...x.room.asked, [p.id]: t };
  }
  if (tier === 'leader' || pl.type === 'keep') {
    // A leader's broken word, or a man sold after you promised to keep him: the whole room saw it.
    x.cohesion(pl.type === 'keep' && tier !== 'leader' ? COH.leaderBroken / 2 : COH.leaderBroken, 'leaderBroken', p.name);
    for (const q of squadOf(x.w, x.c.clubId)) if (q.id !== p.id) x.morale(q.id, -2, 'leaderBroken');
  }
  x.msg('dr.broken', p, ev, { s: pledgeKey(pl) });
  x.news('dr.broken', p, ev, { s: pledgeKey(pl) });
}

export const pledgeKey = (q: { type: PledgeType; role?: SquadRole; group?: number }) => (q.type === 'role' ? `role.${q.role}` : q.type === 'sign' ? `sign.${q.group ?? 1}` : q.type);

// ---------- the tick ----------
// Runs once per clock step, after the matchday (and before the full-time card is built, so it can show the change).
// `pre`: the world before the matchday (who was fit at kick-off). `mine`: the user's match this step, if any.
export function roomDay(pre: World, w0: World, c0: Career, mine: LiveMatch | null): { world: World; career: Career } {
  if (c0.sacked) return { world: w0, career: c0 };
  const base = ensureRoom(w0, c0);
  const x = new Ctx(base.world, base.career);
  const t = now(x.c);
  const club = x.c.clubId;
  const window = windowOf(x.c);
  const squad = squadOf(x.w, club);
  const ids = new Set(squad.map((p) => p.id));
  const loanedOut = new Set((x.c.loans ?? []).filter((l) => l.from === club).map((l) => l.playerId));

  // 1. Departures and arrivals since the last tick.
  for (const id of x.room.squad) {
    if (ids.has(id) || loanedOut.has(id)) continue;
    const p = x.get(id);
    if (!p) continue;
    for (const pl of x.room.pledges.filter((y) => y.status === 'open' && y.playerId === id)) closePledge(x, pl, false);
    const wasLeader = (x.room.lead ?? []).includes(id);
    if (wasLeader) x.cohesion(COH.leaderSold, 'leaderSold', p.name);
    if (p.req !== undefined || wasLeader) {
      const why = p.req !== undefined ? 'req' : 'leader';
      x.room.exits = [{ id, pn: p.name, season: x.c.season, why } as RoomState['exits'][number], ...x.room.exits].slice(0, 12);
      const ev = x.event('room.exit', id, { to: p.clubId, why });
      x.news(p.clubId === FREE_AGENT ? 'dr.leftFree' : 'dr.exit', p, ev, { club2: p.clubId });
    }
    x.room.asks = x.room.asks.filter((a) => a.playerId !== id);
    x.room.clauses = x.room.clauses.filter((a) => a.playerId !== id);
  }
  for (const p of squad) {
    if (p.jc === club || loanedOut.has(p.id)) continue;
    const grad = (x.c.grads ?? []).includes(p.id);
    const loan = (x.c.loans ?? []).some((l) => l.playerId === p.id && l.to === club);
    join(x, p.id, grad ? 'grad' : loan ? 'loan' : 'other');
  }
  x.room.squad = squad.map((p) => p.id);

  // 2. The user's match: starts against roles and promises, continuity, the result.
  const side = mine ? (mine.sides[0].clubId === club ? 0 : mine.sides[1].clubId === club ? 1 : -1) : -1;
  const k = (side < 0 ? 0 : side) as 0 | 1;
  if (mine && side >= 0) {
    const subIn = new Set(mine.events.filter((e) => e.kind === 'sub' && e.inId).map((e) => e.inId!));
    const ours = new Set([...mine.sides[k].onPitch, ...mine.sides[k].bench, ...mine.played].filter((id) => id && ids.has(id)));
    const played = new Set(mine.played.filter((id) => ours.has(id)));
    const starters = [...played].filter((id) => !subIn.has(id));
    const started = new Set(starters);
    const league = !mine.cup;
    const fitAt = (id: string) => { const p = playerOf(pre, id); return !!p && available(p); };
    for (const pl of x.room.pledges) {
      if (pl.status !== 'open' || pl.type !== 'role' || !ids.has(pl.playerId)) continue;
      const i = x.room.pledges.indexOf(pl);
      const upd = { ...pl, apps: pl.apps + (played.has(pl.playerId) ? 1 : 0) };
      if (league) { upd.n++; if (fitAt(pl.playerId)) { upd.el++; if (started.has(pl.playerId)) upd.st++; } }
      x.room.pledges = x.room.pledges.map((y, j) => (j === i ? upd : y));
    }
    if (league) {
      const roll = { ...x.room.roll }, under = { ...x.room.under };
      for (const p of squad) {
        if (!fitAt(p.id)) continue;
        roll[p.id] = `${roll[p.id] ?? ''}${started.has(p.id) ? 1 : 0}`.slice(-ROLE_WINDOW);
        const r = roleOf(x.w, x.c, x.get(p.id)!);
        const s = roll[p.id];
        const share = [...s].filter((ch) => ch === '1').length / s.length;
        if (s.length >= 5 && share < ROLE_FEEL[r]) {
          under[p.id] = (under[p.id] ?? 0) + 1;
          if (under[p.id] % 5 === 0) { x.trust(p.id, UNDER, 'minutes'); x.morale(p.id, -3, 'minutes'); }
        } else under[p.id] = 0;
      }
      x.room.roll = roll; x.room.under = under;
      const same = starters.filter((id) => x.room.xi.includes(id)).length;
      if (x.room.xi.length && same >= 8) x.cohesion(COH.settled, 'settled');
      x.room.xi = starters;
    }
    const gd = mine.goals[k] - mine.goals[1 - k];
    const pens = mine.pens ? mine.pens[k] - mine.pens[1 - k] : 0;
    if (gd > 0 || (gd === 0 && pens > 0)) x.cohesion(COH.win, 'win'); else if (gd < 0 || pens < 0) x.cohesion(COH.loss, 'loss');
    // New faces bed in: each arrival's −2 comes back over 6 matchdays.
    if (x.room.debt.length) { x.cohesion((x.room.debt.length * -COH.arrival) / COH.arrivalDays, 'bedIn'); x.room.debt = x.room.debt.map((d) => d - 1).filter((d) => d > 0); }
    x.cohesion((COH0 - x.coh) * COH.drift, 'drift');
    // A player who left us unhappy, back to face his old club.
    const opp = mine.sides[1 - k];
    for (const e of x.room.exits) {
      if (!mine.played.includes(e.id)) continue;
      const p = playerOf(x.w, e.id) ?? playerOf(pre, e.id);
      if (!p || p.clubId !== opp.clubId) continue;
      const rt = matchRatings(mine, (id) => (playerOf(x.w, id) ?? playerOf(pre, id))!).rating[e.id];
      const ev = x.event('room.return', e.id, { rating: rt ?? null });
      x.news('dr.returns', { id: e.id, name: e.pn }, ev, { club2: opp.clubId, n: Math.round((rt ?? 6) * 10) / 10, s: `${mine.goals[k]}-${mine.goals[1 - k]}` });
    }
  }

  // 3. Promises due.
  for (const pl of [...x.room.pledges]) {
    if (pl.status !== 'open') continue;
    const p = x.get(pl.playerId);
    if (!p) continue;
    if (p.clubId !== club && !loanedOut.has(p.id)) continue; // handled as a departure
    if (pl.type === 'role') {
      if (pl.role === 'prospect') {
        if (loanedOut.has(p.id) || pl.apps >= PROSPECT_APPS) closePledge(x, pl, true);
        else if (pl.n >= pl.due || pl.season !== x.c.season) closePledge(x, pl, false);
      } else if (pl.n >= pl.due) {
        if (pl.el < 4) { if (pl.n >= pl.due + 6) closePledge(x, pl, true); } // injured most of the time: not your fault
        else closePledge(x, pl, pl.st / pl.el >= ROLE_SHARE[pl.role!]);
      }
    } else if (pl.type === 'contract') {
      if (p.contractUntil > (pl.cu0 ?? 0)) closePledge(x, pl, true);
      else if (t >= pl.due) closePledge(x, pl, false);
    } else if (pl.type === 'sign') {
      const fresh = x.c.deals.slice(0, Math.max(0, x.c.deals.length - (pl.d0 ?? x.c.deals.length)));
      const hit = fresh.some((d) => d.to === club && (d.kind === 'in' || d.kind === 'free') && GROUP_OF[playerOf(x.w, d.playerId)?.position ?? 'GK'] === pl.group && d.playerId !== pl.playerId);
      if (hit) closePledge(x, pl, true);
      else if (!window) closePledge(x, pl, false);
    } else if (pl.type === 'keep') {
      if (!window) closePledge(x, pl, true);
    }
  }

  // 4. Unsettled players ask to leave; settled ones take the request back.
  x.flush();
  const H = hierarchy(x.w, x.c);
  const low = { ...x.room.low };
  for (const p0 of squadOf(x.w, club)) {
    const p = x.get(p0.id)!;
    if (loanedOut.has(p.id)) continue;
    const bar = archetypeOf(p) === 'mercenary' ? 30 : 25;
    if (trustOf(p) < bar && p.morale < 40) low[p.id] = (low[p.id] ?? 0) + 1; else low[p.id] = 0;
    if (p.req === undefined && low[p.id] >= REQUEST_AFTER) {
      const leader = H.get(p.id)?.tier === 'leader';
      x.set({ ...p, req: t, reqNo: undefined });
      const ev = x.event('room.request', p.id, { value: p.marketValue, leader, trust: trustOf(p), morale: p.morale });
      if (leader) x.cohesion(COH.leaderRequest, 'leaderRequest', p.name);
      x.msg('dr.request', p, ev);
      x.news('dr.request', p, ev);
    } else if (p.req !== undefined && !p.listed && trustOf(p) >= 45 && p.morale >= 55) {
      x.set({ ...p, req: undefined, reqNo: undefined });
      const ev = x.event('room.settled', p.id);
      x.news('dr.settled', p, ev);
    }
  }
  x.room.low = low;

  // 5. Asks: answered by nobody → taken as an answer; new ones from players with something on their mind.
  for (const a of x.room.asks) if (a.until < t) { x.morale(a.playerId, -4, 'ignored'); x.trust(a.playerId, -3, 'ignored'); }
  x.room.asks = x.room.asks.filter((a) => a.until >= t && ids.has(a.playerId));
  if (x.room.asks.length < 2 && t - Math.max(-99, ...Object.values(x.room.asked)) >= 2) {
    const cand = squadOf(x.w, club).filter((p) => !loanedOut.has(p.id) && !x.room.asks.some((a) => a.playerId === p.id)
      && t - (x.room.asked[p.id] ?? -99) >= 6 && t - (x.room.talks[p.id] ?? -99) >= TALK_GAP && p.req === undefined)
      .map((p) => ({ p, why: askWhy(x, x.get(p.id)!) })).filter((y) => y.why).sort((a, b) => PRIO[a.why!] - PRIO[b.why!] || b.p.rating - a.p.rating)[0];
    if (cand && cand.why) {
      const ev = x.event('room.ask', cand.p.id, { why: cand.why });
      x.room.asks = [...x.room.asks, { playerId: cand.p.id, pn: cand.p.name, why: cand.why, made: t, until: t + ASK_DAYS, ev } as RoomAsk];
      x.room.asked = { ...x.room.asked, [cand.p.id]: t };
    }
  }
  // The psychologist takes the word himself when the manager handed the dressing room over (never with a promise:
  // only the manager can give his word).
  if (levelOf(x.c, 'development') === 'staff' && staffOf(x.c, 'psychologist')) {
    for (const a of x.room.asks.filter((y) => y.made < t)) {
      const p = x.get(a.playerId);
      if (!p) continue;
      const tone = archetypeOf(p) === 'driven' || archetypeOf(p) === 'leader' ? 'challenge' : 'reassure';
      talkApply(x, p, tone, null, 'psychologist');
      x.c = { ...x.c, staffLog: [{ season: x.c.season, round: x.c.round, duty: 'morale' as const, key: `dr.talk.${tone}`, pn: p.name }, ...(x.c.staffLog ?? [])].slice(0, 40) };
    }
  }

  // 6. The market: rivals circle unsettled players; bigger clubs pay release clauses (while the window is open).
  x.flush();
  if (window) {
    const r = (id: string) => rngFor(x.c.seed, 'room', x.c.season, x.c.round, id)();
    const dd = isDeadlineDay(x.c) ? 1.6 : 1;
    const me = x.w.clubs.find((y) => y.id === club)!;
    const lid = me.leagueId;
    let offers = x.c.offers;
    for (const p of squadOf(x.w, club)) {
      if (loanedOut.has(p.id)) continue;
      const unsettled = p.req !== undefined || (trustOf(p) < 25 && p.morale < 40 && p.contractUntil <= x.c.season + 1);
      if (unsettled && !p.listed && !offers.some((o) => o.playerId === p.id) && r(`bid:${p.id}`) < (p.req !== undefined ? 0.35 : 0.15) * dd) {
        const fee = roundFee(p.marketValue * (1 + r(`fee:${p.id}`) * 0.25));
        const buyer = rivalFor(x.w, p, fee, lid, club, r(`who:${p.id}`));
        if (buyer) {
          offers = [...offers, { id: `o${x.c.season}_${x.c.round}_${p.id}_r`, playerId: p.id, clubId: buyer, fee, round: x.c.round }];
          const ev = x.event('room.interest', p.id, { buyer, fee });
          x.c = { ...x.c, offers };
          x.msg('dr.interest', p, ev, { club: buyer, n: fee });
        }
      }
      if (p.release && !x.room.clauses.some((y) => y.playerId === p.id)) {
        const chance = 0.05 + (p.req !== undefined ? 0.15 : 0) + (trustOf(p) < 35 ? 0.08 : 0) + (p.release < p.marketValue * 1.6 ? 0.1 : 0);
        if (r(`cl:${p.id}`) < chance * dd) {
          const big = x.w.clubs.filter((y) => y.id !== club && y.reputation >= me.reputation + 3 && y.budget >= p.release! && squadStrength(squadOf(x.w, y.id)) >= p.rating - 5 && squadOf(x.w, y.id).length < 30)
            .sort((a, b) => a.reputation - b.reputation || a.id.localeCompare(b.id));
          const buyer = big[Math.floor(r(`clw:${p.id}`) * Math.min(4, big.length))];
          if (buyer) {
            const ev = x.event('room.clause', p.id, { buyer: buyer.id, fee: p.release });
            x.room.clauses = [...x.room.clauses, { playerId: p.id, pn: p.name, clubId: buyer.id, fee: p.release, until: t + 1, ev }];
            x.msg('dr.clause', p, ev, { club: buyer.id, n: p.release });
          }
        }
      }
    }
  }
  // A clause nobody answered goes through (a release clause is binding); it lapses if the club can't sell any more.
  for (const cl of x.room.clauses.filter((y) => y.until < t || !window)) {
    x.room.clauses = x.room.clauses.filter((y) => y !== cl);
    x.flush();
    clauseGo(x, cl);
  }

  // 7. Homegrown players climbing the room: a story in stages (core, leader); the armband is the last one (command).
  x.flush();
  const H2 = hierarchy(x.w, x.c);
  for (const p of squadOf(x.w, club)) {
    if (!homegrown(x.c, p)) continue;
    const tier = H2.get(p.id)?.tier;
    const stage = x.room.story[p.id] ?? 0;
    const want = tier === 'leader' ? 3 : tier === 'core' ? 2 : 0;
    if (want > stage) {
      x.room.story = { ...x.room.story, [p.id]: want };
      const ev = x.event(want === 3 ? 'room.leader' : 'room.core', p.id);
      x.news(want === 3 ? 'dr.leader' : 'dr.core', p, ev, { n: x.c.season - p.birthYear });
    }
  }

  // 8. Morale arrows for everything the matchday itself did (results, the drift back to normal).
  for (const p of squadOf(x.w, club)) {
    const before = playerOf(pre, p.id);
    const cur = x.get(p.id)!;
    if (before && before.clubId === club && !x.moved.has(p.id) && cur.morale !== before.morale) {
      const d = cur.morale - before.morale;
      if (Math.abs(d) >= 2) x.set({ ...cur, dm: [d, mine && side >= 0 ? (mine.goals[k] > mine.goals[1 - k] ? 'win' : mine.goals[k] < mine.goals[1 - k] ? 'loss' : 'draw') : 'drift'] });
    }
  }
  x.room.lead = [...H2.entries()].filter(([, s]) => s.tier === 'leader').map(([id]) => id);
  return x.done();
}

// Academy graduates: promoted by you, produced by the club's academy (V2.6 `hg`), or at the club since he was 17.
export const homegrown = (c: Career, p: Player) => (c.grads ?? []).includes(p.id) || p.hg === c.clubId || (p.jc === c.clubId && p.since !== undefined && p.since - p.birthYear <= 17);

const PRIO: Record<TalkWhy, number> = { broken: 0, request: 1, asked: 2, minutes: 3, role: 4, contract: 5, unhappy: 6, doubts: 7, new: 8, form: 9 };
// Why a player would come knocking (the ask), from the state only.
function askWhy(x: Ctx, p: Player): TalkWhy | null {
  const t = now(x.c);
  const recentBroken = x.room.pledges.some((y) => y.playerId === p.id && y.status === 'broken' && t - (y.closed ?? 0) <= 3);
  if (recentBroken) return 'broken';
  if ((x.room.under[p.id] ?? 0) >= 3) return 'minutes';
  if (outgrew(x.w, x.c, p)) return 'role';
  if (p.contractUntil <= x.c.season && x.c.round >= 4 && rankIn(x.w, p) < 13 && !x.room.pledges.some((y) => y.playerId === p.id && y.status === 'open')) return 'contract';
  if (p.morale < 38) return 'unhappy';
  if (trustOf(p) < 30) return 'doubts';
  return null;
}
const rankIn = (w: World, p: Player) => byRating(squadOf(w, p.clubId)).findIndex((q) => q.id === p.id);
// His level says he's worth a bigger role than his contract gives him (a prospect who became a regular, say).
// He plays like a regular (or like a star) and his contract still says otherwise.
export function outgrew(w: World, c: Career, p: Player): boolean {
  const r = roleOf(w, c, p);
  const s = roomOf(c).roll[p.id] ?? '';
  if (s.length < 5) return false;
  const share = [...s].filter((ch) => ch === '1').length / s.length;
  return (roleStep(r) <= 1 && share >= 0.6) || (r === 'starter' && rankIn(w, p) < 3 && share >= 0.8);
}

// Why the manager could talk to him now (the Talk button, the decision card). Null: nothing to talk about.
export function talkWhy(w: World, c: Career, p: Player): TalkWhy | null {
  if (p.clubId !== c.clubId) return null;
  const room = roomOf(c);
  const t = now(c);
  const ask = room.asks.find((a) => a.playerId === p.id);
  if (ask) return ask.why === 'broken' ? 'broken' : ask.why;
  if (p.req !== undefined) return 'request';
  if (room.pledges.some((y) => y.playerId === p.id && y.status === 'broken' && t - (y.closed ?? 0) <= 6)) return 'broken';
  if ((room.under[p.id] ?? 0) >= 3) return 'minutes';
  if (outgrew(w, c, p)) return 'role';
  if (p.contractUntil <= c.season + 1 && rankIn(w, p) < 14) return 'contract';
  if (p.morale < 45) return 'unhappy';
  if (trustOf(p) < 35) return 'doubts';
  if (p.jc === c.clubId && p.since === c.season && c.round <= 8 && room.talks[p.id] === undefined) return 'new';
  const last = lastMatchHere(c);
  if (last && last.motm && (last.motm.pn.en === p.name.en) && last.motm.side === (last.home === c.clubId ? 0 : 1)) return 'form';
  return null;
}

export type TalkNo = 'gone' | 'wait' | 'nothing';
export function canTalk(w: World, c: Career, p: Player): { ok: true; why: TalkWhy } | { ok: false; reason: TalkNo } {
  if (p.clubId !== c.clubId) return { ok: false, reason: 'gone' };
  const last = roomOf(c).talks[p.id];
  if (last !== undefined && now(c) - last < TALK_GAP) return { ok: false, reason: 'wait' };
  const why = talkWhy(w, c, p);
  return why ? { ok: true, why } : { ok: false, reason: 'nothing' };
}

// ---------- conversations ----------
export type Tone = 'reassure' | 'challenge' | 'promise';
// Morale and trust by personality and tone (a promise adds its own +8 morale, +3 trust).
const TONE: Record<Exclude<Tone, 'promise'>, Record<Archetype, [number, number]>> = {
  reassure: { driven: [2, 1], steady: [3, 2], volatile: [6, 2], loyal: [4, 3], mercenary: [2, 0], leader: [3, 2] },
  challenge: { driven: [5, 2], steady: [1, 0], volatile: [-8, -4], loyal: [2, 0], mercenary: [-3, -2], leader: [3, 1] },
};
export interface TalkOutcome { reply: string; dm: number; dt: number; withdrew?: boolean; pledge?: string }
// What each tone would do with this player (the talk sheet shows it before you choose).
export function talkPreview(w: World, c: Career, p: Player, tone: Tone): { dm: number; dt: number; key: string } {
  const x = new Ctx(w, c);
  const o = talkApply(x, p, tone, tone === 'promise' ? { type: 'role', role: roleOf(w, c, p) } : null, 'me', true);
  return { dm: o.dm, dt: o.dt, key: o.reply };
}
function talkApply(x: Ctx, p: Player, tone: Tone, q: PledgeReq | null, by: string, dry = false): TalkOutcome {
  const a = archetypeOf(p);
  const t = now(x.c);
  const why = talkWhy(x.w, x.c, p);
  let dm = 0, dt = 0, reply = `${tone}.${a}`;
  if (tone === 'promise') {
    dm = a === 'volatile' ? 10 : 8;
    dt = trustOf(p) < 25 ? 1 : 3;
    reply = trustOf(p) < 25 ? 'promise.cold' : `promise.${a === 'mercenary' ? 'mercenary' : a === 'driven' ? 'driven' : 'steady'}`;
  } else {
    [dm, dt] = TONE[tone][a];
    const substance = why === 'minutes' || why === 'request' || why === 'role' || why === 'broken';
    if (tone === 'reassure' && substance && (x.room.heard[p.id] ?? 0) >= 1) { dm = 1; dt = -3; reply = 'reassure.heard'; }
    if (tone === 'challenge' && trustOf(p) < 30) { dt -= 3; reply = 'challenge.cold'; }
    if (why === 'form' && tone === 'reassure') { dm += 2; dt += 1; reply = `praise.${a === 'volatile' ? 'volatile' : 'steady'}`; }
  }
  if (dry) return { reply, dm, dt };
  const realDm = x.morale(p.id, dm, `talk.${tone}`);
  const realDt = x.trust(p.id, dt, `talk.${tone}`);
  x.room.talks = { ...x.room.talks, [p.id]: t };
  x.room.asks = x.room.asks.filter((y) => y.playerId !== p.id);
  if (tone === 'reassure' && (why === 'minutes' || why === 'request' || why === 'role' || why === 'broken')) x.room.heard = { ...x.room.heard, [p.id]: (x.room.heard[p.id] ?? 0) + 1 };
  const out: TalkOutcome = { reply, dm: realDm, dt: realDt };
  if (tone === 'promise' && q) {
    const pl = addPledge(x, x.get(p.id)!, q);
    out.pledge = pl.id;
    const cur = x.get(p.id)!;
    // A real promise can talk him out of a transfer request, if there is any trust left to work with.
    if (cur.req !== undefined && trustOf(cur) >= 20 && q.type !== 'sign') {
      x.set({ ...cur, req: undefined, reqNo: undefined });
      out.withdrew = true;
      const ev = x.event('room.settled', p.id, { by });
      x.news('dr.withdrawn', cur, ev);
    }
  }
  return out;
}

// ---------- commands (called from sim/commands.ts; each returns the next state or a refusal reason) ----------
export type RoomResult = { world: World; career: Career; note?: { key: string; n?: number; s?: string } } | { no: string };

export function cmdTalk(w: World, c: Career, playerId: string, tone: Tone, q?: PledgeReq): RoomResult {
  const p = playerOf(w, playerId);
  if (!p) return { no: 'gone' };
  if (!['reassure', 'challenge', 'promise'].includes(tone)) return { no: 'terms' };
  const ok = canTalk(w, c, p);
  if (!ok.ok) return { no: ok.reason === 'nothing' ? 'dr.nothing' : ok.reason };
  if (tone === 'promise') {
    if (!q) return { no: 'terms' };
    const bad = pledgeCheck(w, c, p, q);
    if (bad) return { no: `dr.${bad}` };
  }
  const base = ensureRoom(w, c);
  const x = new Ctx(base.world, base.career);
  const o = talkApply(x, x.get(p.id)!, tone, tone === 'promise' ? q! : null, 'me');
  const r = x.done();
  return { ...r, note: { key: 'dr.talk', n: o.dm, s: `${o.reply}|${o.dt}|${o.withdrew ? 1 : 0}` } };
}

// The armband: the new captain +6 trust and morale; the old one, if he's still here, −6 and −8. The room reacts to who
// got it: a leader +2 cohesion, a fringe player −3.
export function cmdCaptain(w: World, c: Career, playerId: string): RoomResult {
  const p = playerOf(w, playerId);
  if (!p || p.clubId !== c.clubId) return { no: 'gone' };
  if ((c.loans ?? []).some((l) => l.playerId === p.id && l.season === c.season)) return { no: 'loaned' };
  if (p.captain) return { no: 'dr.already' };
  const base = ensureRoom(w, c);
  const x = new Ctx(base.world, base.career);
  const H = hierarchy(x.w, x.c);
  const old = squadOf(x.w, c.clubId).find((q) => q.captain);
  if (old) { x.set({ ...x.get(old.id)!, captain: undefined }); x.trust(old.id, -6, 'armLost'); x.morale(old.id, -8, 'armLost'); }
  x.set({ ...x.get(p.id)!, captain: true });
  x.trust(p.id, 6, 'armband'); x.morale(p.id, 6, 'armband');
  const tier = H.get(p.id)?.tier;
  x.cohesion(tier === 'leader' ? 2 : tier === 'fringe' ? -3 : 0, tier === 'leader' ? 'armLeader' : 'armFringe', p.name);
  const ev = x.event('room.captain', p.id, { tier: tier ?? null, homegrown: homegrown(x.c, p) });
  if (homegrown(x.c, p)) { x.room.story = { ...x.room.story, [p.id]: 4 }; x.news('dr.armbandHome', p, ev, { n: x.c.season - p.birthYear }); }
  else x.news('dr.armband', p, ev);
  x.room.arm = x.c.season;
  x.c = { ...x.c, tactics: x.c.tactics ? { ...x.c.tactics, captain: p.id } : x.c.tactics };
  return x.done();
}

// A transfer request answered: listed (he's pleased: +6 morale, +3 trust) or refused (−15 trust, −5 morale; he stays
// unsettled and rivals keep calling).
export function cmdAnswer(w: World, c: Career, playerId: string, answer: 'list' | 'refuse'): RoomResult {
  const p = playerOf(w, playerId);
  if (!p || p.clubId !== c.clubId) return { no: 'gone' };
  if (p.req === undefined) return { no: 'dr.noRequest' };
  const base = ensureRoom(w, c);
  const x = new Ctx(base.world, base.career);
  if (answer === 'list') {
    x.set({ ...x.get(p.id)!, listed: true, reqNo: undefined });
    x.morale(p.id, 6, 'listed'); x.trust(p.id, 3, 'listed');
  } else if (answer === 'refuse') {
    x.set({ ...x.get(p.id)!, reqNo: true, listed: undefined });
    x.trust(p.id, REFUSED, 'refused'); x.morale(p.id, -5, 'refused');
    const ev = x.event('room.refused', p.id);
    x.news('dr.refused', p, ev);
  } else return { no: 'terms' };
  x.room.talks = { ...x.room.talks, [p.id]: now(x.c) };
  return x.done();
}

// A release clause met: let him go, or ask him to stay (he stays if he still trusts you: trust ≥ 60, happy, no request).
export function cmdClause(w: World, c: Career, playerId: string, answer: 'go' | 'stay'): RoomResult {
  const cl = roomOf(c).clauses.find((y) => y.playerId === playerId);
  if (!cl) return { no: 'gone' };
  const base = ensureRoom(w, c);
  const x = new Ctx(base.world, base.career);
  x.room.clauses = x.room.clauses.filter((y) => y !== cl);
  const p = x.get(playerId);
  if (!p || p.clubId !== c.clubId) return x.done();
  if (answer === 'stay' && trustOf(p) >= 60 && p.req === undefined && p.morale >= 50) {
    x.trust(p.id, 4, 'stayed');
    const ev = x.event('room.stayed', p.id, { buyer: cl.clubId });
    x.news('dr.stays', p, ev, { club2: cl.clubId });
    const r = x.done();
    return { ...r, note: { key: 'dr.stays', s: p.id } };
  }
  x.flush();
  clauseGo(x, cl);
  const r = x.done();
  return { ...r, note: { key: 'dr.clauseGo', s: p.id } };
}
function clauseGo(x: Ctx, cl: { playerId: string; clubId: string; fee: number; ev?: string }) {
  const p = playerOf(x.w, cl.playerId);
  if (!p || p.clubId !== x.c.clubId) return;
  const r = acceptOffer(x.w, x.c, { id: `clause_${p.id}`, playerId: p.id, clubId: cl.clubId, fee: cl.fee, round: x.c.round });
  if (!r.ok) return;
  const so = settleSellOn(r.world, r.career, p.id, cl.fee); // V2.5: a sell-on clause we signed pays out on a clause sale too
  x.w = so.world; x.c = so.career;
  x.news('dr.clauseMet', p, cl.ev ?? '', { club2: cl.clubId, n: cl.fee });
}

// Renewals: the trust gate (V2_DESIGN §3.1: refused below 25), and what a role or a release clause does to his demand.
// A bigger role costs less in wages (he takes status over money) but becomes a promise; a release clause (2 × his value)
// takes 10 % off.
export const ROLE_WAGE: Record<SquadRole, number> = { star: 1, starter: 1.05, rotation: 1.15, prospect: 1.1 };
export const renewFactor = (p: Player, role: SquadRole | undefined, release: boolean | undefined) =>
  (role ? ROLE_WAGE[role] / ROLE_WAGE[p.role ?? 'starter'] : 1) * (release ? 0.9 : 1);
export const releaseFor = (p: Player) => roundFee(p.marketValue * 2);
// After a renewal went through: his new role (a promise when it's a real change of role or a starring one), the clause,
// and +5 trust if he'd asked for it (a contract ask, or your contract promise, which then counts as kept).
export function onRenewed(w: World, c: Career, playerId: string, role?: SquadRole, release?: boolean): { world: World; career: Career } {
  const base = ensureRoom(w, c);
  const x = new Ctx(base.world, base.career);
  const p = x.get(playerId);
  if (!p) return x.done();
  const asked = x.room.asks.some((a) => a.playerId === p.id && a.why === 'contract') || talkWhy(x.w, x.c, p) === 'contract';
  if (asked) x.trust(p.id, RENEWED_AT_ASK, 'renewed');
  x.room.asks = x.room.asks.filter((a) => !(a.playerId === p.id && a.why === 'contract'));
  if (release) x.set({ ...x.get(p.id)!, release: releaseFor(p) });
  else if (release === false) x.set({ ...x.get(p.id)!, release: undefined });
  if (role && role !== roleOf(x.w, x.c, p)) {
    const open = x.room.pledges.some((y) => y.playerId === p.id && y.status === 'open' && y.type !== 'contract');
    if (!open && (role === 'star' || role === 'starter' || role === 'prospect')) addPledge(x, x.get(p.id)!, { type: 'role', role });
    else x.set({ ...x.get(p.id)!, role });
  }
  return x.done();
}

// Clubs that would bid for an unsettled player: his level, the money, preferably a rival in our own league.
function rivalFor(w: World, p: Player, fee: number, lid: string, mine: string, roll: number): string | null {
  const fit = w.clubs.filter((y) => y.id !== mine && y.budget >= fee && squadOf(w, y.id).length < 30)
    .map((y) => ({ y, s: squadStrength(squadOf(w, y.id)) })).filter((o) => o.s >= p.rating - 8 && o.s <= p.rating + 4);
  if (!fit.length) return null;
  const rivals = fit.filter((o) => o.y.leagueId === lid);
  const pool = (rivals.length && roll < 0.7 ? rivals : fit).sort((a, b) => b.s - a.s || a.y.id.localeCompare(b.y.id));
  return pool[Math.floor(roll * 997) % Math.min(3, pool.length)].y.id;
}

// ---------- what the screens show ----------
// The room's mood in one word, from cohesion and morale: 'together' | 'settled' | 'restless' | 'split'.
export function roomMood(w: World, c: Career): 'together' | 'settled' | 'restless' | 'split' {
  const coh = cohesionOf(w, c.clubId);
  const s = squadOf(w, c.clubId);
  const m = s.reduce((a, p) => a + p.morale, 0) / Math.max(1, s.length);
  if (coh >= 65 && m >= 60) return 'together';
  if (coh < 40 || unhappyPlayers(w, c.clubId).length >= 3) return 'split';
  if (coh < 50 || m < 52) return 'restless';
  return 'settled';
}
export const openPledges = (c: Career) => roomOf(c).pledges.filter((y) => y.status === 'open');
export const pledgeOf = (c: Career, playerId: string) => roomOf(c).pledges.find((y) => y.playerId === playerId && y.status === 'open');
export const lastClosed = (c: Career, playerId: string) => roomOf(c).pledges.find((y) => y.playerId === playerId && y.status !== 'open');
// The staff's read on how to handle a player's word (Today card, talk sheet): the tone and, if any, the promise to make.
export function talkCall(w: World, c: Career, p: Player, why: TalkWhy | null): { tone: Tone; pledge: PledgeReq | null } {
  const a = archetypeOf(p);
  const b = biasOf(staffOf(c, 'psychologist') ?? staffOf(c, 'assistant'));
  const r = roleOf(w, c, p);
  const rank = rankIn(w, p);
  const pledge: PledgeReq | null = why === 'contract' ? { type: 'contract' }
    : why === 'role' ? { type: 'role', role: r === 'starter' ? 'star' : 'starter' }
    : why === 'minutes' || why === 'request' || why === 'broken' ? { type: 'role', role: r === 'star' && rank > 3 ? 'starter' : r === 'prospect' ? 'rotation' : r }
    : null;
  const keepable = pledge && (pledge.type === 'contract' || (pledge.role && (ROLE_SHARE[pledge.role] <= 0.25 ? rank < 18 : ROLE_SHARE[pledge.role] <= 0.5 ? rank < 11 : rank < 4)));
  if (pledge && keepable && b !== 'cautious' && !pledgeCheck(w, c, p, pledge)) return { tone: 'promise', pledge };
  if (pledge && b === 'bold' && !pledgeCheck(w, c, p, pledge)) return { tone: 'promise', pledge };
  return { tone: (a === 'driven' || a === 'leader') && why !== 'broken' && trustOf(p) >= 30 ? 'challenge' : 'reassure', pledge: pledge && !pledgeCheck(w, c, p, pledge) ? pledge : null };
}
export { ROLE_WINDOW as ROLE_PLEDGE_WINDOW };
export const talkReady = (w: World, c: Career, p: Player) => canTalk(w, c, p).ok;
export const dropXI = dropFromXI;
