// Match engine v2: the state of a match, the RULES layer (fouls, cards, send-offs, injuries, subs, shoot-outs), the
// AI manager, and the PROJECTION of the event log into the score, stats and xG.
//
//   decisions  → engine/model.ts   who is where, who contests what, the odds (shapes from formation + instructions)
//   resolution → engine/play.ts    walks the possession graph, appends canonical events
//   rules      → here              fouls → cards → send-offs, injuries, subs, stoppage of play, penalties
//   projection → derive() here     score, shots, on target, corners, fouls, cards, xG all counted from m.events
//   story      → engine/story.ts   why it happened (from the same events and the engine's own model)
//   aftermath  → season.ts         fitness, morale, bans, injuries, ratings, table, board (applyMatch / afterMatch)
//
// Every match (AI or the user's) runs through stepMinute. The user's match plays FULL (every duel recorded, the ball's
// path for the pitch), every other match FAST (the same odds, only the events the tables need). Each minute has its
// own seeded random stream, so a match resumed after the app was closed plays out the same way for the same decisions.
import type { Career, Player, Position } from '../model/types';
import { bell, clamp, makeRng } from './rng';
import { riskMult } from './youth';
import { playerOf, squadOf, squadStrength, type World } from './world';
import { balanceOf, oppBoost } from './balance';
import {
  FORMATIONS, aiTactics, autoXI, available, formOf, setPieces, slotValue, xiFor, DEFAULT_TACTICS, type FormationId, type Tactics,
} from './tactics';
import { TUNE, buildModel, patchSub, rates as modelRates, type Model, type Rates, type SideInput } from './engine/model';
import { newTally, playMinute, type Ball, type Flow, type Rules, type Tally } from './engine/play';
import { aiRead, reslot } from './engine/story';

export type EventKind = 'goal' | 'miss' | 'save' | 'block' | 'yellow' | 'red' | 'injury' | 'sub' | 'corner' | 'foul' | 'offside' | 'duel' | 'tactic';
export interface MatchEvent {
  min: number; side: 0 | 1; kind: EventKind;
  playerId: string;       // save: the keeper (on the keeper's side); tactic: '' (the manager)
  assistId?: string;
  how?: string;           // shots: box, cutback, header, through, counter, press, long, corner, set, fk, pen; duels: wing, mid, run, break, press, air
  out?: number; inId?: string;
  xg?: number;            // shots: the chance's quality (model estimate)
  by?: string;            // save: who shot
  vs?: string;            // duels, fouls: the opponent in the contest; goals: the keeper beaten
  ok?: 0 | 1;             // duels: did the attacker win it
  z?: number;             // zone 0-29 (col from the home goal × 5 + row)
  note?: string;          // tactic: what changed and why (e.g. "mentality:2|chase")
}
// [possession %, shots, on target, corners, fouls, yellows, reds]
export type TeamStats = [number, number, number, number, number, number, number];
export type Talk = 0 | 1 | 2 | 3; // none, fire them up, calm down, focus

export interface SideState {
  clubId: string;
  ai: boolean;         // the computer manages this side (tactics and subs)
  autoSubs: boolean;   // the computer makes this side's subs (quick result)
  tactics: Tactics;
  talk: Talk;
  onPitch: string[];   // slot order; '' = slot empty after a red card or an injury with no subs left
  bench: string[];
  subs: number;
  pieces: { captain: string; penalties: string; freeKicks: string; corners: string };
  form: number;        // match-day form, ~0.92 … 1.08
  mods?: { fatigue: number; press: number; level: number }; // the user's courses and staff
  mastery?: number;    // how well the side knows its philosophy, 0-100
}

