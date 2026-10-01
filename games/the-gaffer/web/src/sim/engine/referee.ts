// Engine v2 — REFEREE layer (gf-ref): the officials, and every incident from what happened to the final ruling.
//
//   incident   → what really happened (the engine's foul, handball, offside or goal; the offence behind it)
//   call       → the referee's on-field decision (he can miss or misjudge, more or less by his strictness)
//   review     → VAR, where the competition uses it: a silent check, a VAR-only factual correction, or an on-field
//                review for subjective calls; only goals, penalties, direct reds and mistaken identity (IFAB protocol)
//   final      → the ruling that stands; ONLY the final ruling reaches the event log (so score, stats, ratings,
//                commentary and suspensions agree by construction); the incident keeps the whole chain for the screen
//   restart    → free kick (direct or indirect), penalty, kick-off, corner, goal kick, throw-in, or play on
//   effects    → goal, no goal, cards, a sending-off (the model is rebuilt), a suspension later (season.ts)
//
// Nothing here draws from the engine's own random stream: the referee has his own per-tick stream, so FULL and FAST
// play still walk the same odds, and the same match replays the same way.
import type { LocalizedName, Player, Position } from '../../model/types';
import type { LiveMatch, MatchEvent } from '../match';
import { makeRng, type Rng } from '../rng';
import { playerName } from '../../data/names';
import { lawsFor, varFor, type Laws } from '../competitions';
import type { Tactics } from '../tactics';

// ---------- the officials ----------

export interface Referee { n: LocalizedName; nat: string; strict: number; adv: number }

const hashS = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };

// A pool of twelve fictional referees per country (names from the game's own generator, never real officials).
export const REF_COUNTRIES = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'EGY', 'KSA', 'MAR', 'TUN', 'ALG', 'UAE', 'QAT'];
const POOL = new Map<string, Referee[]>();
export function refereePool(nat: string): Referee[] {
  let pool = POOL.get(nat);
  if (pool) return pool;
  pool = [];
  const used = new Set<string>();
  const r = makeRng(hashS(`ref:${nat}`));
  for (let i = 0; pool.length < 12 && i < 60; i++) {
    const n = playerName(nat, r);
    if (used.has(n.en)) continue;
    used.add(n.en);
    pool.push({ n, nat, strict: Math.round((0.82 + 0.4 * r()) * 100) / 100, adv: Math.round((0.7 + 0.6 * r()) * 100) / 100 });
  }
  POOL.set(nat, pool);
  return pool;
}

const CONTINENT: Record<string, string[]> = { ucl: ['ENG', 'ESP', 'ITA', 'GER', 'FRA'], uel: ['ENG', 'ESP', 'ITA', 'GER', 'FRA'], ccl: ['EGY', 'MAR', 'TUN', 'ALG'], acl: ['KSA', 'UAE', 'QAT'] };
// The referee for a match: from the competition's country (a neutral one for continental ties).
export function refereeFor(key: string, comp: string, clubCountries: string[] = []): Referee {
  let nat = comp.slice(0, 3).toUpperCase();
  if (CONTINENT[comp]) {
    const opts = CONTINENT[comp].filter((c) => !clubCountries.includes(c));
    const list = opts.length ? opts : CONTINENT[comp];
    nat = list[hashS(key) % list.length];
  }
  if (!REF_COUNTRIES.includes(nat)) nat = clubCountries[0] && REF_COUNTRIES.includes(clubCountries[0]) ? clubCountries[0] : 'ENG';
  const pool = refereePool(nat);
  return pool[hashS(`${key}:ref`) % pool.length];
}
// 0 lenient, 1 fair, 2 strict, 3 very strict.
export const strictBand = (s: number) => (s < 0.92 ? 0 : s < 1.04 ? 1 : s < 1.14 ? 2 : 3);

// ---------- incidents ----------

export type Offence =
  | 'careless' | 'reckless' | 'sfp' | 'spa' | 'dogso'    // fouls: no card, caution, serious foul play, stopping a promising attack, denying an obvious goal
  | 'hand' | 'handspa' | 'handdogso'                    // handball: plain, stopping an attack, denying a goal
  | 'offside' | 'apf' | 'ahand' | 'clean'               // goals: offside, a foul or handball in the attacking phase, nothing wrong
  | 'dive' | 'dissent' | 'violent' | 'waste';