export interface LiveMatch {
  key: string;
  round: number;
  sides: [SideState, SideState];
  minute: number;
  goals: [number, number];
  events: MatchEvent[];
  stats: [TeamStats, TeamStats]; // derived from events (derive())
  possSum: number;     // legacy (v1); v2 possession comes from tl.poss
  fit: Record<string, number>;
  played: string[];    // everyone who got on the pitch
  cup?: string;        // cup id for a knockout tie: a draw goes to penalties
  group?: boolean;     // a cup group game: a draw stays a draw
  injuries?: number;   // injury chance × (balance settings, user's matches)
  risk?: Record<string, number>; // v2.6: injury-risk multiplier per player from his load (1 = normal, up to 3)
  pens?: [number, number];
  kicks?: [0 | 1, string, boolean][]; // shootout: side, taker, scored
  xg?: [number, number]; // expected goals so far: the sum of every shot's xG (derived)
  // v2
  v?: number;          // engine version (2)
  full?: boolean;      // FULL play: duels, the ball's path and the story are recorded
  ball?: Ball;         // who has the ball, where in the possession graph, clock carry
  tl?: Tally;          // possession, territory, phase counters, momentum, fitness curve
  flow?: Flow[];       // the ball's path in the last minute (for the pitch)
  rev?: number;        // bumps on every change the model depends on (subs, cards, tactics)
  dirty?: boolean;     // the model must be rebuilt now (a red card mid-minute)
  base?: { stats: [TeamStats, TeamStats]; xg: [number, number]; from: number }; // a v1 match resumed on v2
}

export const SUBS_MAX = 5;
// Rating levels an Opposition prep week adds to the user's side (about half a rating point across the XI).
export const PREP_EDGE = 0.5;
export const BENCH_MAX = 9;

const hash = (s: string) => { let h = 17; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h; };
export const rngFor = (key: string, minute: number) => makeRng(hash(`${key}:${minute}`));

const level = squadStrength;

function side(w: World, c: Career | null, clubId: string, oppLevel: number, form: number, opp: Player[]): SideState {
  const squad = squadOf(w, clubId);
  const mine = c?.clubId === clubId;
  const tactics: Tactics = mine ? (c!.tactics ?? DEFAULT_TACTICS) : aiTactics(squad, level(squad), oppLevel, opp, w.managers?.[clubId]?.style);
  const xi = mine ? xiFor(w, c!).xi : autoXI(squad, tactics.formation);
  const inXI = new Set(xi.map((p) => p.id));
  const bench = squad.filter((p) => !inXI.has(p.id) && available(p)).sort((a, b) => formOf(b) - formOf(a)).slice(0, BENCH_MAX);
  const sp = setPieces(xi, mine ? c!.tactics ?? DEFAULT_TACTICS : tactics, c?.season ?? 2026);
  const { xi: _x, captain: _c, penalties: _p, freeKicks: _f, corners: _k, ...plain } = { xi: null, captain: null, penalties: null, freeKicks: null, corners: null, ...tactics } as Tactics & Record<string, unknown>;
  void _x; void _c; void _p; void _f; void _k;
  return {
    clubId, ai: !mine, autoSubs: !mine,
    tactics: { ...(plain as Tactics), fullback: tactics.fullback ?? 0, striker: tactics.striker ?? 0, trap: tactics.trap ?? 0, philosophy: tactics.philosophy ?? 'balanced' },
    mastery: mine ? c!.mastery?.[tactics.philosophy ?? 'balanced'] ?? 60 : 60,
    talk: mine ? c!.talk ?? 0 : 0, onPitch: xi.map((p) => p.id), bench: bench.map((p) => p.id), subs: 0,
    pieces: { captain: sp.captain.id, penalties: sp.penalties.id, freeKicks: sp.freeKicks.id, corners: sp.corners.id }, form,
    mods: mine ? {
      fatigue: (c!.coach?.courses.includes('conditioning') ? 0.85 : 1) * (1 - (c!.ops?.staff.fitness?.quality ?? 0) / 500),
      press: c!.coach?.courses.includes('gegenpress') ? 1.03 : 1,
      level: (c!.ops?.staff.assistant?.quality ?? 0) / 100, // a great assistant is worth up to one rating point
    } : undefined,
  };
}

// `full`: record everything (the user's match; a quick match). Other matches play FAST on the same odds.
export function startMatch(w: World, c: Career | null, home: string, away: string, key: string, round: number, full?: boolean): LiveMatch {
  const r = rngFor(key, -1);
  const sh = squadOf(w, home), sa = squadOf(w, away);
  const lh = level(sh), la = level(sa);
  const sides: [SideState, SideState] = [side(w, c, home, la, 1 + bell(r) * 0.07, sa), side(w, c, away, lh, 1 + bell(r) * 0.07, sh)];
  // Balance settings: stronger or weaker opponents in the user's matches.
  const b = c && (home === c.clubId || away === c.clubId) ? balanceOf(c) : null;
  if (b?.difficulty) for (const s of sides) if (s.clubId !== c!.clubId) s.mods = { fatigue: s.mods?.fatigue ?? 1, press: s.mods?.press ?? 1, level: (s.mods?.level ?? 0) + oppBoost(b) };
  // v2.2: a week spent on the opposition (the analyst's report in hand) is worth a small, bounded edge on the day.
  if (c?.prep === 'opposition' && c.scouted?.[key]) {
    const mine = sides.find((s) => s.clubId === c.clubId);
    if (mine) mine.mods = { fatigue: mine.mods?.fatigue ?? 1, press: mine.mods?.press ?? 1, level: (mine.mods?.level ?? 0) + PREP_EDGE };
  }
  const fit: Record<string, number> = {};
  const risk: Record<string, number> = {};
  for (const s of sides) for (const id of [...s.onPitch, ...s.bench]) { const p = playerOf(w, id)!; fit[id] = p.fitness; const k = riskMult(p.load); if (k > 1) risk[id] = Math.round(k * 100) / 100; }
  return {
    key, round, sides, minute: 0, goals: [0, 0], events: [], possSum: 0, fit, injuries: b?.injuries ?? 1, risk,
    stats: [[50, 0, 0, 0, 0, 0, 0], [50, 0, 0, 0, 0, 0, 0]], played: [...sides[0].onPitch, ...sides[1].onPitch], xg: [0, 0],
    v: 2, full: full ?? !!(c && (home === c.clubId || away === c.clubId)), ball: { s: 0, n: 0, c: 0 }, tl: newTally(), rev: 0,
  };
}

// A match saved by the v1 engine carries on under v2: what happened so far is kept as a base the new events add to.
export function ensureV2(m: LiveMatch) {
  if (m.v === 2) return;
  m.v = 2;
  m.base = { stats: JSON.parse(JSON.stringify(m.stats)), xg: m.xg ? [...m.xg] as [number, number] : [0, 0], from: m.events.length };
  m.ball = { s: 0, n: 0, c: 0 };
  m.tl = newTally();
  const share = (m.stats[0][0] || 50) / 100;
  m.tl.poss = [share * m.minute * 36, (1 - share) * m.minute * 36];
  m.full = true;
  m.rev = 0;
}

// ---------- the model for the current state ----------

type Lookup = (id: string) => Player;

export function sideLevel(m: LiveMatch, i: 0 | 1, get: Lookup): number {
  const s = m.sides[i];
  const slots = FORMATIONS[s.tactics.formation].slots;
  let sum = 0, n = 0;
  s.onPitch.forEach((id, k) => {
    if (!id) return;
    sum += slotValue(get(id), slots[k]?.pos ?? 'CM', m.fit[id] ?? 100);
    n++;
  });
  const captainOn = s.onPitch.includes(s.pieces.captain) ? 0.5 : 0;
  return n ? (sum / n) * (n / 11) ** 0.35 + captainOn + (s.mods?.level ?? 0) : 0;
}