export type Card = 'Y' | 'YR' | 'R';
export type Restart = 'fk' | 'ifk' | 'pen' | 'ko' | 'ck' | 'gk' | 'ti' | 'play' | 'adv';
export interface Ruling { d: 'foul' | 'adv' | 'pen' | 'play' | 'goal' | 'nogoal' | 'off' | 'card'; card?: Card; to?: string; why?: string }
export interface Review { t: 'check' | 'ofr'; res: 'stands' | 'over'; why: string }
export interface Incident {
  i: number;                 // number in the match
  min: number; plus?: number;
  side: 0 | 1;               // the side the incident is against (the offender's; for a goal, the scoring side)
  k: 'foul' | 'hand' | 'goal' | 'card';
  z: number; box?: 1;        // zone (engine grid) and whether it was in the penalty area
  by: string; vs?: string;   // offender (or scorer); the player fouled (or the defender)
  off: Offence;              // what really happened
  call: Ruling;              // on the field
  rev?: Review;              // VAR
  fin: Ruling;               // what stands
  rs: Restart;
  fx: string[];              // state effects, e.g. 'goal', 'nogoal', 'Y:p12', 'R:p12', 'rescind:p12', 'pen'
}

// Restart counters per side: [kick-off, direct FK, indirect FK, penalty, corner, goal kick, throw-in, offside].
export const RS = { ko: 0, fk: 1, ifk: 2, pen: 3, ck: 4, gk: 5, ti: 6, off: 7 } as const;
export const RSN = 8;

export interface RefState extends Referee {
  var: boolean;              // VAR in use at this match (competition, season, stage)
  season: number;
  inc: Incident[];           // the notable incidents (all of them in a recorded match)
  seq: number;
  rs: number[];              // [side * RSN + RS.*]
  fouls: [number, number];   // fouls given against each side (including advantage played)
  checks: number; ofr: number; over: number; // VAR: checks shown, on-field reviews, decisions changed
  pend?: { side: 0 | 1; id: string; at: number; inc: number }; // DOGSO with advantage: the card waits for the outcome
}

export function initRef(m: LiveMatch, ref: Referee, season: number): RefState {
  const left = m.stage === undefined || m.stage === 'group' ? undefined : m.stage;
  return { ...ref, var: varFor(m.cup ?? m.comp, season, m.cup ? left : undefined), season, inc: [], seq: 0, rs: new Array(2 * RSN).fill(0), fouls: [0, 0], checks: 0, ofr: 0, over: 0 };
}
// A match saved before the referee existed gets one from where it stands (no VAR: we don't know the stage).
export function ensureRef(m: LiveMatch) {
  if (m.ref) return;
  const comp = m.cup ?? m.comp ?? 'eng1';
  m.ref = initRef(m, refereeFor(m.key, comp), m.season ?? 2026);
}