// `ahead`: minutes of fatigue to project (FAST play builds one model per half, for the half's middle minute).
export function inputsOf(m: LiveMatch, get: Lookup, over?: { side: 0 | 1; tactics: Tactics }, ahead = 0): [SideInput, SideInput] {
  return ([0, 1] as const).map((i): SideInput => {
    const s = m.sides[i];
    const tactics = over && over.side === i ? over.tactics : s.tactics;
    const drain = ahead * 0.135 * [0.85, 1, 1.28][tactics.pressing] * [0.93, 1, 1.08][tactics.tempo ?? 1] * (s.mods?.fatigue ?? 1);
    return {
      xi: s.onPitch.map((id) => (id ? get(id) : null)),
      tactics,
      fit: (id) => Math.max(20, (m.fit[id] ?? 100) - drain),
      bonus: (i === 0 ? TUNE.HOME : 0) + (s.form - 1) * 30 + (s.onPitch.includes(s.pieces.captain) ? 0.5 : 0) + (s.mods?.level ?? 0),
      cohesion: ((s.mastery ?? 60) / 100 - 0.6) * 0.2 + ((s.mods?.press ?? 1) - 1) * (tactics.pressing === 2 ? 2 : 0),
      talk: s.talk,
      mark: tactics.mark ?? null,
    };
  }) as [SideInput, SideInput];
}

const piecesOf = (m: LiveMatch) => m.sides.map((s) => s.pieces) as [SideState['pieces'], SideState['pieces']];
export const modelOf = (m: LiveMatch, get: Lookup, over?: { side: 0 | 1; tactics: Tactics }, ahead = 0): Model => buildModel(inputsOf(m, get, over, ahead), piecesOf(m));

// FAST matches build one model per half (fatigue projected to the half's middle minute) and rebuild after a red card or
// a tactical change; FULL matches rebuild it every minute.
const CACHE = new WeakMap<LiveMatch, { key: string; model: Model }>();
function modelNow(m: LiveMatch, get: Lookup): Model {
  if (m.full) return modelOf(m, get);
  const half = m.minute <= 45 ? 0 : 1;
  const key = `${half}|${m.rev ?? 0}`;
  const c = CACHE.get(m);
  if (c && c.key === key) return c.model;
  const model = modelOf(m, get, undefined, Math.max(0, (half ? 68 : 23) - m.minute));
  CACHE.set(m, { key, model });
  return model;
}

// Long-run rates of the current state: goals, xG, shots per 90, possession, xG by kind of chance.
export const expected = (m: LiveMatch, get: Lookup, over?: { side: 0 | 1; tactics: Tactics }): Rates => modelRates(modelOf(m, get, over));
export function rates(m: LiveMatch, get: Lookup): [number, number] { return expected(m, get).goals; }

const pois = (l: number, k: number) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
// Win / draw / loss for the home side over `mins` more minutes from score difference `d` (home − away).
export function outcome(goals: [number, number], mins: number, d = 0): [number, number, number] {
  const a = goals[0] * mins / 90, b = goals[1] * mins / 90;
  let win = 0, draw = 0, loss = 0;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
    const p = pois(a, i) * pois(b, j), x = d + i - j;
    if (x > 0) win += p; else if (x === 0) draw += p; else loss += p;
  }
  const t = win + draw + loss;
  return [win / t, draw / t, loss / t];
}

// Win / draw / loss chances for the home side, from the engine's own odds (E2E #15, #46: tactics change it).
export function predict(m: LiveMatch, get: Lookup): [number, number, number] {
  return outcome(expected(m, get).goals, 90);
}

// ---------- rules ----------

function changed(m: LiveMatch) { m.rev = (m.rev ?? 0) + 1; m.dirty = true; }