// ---------- players as the referee sees them ----------
// The game's players have seven attributes. Tackling is defending; aggression and composure are hidden traits
// derived from the player (his id, physique, position, age and level), so no save needs new fields.
const POS_AGG: Record<Position, number> = { GK: -0.25, CB: 0.1, LB: 0.03, RB: 0.03, CDM: 0.14, CM: 0.02, CAM: -0.06, LW: -0.06, RW: -0.06, ST: 0.04 };
const TRAITS = new Map<string, { agg: number; comp: number; tack: number }>();
export function traits(p: Player, season = 2026): { agg: number; comp: number; tack: number } {
  const k = `${p.id}:${p.rating}`;
  let t = TRAITS.get(k);
  if (t) return t;
  const u = (hashS(`agg:${p.id}`) % 1000) / 1000, v = (hashS(`cmp:${p.id}`) % 1000) / 1000;
  const age = season - p.birthYear;
  t = {
    agg: clamp(0.3 + 0.45 * u + 0.25 * ((p.attrs[5] ?? 60) - 60) / 40 + POS_AGG[p.position], 0.05, 0.98),
    comp: clamp(0.3 + (age - 18) * 0.018 + (p.rating - 65) * 0.009 + 0.3 * (v - 0.5), 0.05, 0.98),
    tack: p.attrs[4] ?? 50,
  };
  if (TRAITS.size > 20000) TRAITS.clear();
  TRAITS.set(k, t);
  return t;
}
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// The tactics lane's per-team foul propensity, read defensively: `foulRisk` (a multiplier), `tackling` or
// `aggression` (0 stay on your feet, 1 normal, 2 get stuck in). Missing = neutral.
export function tacticsFoulK(t: Tactics): number {
  const x = t as unknown as Record<string, unknown>;
  if (typeof x.foulRisk === 'number' && Number.isFinite(x.foulRisk)) return clamp(x.foulRisk, 0.6, 1.6);
  for (const k of ['tackling', 'aggression']) {
    const v = x[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v >= 0 && v <= 2 ? [0.8, 1, 1.25][Math.round(v)] : clamp(1 + 0.12 * v, 0.7, 1.4);
    if (v === 'stay' || v === 'easy' || v === 'low') return 0.8;
    if (v === 'hard' || v === 'stuck' || v === 'high') return 1.25;
  }
  return 1;
}

// How many fouls a side commits, relative to the engine's base rate: its instructions, the tacklers it fields,
// the referee (a strict one whistles more) and the score (a side chasing the game late tackles harder).
export const TUNE_REF = {
  foulK: 0.83,
  short: 2.2,                               // rating points off everyone for each player a side is down (match.ts inputsOf)
  hand: [0.08, 0.22] as [number, number],   // share of fouls that are handballs: outside / inside the box
  reck: 0.114, sfp: 0.001, spa: 0.5, dogsoCtr: 0.017, dogsoBox: 0.2, genuine: 0.72, handSpa: 0.16, handDogso: 0.12,
  boxSoft: 0.1,                             // engine fouls in the box that were only contact
  booked: 0.07,                             // a booked player's reckless-tackle rate (× composure)
  miss: { pen: 0.13, yellow: 0.07, red: 0.22, violent: 0.45 },
  wrong: { yellow: 0.02, red: 0.1, falsePen: 0.007, ident: 0.01 },
  adv: [0.05, 0.14, 0.3] as [number, number, number],
  clear: 0.82, factual: 0.96,
  dissent: 0.0012, violent: 0.00004,
  goalOff: { through: 0.1, counter: 0.07, box: 0.05, cutback: 0.05, header: 0.05, corner: 0.03, set: 0.04, press: 0.02, long: 0.01, fk: 0, pen: 0 } as Record<string, number>,
  goalFoul: 0.018, goalAirFoul: 0.035, goalHand: 0.01,
  flag: 0.72, whistle: 0.4, handSeen: 0.35, falseFlag: 0.02, showCheck: 0.15,
};

export function foulFactor(m: LiveMatch, i: 0 | 1, get: (id: string) => Player): number {
  const s = m.sides[i];
  let n = 0, agg = 0, tack = 0;
  for (const id of s.onPitch) {
    if (!id) continue;
    const p = get(id);
    if (!p || p.position === 'GK') continue;
    const t = traits(p, m.season);
    n++; agg += t.agg; tack += t.tack;
  }
  const pk = n ? clamp(1 + 0.6 * (agg / n - 0.47) - 0.004 * (tack / n - 62), 0.75, 1.3) : 1;
  const deficit = m.goals[1 - i] - m.goals[i];
  const state = m.minute >= 60 && deficit > 0 ? 1 + 0.07 * Math.min(2, deficit) : 1;
  const strict = Math.pow(m.ref?.strict ?? 1, 0.5);
  return TUNE_REF.foulK * tacticsFoulK(s.tactics) * pk * state * strict;
}

// ---------- the rules layer's hands (match.ts passes these in) ----------

export interface Acts {
  push(e: MatchEvent): void;
  sendOff(side: 0 | 1, id: string, how: string): void;
  get(id: string): Player;
}

const on = (m: LiveMatch, side: 0 | 1, id: string | undefined) => !!id && m.sides[side].onPitch.includes(id);
const yellowsOf = (m: LiveMatch, id: string) => m.events.filter((e) => e.kind === 'yellow' && e.playerId === id).length;
const cardsNow = (m: LiveMatch) => m.events.filter((e) => (e.kind === 'yellow' || e.kind === 'red') && e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0)).length;
const stamp = (m: LiveMatch) => (m.plus ? { min: m.minute, plus: m.plus } : { min: m.minute });
const laws = (m: LiveMatch): Laws => lawsFor(m.ref?.season ?? m.season ?? 2026);

function record(m: LiveMatch, inc: Omit<Incident, 'i' | 'min' | 'plus'>, notable: boolean) {
  const R = m.ref!;
  const x: Incident = { i: R.seq++, ...stamp(m), ...inc };
  if (notable || m.full) { R.inc.push(x); if (R.inc.length > 120) R.inc.splice(0, R.inc.length - 120); }
  return x;
}