function sub(m: LiveMatch, i: 0 | 1, outId: string, inId: string, get?: Lookup) {
  const s = m.sides[i];
  const k = s.onPitch.indexOf(outId);
  if (k < 0 || s.subs >= SUBS_MAX || !s.bench.includes(inId)) return false;
  s.onPitch[k] = inId;
  s.bench = s.bench.filter((x) => x !== inId);
  s.subs++;
  if (!m.played.includes(inId)) m.played.push(inId);
  m.events.push({ min: m.minute, side: i, kind: 'sub', playerId: outId, inId });
  const cached = !m.full && get ? CACHE.get(m) : undefined;
  if (cached) patchSub(cached.model, i, outId, get!(inId), m.fit[inId] ?? 100, inputsOf(m, get!)[i].bonus);
  else changed(m);
  return true;
}

// Best bench player for a slot.
function bestIn(m: LiveMatch, i: 0 | 1, slotPos: Position, get: Lookup): string | null {
  const s = m.sides[i];
  const opts = s.bench.map(get).filter(available);
  if (!opts.length) return null;
  return opts.sort((a, b) => slotValue(b, slotPos, m.fit[b.id]) - slotValue(a, slotPos, m.fit[a.id]))[0].id;
}

export function userSub(m: LiveMatch, i: 0 | 1, outId: string, inId: string): boolean {
  ensureV2(m);
  return sub(m, i, outId, inId);
}

// A tactical change, recorded as an event so the story can say what it did.
export function setTactics(m: LiveMatch, i: 0 | 1, patch: Partial<Tactics>, why = ''): void {
  ensureV2(m);
  const s = m.sides[i];
  const keys = (Object.keys(patch) as (keyof Tactics)[]).filter((k) => JSON.stringify(s.tactics[k]) !== JSON.stringify(patch[k]));
  if (!keys.length) return;
  s.tactics = { ...s.tactics, ...patch };
  for (const k of keys) m.events.push({ min: m.minute, side: i, kind: 'tactic', playerId: '', note: `${k}:${String(patch[k])}${why ? `|${why}` : ''}` });
  changed(m);
}

// A new shape mid-match: the players on the pitch are re-slotted (keeper first, then each slot takes its best player).
export function reshape(m: LiveMatch, i: 0 | 1, formation: FormationId, get: Lookup, why = ''): void {
  ensureV2(m);
  const s = m.sides[i];
  if (s.tactics.formation === formation) return;
  s.onPitch = reslot(s.onPitch, formation, get);
  setTactics(m, i, { formation }, why);
}

export function setTalk(m: LiveMatch, i: 0 | 1, talk: Talk) {
  ensureV2(m);
  if (m.sides[i].talk === talk) return;
  m.sides[i].talk = talk;
  m.events.push({ min: m.minute, side: i, kind: 'tactic', playerId: '', note: `talk:${talk}` });
  changed(m);
}

function sendOff(m: LiveMatch, i: 0 | 1, id: string) {
  m.events.push({ min: m.minute, side: i, kind: 'red', playerId: id });
  const k = m.sides[i].onPitch.indexOf(id);
  if (k >= 0) m.sides[i].onPitch[k] = '';
  changed(m);
  // The AI manager reacts at once: down to ten, tighten up unless chasing; against ten, go for it.
  const o = (1 - i) as 0 | 1;
  const d = m.goals[i] - m.goals[o];
  if (m.sides[i].ai && d >= 0) setTactics(m, i, { mentality: Math.max(-2, m.sides[i].tactics.mentality - 1) }, 'red');
  if (m.sides[o].ai && m.goals[o] - m.goals[i] <= 0) setTactics(m, o, { mentality: Math.min(2, m.sides[o].tactics.mentality + 1) }, 'tenmen');
}