// A teammate of `id` near the incident (for a card shown to the wrong man).
function teammate(m: LiveMatch, side: 0 | 1, id: string, r: Rng, get: (id: string) => Player): string | undefined {
  const opts = m.sides[side].onPitch.filter((x) => x && x !== id && get(x)?.position !== 'GK');
  return opts.length ? opts[Math.floor(r() * opts.length)] : undefined;
}

// Shows a card: a caution (a second one is a sending-off) or a red. Returns what it came to.
function show(m: LiveMatch, a: Acts, side: 0 | 1, id: string, card: 'Y' | 'R', how: string): Card | null {
  if (!on(m, side, id)) return null;
  if (card === 'R') { a.sendOff(side, id, how); return 'R'; }
  const booked = yellowsOf(m, id) > 0;
  a.push({ ...stamp(m), side, kind: 'yellow', playerId: id, how });
  if (booked) { a.sendOff(side, id, '2y'); return 'YR'; }
  return 'Y';
}
const cardOf = (off: Offence, box: boolean, adv: boolean): 'Y' | 'R' | null => {
  switch (off) {
    case 'reckless': case 'spa': case 'handspa': case 'dive': case 'dissent': case 'waste': return 'Y';
    case 'sfp': case 'violent': case 'handdogso': return 'R';
    case 'dogso': return box ? 'Y' : adv ? 'Y' : 'R'; // in the box with a genuine attempt at the ball (the caller checks), or advantage
    default: return null;
  }
};
const howOf = (off: Offence) => (off === 'reckless' || off === 'careless' ? 'reck' : off === 'handspa' ? 'hand' : off === 'handdogso' ? 'hand' : off);

function varEvent(m: LiveMatch, a: Acts, side: 0 | 1, id: string, note: string) {
  a.push({ ...stamp(m), side, kind: 'var', playerId: id, note });
  const R = m.ref!;
  if (note.includes(':ofr')) R.ofr++; else R.checks++;
  if (note.includes(':over')) R.over++;
}

// ---------- fouls ----------

export interface FoulCtx {
  side: 0 | 1;            // the side that committed the foul
  by: string; vs?: string; // the fouler and the player fouled
  kind: 'foul' | 'tfoul';
  box: boolean;           // the engine put the foul in the penalty area (it leads to a penalty)
  z: number;              // zone
  phase: 0 | 1 | 2;       // build-up, midfield, final third or a counter
}
// fk: a free kick (the engine's own route); pen: a penalty; adv: advantage (play goes on with the attack);
// on: no foul given (play goes on); turn: the defending side restarts (a dive, the ball back to them).
export type Go = 'fk' | 'pen' | 'adv' | 'on' | 'turn';
export interface FoulOut { red: boolean; go: Go; off?: Offence } // off: what the tackle was (engine/injury.ts: the fouled player may be hurt)

export function callFoul(m: LiveMatch, a: Acts, r: Rng, c: FoulCtx): FoulOut {
  const R = m.ref!;
  const T = TUNE_REF;
  const att = (1 - c.side) as 0 | 1;
  const p = a.get(c.by);
  const tr = p ? traits(p, R.season) : { agg: 0.5, comp: 0.5, tack: 60 };
  const booked = yellowsOf(m, c.by) > 0;
  // Contact in the box that isn't a foul: the referee (rightly) waves play on, nothing to review.
  if (c.box && r() < T.boxSoft) return { red: false, go: 'on' };
  // What happened.
  const hand = r() < T.hand[c.box ? 1 : 0];
  const aggK = (0.55 + tr.agg) * (1.2 - Math.max(0, tr.tack - 40) / 200);
  const bookK = booked ? T.booked + 0.1 * (1 - tr.comp) : 1;
  let off: Offence;
  if (hand) off = c.box && r() < T.handDogso ? 'handdogso' : r() < T.handSpa * (c.phase === 2 ? 1.6 : 0.7) ? 'handspa' : 'hand';
  else if (c.kind === 'tfoul') off = r() < (c.box ? T.dogsoBox : T.dogsoCtr) ? 'dogso' : r() < T.spa * bookK ? 'spa' : 'careless';
  else if (c.box && r() < T.dogsoBox * 0.6) off = 'dogso';
  else { const u = r(); off = u < T.sfp * aggK * R.strict ? 'sfp' : u < (T.sfp + T.reck * bookK) * aggK * R.strict ? 'reckless' : 'careless'; }
  const genuine = off === 'dogso' && c.box && r() < T.genuine; // in-box DOGSO, a genuine attempt at the ball: a caution
  // The referee's decision on the spot.
  let give: 'foul' | 'pen' | 'play' | 'adv' = c.box ? 'pen' : 'foul';
  let falsePen: 'loc' | 'dive' | null = null;
  if (c.box && r() < T.miss.pen / R.strict) give = 'play';
  if (!c.box && c.phase === 2 && r() < T.wrong.falsePen) { give = 'pen'; falsePen = r() < 0.5 ? 'loc' : 'dive'; }
  const advOK = give === 'foul' && (off === 'careless' || off === 'reckless' || off === 'hand' || off === 'dogso' || off === 'spa');
  if (advOK && r() < T.adv[c.phase] * R.adv) give = 'adv';
  let card = cardOf(off, genuine, give === 'adv' && off === 'dogso');
  if (off === 'dogso' && give === 'adv') card = null; // decided when the move ends (settle())
  if (falsePen === 'dive') card = null;               // there was no foul
  let onCard: 'Y' | 'R' | null = card;
  if (card === 'Y' && r() < T.miss.yellow) onCard = null;
  else if (card === 'R' && r() < T.miss.red) onCard = 'Y';
  else if (card === 'Y' && off === 'reckless' && r() < T.wrong.red * 0.1 * R.strict) onCard = 'R';
  else if (!card && off === 'careless' && !falsePen && r() < T.wrong.yellow * R.strict * (booked ? 0.3 : 1)) onCard = 'Y';
  if (give === 'play') onCard = null;                   // no foul given, no card for it
  if (onCard === 'Y' && cardsNow(m) >= 2) onCard = null; // never a flurry of cards in one minute
  const ident = onCard && r() < T.wrong.ident ? teammate(m, c.side, c.by, r, a.get) : undefined;
  const onTo = ident ?? c.by;
  const call: Ruling = { d: give, ...(onCard ? { card: onCard, to: onTo } : {}) };

  // VAR: penalty / no penalty, direct red, a clearly wrong second yellow (2026/27), mistaken identity.
  const L = laws(m);
  let fin: Ruling = { ...call };
  let rev: Review | undefined;
  if (R.var) {
    if (c.box && give === 'play' && r() < T.clear) {
      rev = { t: off === 'hand' || off === 'handspa' || off === 'handdogso' || r() < 0.7 ? 'ofr' : 'check', res: 'over', why: hand ? 'hand' : 'foul' };
      fin = { ...fin, d: 'pen' };
    } else if (falsePen === 'loc' && r() < T.factual) { rev = { t: 'check', res: 'over', why: 'outside' }; fin = { ...fin, d: 'foul' }; }
    else if (falsePen === 'dive' && r() < T.clear) { rev = { t: 'ofr', res: 'over', why: 'dive' }; fin = { ...fin, d: 'play' }; }
    else if (give === 'pen') rev = { t: 'check', res: 'stands', why: 'pen' };
    // Cards.
    const wasBooked = yellowsOf(m, onTo) > 0;
    if (onCard === 'R' && card !== 'R' && r() < T.clear) { rev = { t: 'ofr', res: 'over', why: 'redDown' }; fin = { ...fin, card: card ?? undefined, to: c.by }; }
    else if (card === 'R' && onCard !== 'R' && r() < T.clear) { rev = { t: 'ofr', res: 'over', why: 'redUp' }; fin = { ...fin, card: 'R', to: c.by }; }
    else if (L.var2y && onCard === 'Y' && !card && wasBooked && r() < T.clear) { rev = { t: 'ofr', res: 'over', why: '2y' }; fin = { ...fin, card: undefined, to: undefined }; }
    else if (ident && (onCard === 'R' || L.idYellow || wasBooked) && r() < T.factual) { rev = { t: 'check', res: 'over', why: 'id' }; fin = { ...fin, to: c.by }; }
  }
  // A penalty given on review carries the card the offence deserves.
  if (fin.d === 'pen' && give === 'play' && !fin.card && card) { fin.card = card; fin.to = c.by; }

  // The final ruling reaches the log.
  const fx: string[] = [];
  const box = fin.d === 'pen';
  if (fin.d === 'foul' || fin.d === 'pen' || fin.d === 'adv') {
    a.push({ ...stamp(m), side: c.side, kind: 'foul', playerId: c.by, vs: c.vs, how: c.kind === 'tfoul' ? 'tfoul' : box ? 'pen' : undefined, z: c.z, ...(fin.d === 'adv' ? { note: 'adv' } : hand ? { note: 'hand' } : {}) });
    R.fouls[c.side]++;
  }
  if (rev) varEvent(m, a, c.side, rev.why === 'id' ? onTo : rev.why === 'dive' ? c.vs ?? c.by : c.by, `${rev.why}:${rev.t}:${rev.res}`);
  if (box) { a.push({ ...stamp(m), side: att, kind: 'pen', playerId: c.vs ?? '', vs: c.by, note: hand ? 'hand' : undefined }); fx.push('pen'); }
  let red = false;
  const dive = falsePen === 'dive' && rev?.why === 'dive';
  if (dive && c.vs && on(m, att, c.vs)) { const k = show(m, a, att, c.vs, 'Y', 'dive'); if (k) fx.push(`${k}:${c.vs}`); red = k === 'YR'; }
  if (fin.card && fin.to) {
    const k = show(m, a, c.side, fin.to, fin.card === 'R' ? 'R' : 'Y', fin.card === 'R' ? (off === 'reckless' || off === 'careless' ? 'sfp' : howOf(off)) : genuine ? 'dogso' : howOf(off));
    if (k) { fx.push(`${k}:${fin.to}`); if (k !== 'Y') red = true; }
  }
  if (rev?.why === '2y' || rev?.why === 'redDown') fx.push(`rescind:${onTo}`);
  const go: Go = dive ? 'turn' : fin.d === 'pen' ? 'pen' : fin.d === 'adv' ? 'adv' : fin.d === 'play' ? 'on' : 'fk';
  const rs: Restart = go === 'pen' ? 'pen' : go === 'adv' ? 'adv' : go === 'on' ? 'play' : go === 'turn' ? 'ifk' : 'fk';
  if (rs === 'fk' || rs === 'pen' || rs === 'ifk') R.rs[(rs === 'ifk' ? c.side : att) * RSN + RS[rs]]++;
  const incd = record(m, { side: c.side, k: hand ? 'hand' : 'foul', z: c.z, ...(c.box || box ? { box: 1 as const } : {}), by: c.by, vs: c.vs, off, call, rev, fin, rs, fx },
    !!(rev || call.card || fin.card || box || c.box || give === 'adv'));
  if (off === 'dogso' && fin.d === 'adv') R.pend = { side: c.side, id: c.by, at: m.events.length, inc: incd.i };
  return { red, go, off };
}