function rulesOf(m: LiveMatch): Rules {
  return {
    event: (e) => { m.events.push(e); if (e.kind === 'goal') m.goals[e.side]++; },
    foul: (i, id, victim, kind, r) => {
      if (!m.sides[i].onPitch.includes(id)) return false;
      m.events.push({ min: m.minute, side: i, kind: 'foul', playerId: id, vs: victim, how: kind === 'foul' ? undefined : kind });
      const calm = m.sides[i].talk === 2 ? 0.7 : m.sides[i].talk === 1 ? 1.2 : 1;
      const yp = (kind === 'tfoul' ? 0.5 : kind === 'pen' ? 0.3 : 0.14) * calm;
      const straight = kind === 'pen' ? 0.05 : 0.003;
      // A booked player goes into tackles more carefully.
      const booked = m.events.some((e) => e.kind === 'yellow' && e.playerId === id);
      if (r() < yp * (booked ? 0.4 : 1)) {
        m.events.push({ min: m.minute, side: i, kind: 'yellow', playerId: id });
        if (booked) { sendOff(m, i, id); return true; }
      } else if (r() < straight) { sendOff(m, i, id); return true; }
      return false;
    },
  };
}

// ---------- the AI manager ----------

function aiDecisions(m: LiveMatch, i: 0 | 1, get: Lookup) {
  const s = m.sides[i];
  const o = (1 - i) as 0 | 1;
  const diff = m.goals[i] - m.goals[o];
  const t = s.tactics;
  // Score-state reactions at half-time and with a quarter of an hour to go.
  if (s.ai && (m.minute === 46 || m.minute === 76)) {
    if (diff < 0) {
      const late = m.minute === 76;
      setTactics(m, i, { mentality: Math.min(2, t.mentality + 1), ...(late ? { tempo: 2 as const, pressing: 2 as const, waste: false } : {}) }, 'chase');
    } else if (diff > 0 && m.minute === 76) {
      setTactics(m, i, { mentality: Math.max(diff === 1 ? -2 : -1, Math.min(t.mentality, 0) - 1), waste: true }, 'protect');
    }
  }
  // Facing a human at half-time, the AI reads the first half and makes the one change that helps it most.
  if (s.ai && m.minute === 46 && !m.sides[o].ai && m.full) aiRead(m, i, get);
  // Fresh legs around the hour: swap the most tired outfield player when the bench has someone nearly as good.
  if (s.autoSubs && [58, 66, 72, 78, 84].includes(m.minute) && s.subs < SUBS_MAX) {
    const slots = FORMATIONS[s.tactics.formation].slots;
    const tired = s.onPitch
      .map((id, k) => ({ id, k }))
      .filter(({ id, k }) => id && slots[k].pos !== 'GK')
      .sort((a, b) => (m.fit[a.id] ?? 100) - (m.fit[b.id] ?? 100))[0];
    const inId = tired && bestIn(m, i, slots[tired.k].pos, get);
    if (tired && inId) {
      const now = slotValue(get(tired.id), slots[tired.k].pos, m.fit[tired.id]);
      const fresh = slotValue(get(inId), slots[tired.k].pos, m.fit[inId]);
      if (fresh >= now - 7) sub(m, i, tired.id, inId, get);
    }
  }
}

// ---------- one minute ----------

// Overlapping full-backs and a pressing striker run more; a high press and a fast tempo tire everyone.
const runExtra = (pos: Position, t: Tactics) => ((pos === 'LB' || pos === 'RB') && t.fullback === 1 ? 1.2 : pos === 'ST' && t.striker === 3 ? 1.25 : pos === 'LW' || pos === 'RW' ? 1.05 : 1);

// Player lookups for one match (the squads don't change while it's played).
const PLAYERS = new WeakMap<LiveMatch, Map<string, Player>>();
function playersOf(m: LiveMatch, get: Lookup): Lookup {
  let c = PLAYERS.get(m);
  if (!c) { c = new Map(); PLAYERS.set(m, c); }
  const cache = c;
  return (id) => { let p = cache.get(id); if (!p) { p = get(id); cache.set(id, p); } return p; };
}

export function stepMinute(m: LiveMatch, get: Lookup) {
  ensureV2(m);
  m.minute++;
  const r = rngFor(m.key, m.minute);
  for (const i of [0, 1] as const) aiDecisions(m, i, get);
  let model: Model | null = null;
  const current = () => { if (!model || m.dirty) { model = modelNow(m, get); m.dirty = false; } return model; };
  playMinute(m, r, current, rulesOf(m), !!m.full);
  // Time wasting: a booking now and then for the side running the clock.
  for (const i of [0, 1] as const) {
    const s = m.sides[i];
    if (s.tactics.waste && m.goals[i] > m.goals[1 - i] && r() < 0.012) {
      const on = s.onPitch.filter((id) => id && !m.events.some((e) => e.kind === 'yellow' && e.playerId === id));
      const gk = on.find((id) => get(id).position === 'GK') ?? on[0];
      if (gk) m.events.push({ min: m.minute, side: i, kind: 'yellow', playerId: gk, how: 'waste' });
    }
  }
  const share = (m.tl!.poss[1] + 1) / (m.tl!.poss[0] + m.tl!.poss[1] + 2); // side 0 chases when side 1 has had it
  const P = playersOf(m, get);
  for (const i of [0, 1] as const) {
    const s = m.sides[i];
    const t = s.tactics;
    const slots = FORMATIONS[t.formation].slots;
    // Fatigue: pressing, tempo, running roles, and chasing a side that keeps the ball.
    const chase = 1 + 0.35 * ((i === 0 ? share : 1 - share) - 0.5);
    const load = [0.85, 1, 1.28][t.pressing] * [0.93, 1, 1.08][t.tempo ?? 1] * (s.mods?.fatigue ?? 1) * chase;
    let n = 0, sum = 0, outN = 0, outSum = 0;
    for (let k = 0; k < s.onPitch.length; k++) {
      const id = s.onPitch[k];
      if (!id) continue;
      const p = P(id), pos = slots[k]?.pos ?? p.position;
      const f0 = m.fit[id] ?? 100;
      const f = Math.max(20, f0 - (pos === 'GK' ? 0.04 : 0.135 * load * runExtra(pos, t) * (1 - (p.attrs[5] - 70) / 300)));
      m.fit[id] = f;
      n++; sum += f;
      if (pos !== 'GK') { outN++; outSum += f; }
    }
    if (!n) continue;
    // Injuries: more likely when tired.
    // v2.6: a loaded player (sim/youth.ts riskMult) raises the side's chance and is likelier to be the one hurt.
    const on = s.onPitch.filter(Boolean);
    const rk = on.map((id) => m.risk?.[id] ?? 1);
    const rsum = rk.reduce((a, v) => a + v, 0);
    if (r() < 0.0014 * (m.injuries ?? 1) * (1 + Math.max(0, 75 - sum / n) / 40) * (t.pressing === 2 ? 1.12 : 1) * (rsum / Math.max(1, on.length))) {
      let pickAt = r() * rsum, hi = 0;
      while (hi < on.length - 1 && pickAt >= rk[hi]) pickAt -= rk[hi++];
      const hurt = on[hi];
      const out = r() < 0.12 ? 6 + Math.floor(r() * 7) : 1 + Math.floor(r() * 5);
      m.events.push({ min: m.minute, side: i, kind: 'injury', playerId: hurt, out });
      const k = s.onPitch.indexOf(hurt);
      const pos = slots[k]?.pos ?? 'CM';
      const inId = s.subs < SUBS_MAX ? bestIn(m, i, pos, get) : null;
      if (inId) sub(m, i, hurt, inId, get); else { s.onPitch[k] = ''; changed(m); }
    }
    if (m.full && m.minute % 15 === 0) m.tl!.fit[i].push(Math.round(outSum / Math.max(1, outN)));
  }
  if (m.full || m.minute >= 90) derive(m);
  if (m.minute === 90 && m.cup && !m.group && m.goals[0] === m.goals[1]) shootout(m, get);
}

// ---------- projection: everything counted from the event log ----------