// DOGSO with advantage: a goal from the move → no caution (2026/27); otherwise a caution for stopping the attack.
export function settle(m: LiveMatch, a: Acts) {
  const R = m.ref;
  if (!R?.pend) return;
  const { side, id, at, inc } = R.pend;
  R.pend = undefined;
  const scored = m.events.slice(at).some((e) => e.kind === 'goal' && e.side !== side);
  const x = R.inc.find((q) => q.i === inc);
  if (scored && laws(m).dogsoAdvGoal) { if (x) x.fx.push('noCard'); return; }
  const k = show(m, a, side, id, 'Y', 'spa');
  if (x && k) { x.fin = { ...x.fin, card: k, to: id }; x.fx.push(`${k}:${id}`); }
}

// ---------- goals ----------

// A ball in the net: was anything wrong in the attacking phase, what the officials saw, and VAR. The goal event
// reaches the log only when it stands; a disallowed goal is logged as 'nogoal' (not a shot, not a goal).
export function callGoal(m: LiveMatch, a: Acts, r: Rng, e: MatchEvent): boolean {
  const R = m.ref!;
  const T = TUNE_REF;
  const how = e.how ?? 'box';
  const air = how === 'header' || how === 'corner' || how === 'set';
  let off: Offence = 'clean';
  if (how !== 'pen' && how !== 'fk') {
    const u = r();
    const pOff = T.goalOff[how] ?? 0.03, pFoul = air ? T.goalAirFoul : T.goalFoul;
    off = u < pOff ? 'offside' : u < pOff + pFoul ? 'apf' : u < pOff + pFoul + T.goalHand ? 'ahand' : 'clean';
  }
  const seen = off === 'offside' ? r() < T.flag : off === 'apf' ? r() < T.whistle * R.strict : off === 'ahand' ? r() < T.handSeen : false;
  const falseFlag = off === 'clean' && (how === 'through' || how === 'counter' || how === 'box' || how === 'cutback' || how === 'header') && r() < T.falseFlag;
  const call: Ruling = { d: seen || falseFlag ? 'nogoal' : 'goal', why: falseFlag ? 'offside' : off };
  let fin: Ruling = { ...call };
  let rev: Review | undefined;
  if (R.var) {
    if (call.d === 'goal' && off !== 'clean') {
      const factual = off === 'offside';
      if (r() < (factual ? T.factual : T.clear)) { rev = { t: factual ? 'check' : 'ofr', res: 'over', why: off }; fin = { d: 'nogoal', why: off }; }
      else rev = { t: 'check', res: 'stands', why: 'goal' };
    } else if (call.d === 'nogoal' && falseFlag && r() < T.factual) { rev = { t: 'check', res: 'over', why: 'onside' }; fin = { d: 'goal', why: 'clean' }; }
    else if (call.d === 'nogoal') rev = { t: 'check', res: 'stands', why: call.why ?? 'offside' };
    else if (r() < T.showCheck) rev = { t: 'check', res: 'stands', why: 'goal' };
  }
  const o = (1 - e.side) as 0 | 1;
  const stands = fin.d === 'goal';
  // Order in the log: what the crowd saw first, then the check, so the timeline reads the way it happened.
  if (stands) a.push(e); else a.push({ ...e, kind: 'nogoal', how: e.how, note: fin.why === 'clean' ? 'offside' : fin.why });
  if (rev) varEvent(m, a, e.side, e.playerId, `goal:${rev.t}:${rev.res}:${rev.why}`);
  const rs: Restart = stands ? 'ko' : fin.why === 'offside' ? 'ifk' : 'fk';
  R.rs[o * RSN + RS[rs]]++;
  if (!stands && fin.why === 'offside') R.rs[e.side * RSN + RS.off]++;
  if (!stands && (fin.why === 'apf' || fin.why === 'ahand')) { R.fouls[e.side]++; }
  record(m, { side: e.side, k: 'goal', z: e.z ?? 0, by: e.playerId, vs: e.vs, off, call, rev, fin, rs, fx: [stands ? 'goal' : 'nogoal'] }, true);
  return stands;
}