export function derive(m: LiveMatch) {
  const st: [TeamStats, TeamStats] = m.base ? [[...m.base.stats[0]] as TeamStats, [...m.base.stats[1]] as TeamStats] : [[50, 0, 0, 0, 0, 0, 0], [50, 0, 0, 0, 0, 0, 0]];
  const xg: [number, number] = m.base ? [...m.base.xg] as [number, number] : [0, 0];
  for (let k = m.base?.from ?? 0; k < m.events.length; k++) {
    const e = m.events[k];
    switch (e.kind) {
      case 'goal': st[e.side][1]++; st[e.side][2]++; xg[e.side] += e.xg ?? 0; break;
      case 'save': st[1 - e.side][1]++; st[1 - e.side][2]++; xg[1 - e.side] += e.xg ?? 0; break;
      case 'miss': case 'block': st[e.side][1]++; xg[e.side] += e.xg ?? 0; break;
      case 'corner': st[e.side][3]++; break;
      case 'foul': st[e.side][4]++; break;
      case 'yellow': st[e.side][5]++; break;
      case 'red': st[e.side][6]++; break;
    }
  }
  const [p0, p1] = m.tl?.poss ?? [1, 1];
  st[0][0] = Math.round((100 * p0) / Math.max(1, p0 + p1));
  st[1][0] = 100 - st[0][0];
  m.stats = st;
  m.xg = [Math.round(xg[0] * 100) / 100, Math.round(xg[1] * 100) / 100];
}

// Knockout draw: five penalties each, then sudden death. Takers go by shooting, the set penalty taker first.
function shootout(m: LiveMatch, get: Lookup) {
  const r = rngFor(m.key, 91);
  const order = ([0, 1] as const).map((i) => {
    const s = m.sides[i];
    const on = s.onPitch.filter(Boolean).map(get);
    const first = on.find((p) => p.id === s.pieces.penalties);
    const rest = on.filter((p) => p !== first).sort((a, b) => (a.position === 'GK' ? 1 : 0) - (b.position === 'GK' ? 1 : 0) || b.attrs[1] - a.attrs[1]);
    return first ? [first, ...rest] : rest;
  });
  const keeper = (i: 0 | 1) => m.sides[i].onPitch.filter(Boolean).map(get).find((p) => p.position === 'GK');
  const pens: [number, number] = [0, 0];
  const kicks: [0 | 1, string, boolean][] = [];
  for (let k = 0; k < 30; k++) {
    for (const i of [0, 1] as const) {
      const taker = order[i][k % Math.max(1, order[i].length)];
      if (!taker) continue;
      const gk = keeper((1 - i) as 0 | 1);
      const p = clamp(0.74 + (taker.attrs[1] - 70) * 0.004 - ((gk?.attrs[6] ?? 60) - 70) * 0.003, 0.5, 0.92);
      const scored = r() < p;
      if (scored) pens[i]++;
      kicks.push([i, taker.id, scored]);
    }
    const n = k + 1;
    if (n <= 5) {
      if (pens[0] > pens[1] + (5 - n) || pens[1] > pens[0] + (5 - n)) break;
    } else if (pens[0] !== pens[1]) break;
  }
  m.pens = pens;
  m.kicks = kicks;
}

// Who went through: goals, then penalties.
export const winnerOf = (m: LiveMatch): 0 | 1 =>
  m.goals[0] !== m.goals[1] ? (m.goals[0] > m.goals[1] ? 0 : 1) : ((m.pens?.[0] ?? 0) >= (m.pens?.[1] ?? 0) ? 0 : 1);

export function simulate(m: LiveMatch, get: Lookup, until = 90) {
  while (m.minute < until) stepMinute(m, get);
}

export const isUserSide = (m: LiveMatch, c: Career) => (m.sides[0].clubId === c.clubId ? 0 : m.sides[1].clubId === c.clubId ? 1 : -1);