// Offside from the engine (a flag on a through ball or a long ball): an indirect free kick to the defending side.
export function callOffside(m: LiveMatch, e: MatchEvent) {
  const R = m.ref!;
  R.rs[e.side * RSN + RS.off]++;
  R.rs[(1 - e.side) * RSN + RS.ifk]++;
  if (m.full) record(m, { side: e.side, k: 'foul', z: e.z ?? 0, by: e.playerId, off: 'offside', call: { d: 'off' }, fin: { d: 'off' }, rs: 'ifk', fx: [] }, false);
}

// ---------- misconduct without a foul (once a tick) ----------

export function misconduct(m: LiveMatch, a: Acts, r: Rng) {
  const R = m.ref!;
  const T = TUNE_REF;
  for (const side of [0, 1] as const) {
    const ids = m.sides[side].onPitch.filter(Boolean);
    if (!ids.length) continue;
    const behind = m.goals[1 - side] > m.goals[side];
    // Dissent: likelier when losing, from the least composed.
    if (r() < T.dissent * R.strict * (behind ? 1.6 : 1) && cardsNow(m) < 2) {
      // a booked player bites his tongue
      const ps = ids.map((id) => ({ id, c: traits(a.get(id), R.season).comp + (yellowsOf(m, id) ? 0.6 : 0) })).sort((x, y) => x.c - y.c);
      const who = ps[Math.floor(r() * Math.min(4, ps.length))].id;
      const k = show(m, a, side, who, 'Y', 'dissent');
      if (k) { R.rs[(1 - side) * RSN + RS.ifk]++; record(m, { side, k: 'card', z: 12, by: who, off: 'dissent', call: { d: 'card', card: 'Y', to: who }, fin: { d: 'card', card: k, to: who }, rs: 'ifk', fx: [`${k}:${who}`] }, true); }
    }
    // Violent conduct off the ball: rare, likelier from an aggressive player in a lost cause.
    if (r() < T.violent * (behind ? 2 : 1) * (m.goals[1 - side] - m.goals[side] >= 2 ? 2 : 1)) {
      const ps = ids.filter((id) => a.get(id)?.position !== 'GK').map((id) => ({ id, g: traits(a.get(id), R.season).agg })).sort((x, y) => y.g - x.g);
      if (!ps.length) continue;
      const who = ps[Math.floor(r() * Math.min(3, ps.length))].id;
      const seen = r() > T.miss.violent;
      let rev: Review | undefined;
      let given = seen;
      if (!seen && R.var && r() < T.clear) { rev = { t: 'ofr', res: 'over', why: 'violent' }; given = true; varEvent(m, a, side, who, 'violent:ofr:over'); }
      if (given) show(m, a, side, who, 'R', 'violent');
      record(m, { side, k: 'card', z: 12, by: who, off: 'violent', call: { d: seen ? 'card' : 'play', ...(seen ? { card: 'R' as const, to: who } : {}) }, rev, fin: { d: given ? 'card' : 'play', ...(given ? { card: 'R' as const, to: who } : {}) }, rs: given ? 'fk' : 'play', fx: given ? [`R:${who}`] : [] }, given);
    }
  }
}

// A booking for time-wasting (the side running the clock down while ahead).
export function wasteBooking(m: LiveMatch, a: Acts, side: 0 | 1, id: string) {
  if (cardsNow(m) >= 2) return;
  const k = show(m, a, side, id, 'Y', 'waste');
  if (k) record(m, { side, k: 'card', z: 0, by: id, off: 'waste', call: { d: 'card', card: 'Y', to: id }, fin: { d: 'card', card: k, to: id }, rs: 'ifk', fx: [`${k}:${id}`] }, true);
}

// ---------- restarts when the ball goes out of play ----------

// [node index] → [throw-in, goal kick] chances when a move ends with the ball handed over (settled possession).
// Node ids from model.ts N: B 0, LONG 1, P0-2 3-5, F0-2 7-9, THR 10, CRS 11, SETH 13, CRN 14, CTR 15, RHIGH 17.
const OUT: Record<number, [number, number]> = { 0: [0.12, 0], 1: [0.36, 0.06], 3: [0.3, 0], 4: [0.16, 0], 5: [0.3, 0], 7: [0.56, 0.04], 8: [0.18, 0.06], 9: [0.56, 0.04], 10: [0.12, 0.1], 11: [0.16, 0.14], 13: [0.1, 0.12], 14: [0.12, 0.1], 15: [0.3, 0.04], 17: [0.3, 0.02] };
// The ball changed hands at `node` (the side on the ball was `s`); `start` is how the other side begins (0 settled).
export function restartOnTurnover(m: LiveMatch, r: Rng, s: 0 | 1, node: number, start: number, miss: boolean): 'ti' | 'gk' | undefined {
  const R = m.ref;
  if (!R) return;
  const o = 1 - s;
  if (miss) { R.rs[o * RSN + RS.gk]++; return 'gk'; }
  const out = OUT[node];
  if (!out) return;
  const k = start === 0 ? 1 : 0.35; // a ball won in play is rarely out of play first
  const u = r();
  if (u < out[0] * k) { R.rs[o * RSN + RS.ti]++; return 'ti'; }
  if (u < (out[0] + out[1]) * k) { R.rs[o * RSN + RS.gk]++; return 'gk'; }
}

// ---------- the referee's numbers (match report) ----------
export function refStats(m: LiveMatch) {
  const R = m.ref;
  const count = (k: string) => m.events.filter((e) => e.kind === k).length;
  const y = count('yellow'), red = count('red');
  const s = (side: 0 | 1, k: keyof typeof RS) => R?.rs[side * RSN + RS[k]] ?? 0;
  return {
    fouls: count('foul'), yellows: y, reds: red, pens: count('pen'),
    checks: R?.checks ?? 0, reviews: R?.ofr ?? 0, changed: R?.over ?? 0, adv: m.events.filter((e) => e.kind === 'foul' && e.note === 'adv').length,
    side: ([0, 1] as const).map((i) => ({ fk: s(i, 'fk'), ifk: s(i, 'ifk'), pen: s(i, 'pen'), ck: m.events.filter((e) => e.kind === 'corner' && e.side === i).length, gk: s(i, 'gk'), ti: s(i, 'ti'), off: s(i, 'off') })),
  };
}

// Timeline marks for a card event: a second yellow reads as its own kind.
export const isSecondYellow = (e: MatchEvent) => e.kind === 'red' && e.how === '2y';
