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
  FORMATIONS, aiTactics, autoXI, availableIn, formOf, fullTactics, setPieces, slotValue, xiFor, DEFAULT_TACTICS, type FormationId, type Tactics,
} from './tactics';
import { TUNE, buildModel, patchSub, rates as modelRates, type Model, type Rates, type SideInput } from './engine/model';
import { newTally, playMinute, type Ball, type Flow, type PassTally, type Rules, type Tally } from './engine/play';
import { aiPrep, aiRead, reslot } from './engine/story';
import { autoRoles, carryRoles, planFor, planOf, slotLoad } from './engine/phases';
import { EV } from './engine/model';
import { RS, RSN, TUNE_REF, callFoul, callGoal, callOffside, ensureRef, foulFactor, initRef, misconduct, refereeFor, restartOnTurnover, settle, wasteBooking, type Acts, type RefState } from './engine/referee';
import { PERIOD_END, afterTick, isExtraBreak, isHalfTime, knockout, needsExtra, periodOver, playOver, tick } from './engine/clock';
import { SUBS } from './competitions';
import { BG, HURT, proneness } from './engine/injury';
import { WX, weatherFor, weatherPlan, type Wx } from './engine/weather';
import { AI_COH, cohLevel, cohesionOfClub } from './cohesion';
import { staffEdge } from './norms';

// gf-ref: 'pen' a penalty given (side = the side awarded it, playerId = the player fouled, vs = the offender),
// 'var' a VAR check or on-field review (note `what:check|ofr:stands|over[:why]`), 'nogoal' a goal ruled out.
export type EventKind = 'goal' | 'miss' | 'save' | 'block' | 'yellow' | 'red' | 'injury' | 'sub' | 'corner' | 'foul' | 'offside' | 'duel' | 'tactic' | 'pen' | 'var' | 'nogoal';
export interface MatchEvent {
  min: number; side: 0 | 1; kind: EventKind;
  plus?: number;          // gf-ref: a minute of added time (45+2 → min 45, plus 2)
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
  coh?: number;        // v2.4: team cohesion at kick-off in a user match (its level is in mods.level; the Why reads it)
  win?: number;        // gf-ref: substitution windows used (half-time and the break before extra time are free)
  lastWin?: string;    // gf-ref: the stoppage of the last window (more changes at the same stoppage are the same window)
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
  wx?: Wx;             // weather (engine/weather.ts); missing (old saves) = clear
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
  ps?: PassTally;      // the passes of a FULL match, counted (engine/play.ts; the analysis, ratings and numbers read it)
  rev?: number;        // bumps on every change the model depends on (subs, cards, tactics)
  dirty?: boolean;     // the model must be rebuilt now (a red card mid-minute)
  base?: { stats: [TeamStats, TeamStats]; xg: [number, number]; from: number }; // a v1 match resumed on v2
  // gf-ref (all optional: a match saved before the referee gets one at its next minute)
  comp?: string;       // competition id: the league, or the cup (m.cup)
  season?: number;
  stage?: number | 'group'; // cup ties: clubs left in the round, or the group stage
  ref?: RefState;      // the referee, his incidents and counters (engine/referee.ts)
  added?: number[];    // added time shown at the end of each period (45, 90, 105, 120)
  plus?: number;       // the minute of added time being played (0 = regulation time)
}

export const SUBS_MAX = 5;
// Rating levels an Opposition prep week adds to the user's side (about half a rating point across the XI).
export const PREP_EDGE = 0.5;
export const BENCH_MAX = 9;

const hash = (s: string) => { let h = 17; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h; };
export const rngFor = (key: string, minute: number) => makeRng(hash(`${key}:${minute}`));

const level = squadStrength;

function side(w: World, c: Career | null, clubId: string, oppLevel: number, form: number, opp: Player[], cup?: string): SideState {
  const squad = squadOf(w, clubId);
  const mine = c?.clubId === clubId;
  const tactics: Tactics = mine ? (c!.tactics ?? DEFAULT_TACTICS) : aiTactics(squad, level(squad), oppLevel, opp, w.managers?.[clubId]?.style);
  // gf-ref: suspensions are per competition (a cup ban doesn't keep a player out of the league, and back).
  const xi = mine ? xiFor(w, c!, cup).xi : autoXI(squad, tactics.formation, cup);
  // Tactics v3: an AI manager gives each player the role that suits him (and the club's style) in each phase.
  if (!mine && !tactics.roles) Object.assign(tactics, autoRoles(xi, fullTactics(tactics)));
  const inXI = new Set(xi.map((p) => p.id));
  const bench = squad.filter((p) => !inXI.has(p.id) && availableIn(p, cup)).sort((a, b) => formOf(b) - formOf(a)).slice(0, BENCH_MAX);
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
      // Staff count against what a club this size normally has (economy.ts staffNorm): AI sides play at that norm.
      fatigue: (c!.coach?.courses.includes('conditioning') ? 0.85 : 1) * (1 - staffEdge(c!.ops, w.clubs.find((x) => x.id === clubId), 'fitness') / 500),
      press: c!.coach?.courses.includes('gegenpress') ? 1.03 : 1,
      // an assistant 30 points above the norm is worth about a third of a rating point; v2.4: cohesion ±2 levels
      // (sim/cohesion.ts), measured against the normal room the other side brings (AI_COH)
      level: staffEdge(c!.ops, w.clubs.find((x) => x.id === clubId), 'assistant') / 100 + cohLevel(cohesionOfClub(w.clubs, clubId)),
    } : undefined,
    ...(mine ? { coh: cohesionOfClub(w.clubs, clubId) } : {}),
  };
}

// `full`: record everything (the user's match; a quick match). Other matches play FAST on the same odds.
// gf-ref: `cup` (a cup tie: its id, and `stage`: clubs left in the round, or 'group') sets the competition's rules.
export function startMatch(w: World, c: Career | null, home: string, away: string, key: string, round: number, full?: boolean,
  cup?: { id: string; stage?: number | 'group' }): LiveMatch {
  const r = rngFor(key, -1);
  const sh = squadOf(w, home), sa = squadOf(w, away);
  const lh = level(sh), la = level(sa);
  const sides: [SideState, SideState] = [side(w, c, home, la, 1 + bell(r) * 0.07, sa, cup?.id), side(w, c, away, lh, 1 + bell(r) * 0.07, sh, cup?.id)];
  // Balance settings: stronger or weaker opponents in the user's matches.
  const b = c && (home === c.clubId || away === c.clubId) ? balanceOf(c) : null;
  if (b?.difficulty) for (const s of sides) if (s.clubId !== c!.clubId) s.mods = { fatigue: s.mods?.fatigue ?? 1, press: s.mods?.press ?? 1, level: (s.mods?.level ?? 0) + oppBoost(b) };
  // v2.4: the other side of a user match plays with a normal room's cohesion (sim/cohesion.ts AI_COH).
  if (c && (home === c.clubId || away === c.clubId)) for (const s of sides) if (s.clubId !== c.clubId) { s.coh = AI_COH; s.mods = { fatigue: s.mods?.fatigue ?? 1, press: s.mods?.press ?? 1, level: (s.mods?.level ?? 0) + cohLevel(AI_COH) }; }
  // v2.2: a week spent on the opposition (the analyst's report in hand) is worth a small, bounded edge on the day.
  if (c?.prep === 'opposition' && c.scouted?.[key]) {
    const mine = sides.find((s) => s.clubId === c.clubId);
    if (mine) mine.mods = { fatigue: mine.mods?.fatigue ?? 1, press: mine.mods?.press ?? 1, level: (mine.mods?.level ?? 0) + PREP_EDGE };
  }
  const fit: Record<string, number> = {};
  const risk: Record<string, number> = {};
  for (const s of sides) for (const id of [...s.onPitch, ...s.bench]) { const p = playerOf(w, id)!; fit[id] = p.fitness; const k = riskMult(p.load); if (k > 1) risk[id] = Math.round(k * 100) / 100; }
  const leagueOfClub = (id: string) => w.clubs.find((x) => x.id === id)?.leagueId ?? 'eng1';
  const countryOf = (id: string) => w.leagues.find((l) => l.id === leagueOfClub(id))?.country ?? 'ENG';
  const season = c?.season ?? 2026;
  const m: LiveMatch = {
    key, round, sides, minute: 0, goals: [0, 0], events: [], possSum: 0, fit, injuries: b?.injuries ?? 1, risk,
    stats: [[50, 0, 0, 0, 0, 0, 0], [50, 0, 0, 0, 0, 0, 0]], played: [...sides[0].onPitch, ...sides[1].onPitch], xg: [0, 0],
    v: 2, full: full ?? !!(c && (home === c.clubId || away === c.clubId)), ball: { s: 0, n: 0, c: 0 }, tl: newTally(), rev: 0,
    comp: cup?.id ?? leagueOfClub(home), season, plus: 0, wx: weatherFor(key, countryOf(home)),
  };
  if (cup) { m.cup = cup.id; if (cup.stage === 'group') m.group = true; m.stage = cup.stage; }
  m.ref = initRef(m, refereeFor(key, m.comp!, [countryOf(home), countryOf(away)]), season);
  return m;
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
    const drain = ahead * 0.135 * WX.tire[m.wx ?? 0] * [0.85, 1, 1.28][tactics.pressing] * [0.93, 1, 1.08][tactics.tempo ?? 1] * [0.97, 1, 1.06][tactics.cpress ?? 1] * (s.mods?.fatigue ?? 1);
    const short = s.onPitch.filter((id) => !id).length; // gf-ref: down to ten (or fewer): everyone covers more ground
    return {
      xi: s.onPitch.map((id) => (id ? get(id) : null)),
      tactics,
      fit: (id) => Math.max(20, (m.fit[id] ?? 100) - drain),
      foulK: m.ref ? foulFactor(m, i, get) : undefined,
      wx: m.wx,
      bonus: (i === 0 ? TUNE.HOME : 0) + (s.form - 1) * 30 + (s.onPitch.includes(s.pieces.captain) ? 0.5 : 0) + (s.mods?.level ?? 0) - TUNE_REF.short * short,
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

// gf-ref: five changes in three windows (half-time and the break before extra time are free); one more of each in
// extra time. A sent-off player's place can't be filled: an empty slot is never an `outId`.
const stamp = (m: LiveMatch) => (m.plus ? { min: m.minute, plus: m.plus } : { min: m.minute });
const stoppage = (m: LiveMatch) => `${m.minute}+${m.plus ?? 0}`;
const inBreak = (m: LiveMatch) => m.minute === 0 || isHalfTime(m) || isExtraBreak(m) || periodOver(m, 2);
export const subsMax = (m: LiveMatch) => SUBS.max + (m.minute > 90 || isExtraBreak(m) ? SUBS.etExtra : 0);
export const windowsMax = (m: LiveMatch) => SUBS.windows + (m.minute > 90 || isExtraBreak(m) ? SUBS.etExtra : 0);
export function canSub(m: LiveMatch, i: 0 | 1): boolean {
  const s = m.sides[i];
  if (s.subs >= subsMax(m)) return false;
  return inBreak(m) || s.lastWin === stoppage(m) || (s.win ?? 0) < windowsMax(m);
}
export const windowsLeft = (m: LiveMatch, i: 0 | 1) => Math.max(0, windowsMax(m) - (m.sides[i].win ?? 0));

function sub(m: LiveMatch, i: 0 | 1, outId: string, inId: string, get?: Lookup) {
  const s = m.sides[i];
  const k = outId ? s.onPitch.indexOf(outId) : -1;
  if (k < 0 || !canSub(m, i) || !s.bench.includes(inId)) return false;
  if (m.events.some((e) => e.kind === 'red' && e.playerId === inId)) return false;
  if (!inBreak(m) && s.lastWin !== stoppage(m)) { s.win = (s.win ?? 0) + 1; s.lastWin = stoppage(m); }
  s.onPitch[k] = inId;
  s.bench = s.bench.filter((x) => x !== inId);
  s.subs++;
  if (!m.played.includes(inId)) m.played.push(inId);
  m.events.push({ ...stamp(m), side: i, kind: 'sub', playerId: outId, inId });
  const cached = !m.full && get ? CACHE.get(m) : undefined;
  if (cached) patchSub(cached.model, i, outId, get!(inId), m.fit[inId] ?? 100, inputsOf(m, get!)[i].bonus);
  else changed(m);
  return true;
}

// A player goes off hurt: the event (how 'foul' and the offence when a tackle did it), then the best sub in his slot.
function injure(m: LiveMatch, i: 0 | 1, id: string, out: number, get: Lookup, off?: string) {
  const s = m.sides[i];
  m.events.push({ ...stamp(m), side: i, kind: 'injury', playerId: id, out, ...(off ? { how: 'foul', note: off } : {}) });
  const k = s.onPitch.indexOf(id);
  const pos = FORMATIONS[s.tactics.formation].slots[k]?.pos ?? 'CM';
  const inId = canSub(m, i) ? bestIn(m, i, pos, get) : null;
  if (inId) sub(m, i, id, inId, get); else { s.onPitch[k] = ''; changed(m); }
}
// Best bench player for a slot.
function bestIn(m: LiveMatch, i: 0 | 1, slotPos: Position, get: Lookup): string | null {
  const s = m.sides[i];
  const opts = s.bench.map(get).filter((p) => availableIn(p, m.cup) && !m.events.some((e) => e.kind === 'red' && e.playerId === p.id));
  if (!opts.length) return null;
  return opts.sort((a, b) => slotValue(b, slotPos, m.fit[b.id]) - slotValue(a, slotPos, m.fit[a.id]))[0].id;
}

export function userSub(m: LiveMatch, i: 0 | 1, outId: string, inId: string): boolean {
  ensureV2(m);
  if (!outId || !m.sides[i].onPitch.includes(outId)) return false;
  return sub(m, i, outId, inId);
}

// A tactical change, recorded as an event so the story can say what it did.
export function setTactics(m: LiveMatch, i: 0 | 1, patch: Partial<Tactics>, why = ''): void {
  ensureV2(m);
  const s = m.sides[i];
  const keys = (Object.keys(patch) as (keyof Tactics)[]).filter((k) => JSON.stringify(s.tactics[k]) !== JSON.stringify(patch[k]));
  if (!keys.length) return;
  const was = s.tactics;
  s.tactics = { ...s.tactics, ...patch };
  for (const k of keys) {
    // Tactics v3: a role change is logged per player ("role:ip:<player>:<role>") so the story can say what it did.
    if (k === 'roles' || k === 'oopRoles') {
      const ph = k === 'roles' ? 'ip' : 'oop';
      const a = planOf(fullTactics(was)), b = planOf(fullTactics(s.tactics));
      b[ph].forEach((r, slot) => { if (r !== a[ph][slot] && s.onPitch[slot]) m.events.push({ min: m.minute, side: i, kind: 'tactic', playerId: s.onPitch[slot], note: `role:${ph}:${s.onPitch[slot]}:${r}${why ? `|${why}` : ''}` }); });
      continue;
    }
    m.events.push({ min: m.minute, side: i, kind: 'tactic', playerId: '', note: `${k}:${String(patch[k])}${why ? `|${why}` : ''}` });
  }
  changed(m);
}

// A new shape mid-match: the players on the pitch are re-slotted (keeper first, then each slot takes its best player).
export function reshape(m: LiveMatch, i: 0 | 1, formation: FormationId, get: Lookup, why = ''): void {
  ensureV2(m);
  const s = m.sides[i];
  if (s.tactics.formation === formation) return;
  // Tactics v3: roles stay with their positions where the new shape still has them.
  const roles = s.tactics.roles || s.tactics.oopRoles ? carryRoles(fullTactics(s.tactics), formation) : null;
  s.onPitch = reslot(s.onPitch, formation, get);
  setTactics(m, i, { formation, ...(roles ?? {}) }, why);
}

// Tactics v3: a new out-of-possession shape mid-match (the players keep their in-possession slots).
export function reshapeOop(m: LiveMatch, i: 0 | 1, oop: FormationId, why = ''): void {
  ensureV2(m);
  const t = fullTactics(m.sides[i].tactics);
  if (t.oop === oop) return;
  setTactics(m, i, { oop, ...(m.sides[i].tactics.oopRoles ? { oopRoles: carryRoles(t, t.formation, oop).oopRoles } : {}) }, why);
}

export function setTalk(m: LiveMatch, i: 0 | 1, talk: Talk) {
  ensureV2(m);
  if (m.sides[i].talk === talk) return;
  m.sides[i].talk = talk;
  m.events.push({ ...stamp(m), side: i, kind: 'tactic', playerId: '', note: `talk:${talk}` });
  changed(m);
}

// RULES HOOK (tactics v3): a player leaves the pitch for good (a red card; the referee lane may call it directly).
// His slot is emptied and the model rebuilt at once: every contest loses him, the side's block sits deeper and its
// attack sends fewer runners (phases.ts spotOf `short`), and sideLevel() drops. Returns false if he wasn't on.
export function applyDismissal(m: LiveMatch, i: 0 | 1, id: string): boolean {
  const k = m.sides[i].onPitch.indexOf(id);
  if (k < 0) return false;
  m.sides[i].onPitch[k] = '';
  changed(m);
  return true;
}

// gf-ref: a sending-off takes the player off for good; the side reorganises (a keeper from the bench if the keeper
// went, otherwise the most advanced position is the one left empty) and plays on with ten.
function sendOff(m: LiveMatch, i: 0 | 1, id: string, how = 'sfp', get?: Lookup) {
  m.events.push({ ...stamp(m), side: i, kind: 'red', playerId: id, how });
  const s = m.sides[i];
  const k = s.onPitch.indexOf(id);
  if (k >= 0) s.onPitch[k] = '';
  if (get && k >= 0) {
    const slots = FORMATIONS[s.tactics.formation].slots;
    if (slots[k]?.pos === 'GK' && canSub(m, i)) {
      const gk = s.bench.map(get).find((p) => p.position === 'GK' && availableIn(p, m.cup));
      const outs = s.onPitch.map((x, j) => ({ x, j })).filter(({ x, j }) => x && slots[j]?.pos !== 'GK').sort((a, b) => (slots[b.j]?.y ?? 0) - (slots[a.j]?.y ?? 0));
      if (gk && outs.length) sub(m, i, outs[0].x, gk.id);
    }
    s.onPitch = reslot(s.onPitch, s.tactics.formation, get);
  }
  changed(m);
  // The AI manager reacts at once: down to ten, tighten up unless chasing; against ten, go for it.
  const o = (1 - i) as 0 | 1;
  const d = m.goals[i] - m.goals[o];
  if (m.sides[i].ai && d >= 0) setTactics(m, i, { mentality: Math.max(-2, m.sides[i].tactics.mentality - 1) }, 'red');
  if (m.sides[o].ai && m.goals[o] - m.goals[i] <= 0) setTactics(m, o, { mentality: Math.min(2, m.sides[o].tactics.mentality + 1) }, 'tenmen');
}

// gf-ref: the rules layer hands every foul, goal and offside to the referee (engine/referee.ts); only final rulings
// reach the log. Nothing is logged for a player who isn't on the pitch.
function pushEvent(m: LiveMatch, e: MatchEvent) {
  const onP = (side: number, id?: string) => !!id && m.sides[side].onPitch.includes(id);
  const x: MatchEvent = { ...e, ...stamp(m) };
  if (x.assistId && !onP(x.side, x.assistId)) delete x.assistId;
  if (x.vs && x.kind !== 'goal' && x.kind !== 'pen' && x.kind !== 'duel' && !onP(1 - x.side, x.vs) && !onP(x.side, x.vs)) delete x.vs;
  m.events.push(x);
  if (x.kind === 'goal') m.goals[x.side]++;
}
function actsOf(m: LiveMatch, get: Lookup): Acts {
  return { push: (e) => pushEvent(m, e), sendOff: (side, id, how) => sendOff(m, side, id, how, get), get };
}
// The fouled player who may be hurt: rolled after the minute (stepMinute), on a stream of its own.
interface Hurt { side: 0 | 1; id: string; off: string }
function rulesOf(m: LiveMatch, get: Lookup, rr: () => number, hurt: Hurt[]): Rules {
  const acts = actsOf(m, get);
  return {
    event: (e) => {
      if (e.kind === 'goal') { callGoal(m, acts, rr, { ...e, ...stamp(m) }); return; }
      if (e.kind === 'offside') callOffside(m, e);
      pushEvent(m, e);
    },
    foul: (i, id, victim, kind, _r, at) => {
      if (!m.sides[i].onPitch.includes(id)) return { red: false, go: kind === 'pen' ? 'pen' : 'fk' };
      const phase = at?.phase ?? 1;
      const out = callFoul(m, acts, rr, { side: i, by: id, vs: victim, kind: kind === 'tfoul' ? 'tfoul' : 'foul', box: at?.box ?? kind === 'pen', z: at?.z ?? 12, phase });
      if (victim && out.off && HURT[out.off]) hurt.push({ side: (1 - i) as 0 | 1, id: victim, off: out.off });
      return out;
    },
    turnover: (s, node, start, ev) => restartOnTurnover(m, rr, s, node, start, ev === EV.MISS),
  };
}

// ---------- the AI manager ----------

function aiDecisions(m: LiveMatch, i: 0 | 1, get: Lookup) {
  const s = m.sides[i];
  const o = (1 - i) as 0 | 1;
  const diff = m.goals[i] - m.goals[o];
  const t = s.tactics;
  // Kick-off: the AI manager sets up for the weather (engine/weather.ts weatherPlan), logged like any other change.
  if (s.ai && m.minute === 1 && !m.plus && m.wx) setTactics(m, i, weatherPlan(fullTactics(t), m.wx) as Partial<Tactics>, `wx${m.wx}`);
  // Score-state reactions at half-time and with a quarter of an hour to go.
  if (s.ai && (m.minute === 46 || m.minute === 76)) {
    if (diff < 0) {
      const late = m.minute === 76;
      setTactics(m, i, { mentality: Math.min(2, t.mentality + 1), ...(late ? { tempo: 2 as const, pressing: 2 as const, waste: false } : {}) }, 'chase');
    } else if (diff > 0 && m.minute === 76) {
      setTactics(m, i, { mentality: Math.max(diff === 1 ? -2 : -1, Math.min(t.mentality, 0) - 1), waste: true }, 'protect');
    }
  }
  // Facing a human, the AI sets up for this opponent at kick-off (engine/story.ts aiPrep), after the weather.
  if (s.ai && m.minute === 1 && !m.plus && !m.sides[o].ai && m.full) aiPrep(m, i, get);
  // Facing a human at half-time, the AI reads the first half and makes the one change that helps it most.
  if (s.ai && m.minute === 46 && !m.sides[o].ai && m.full) aiRead(m, i, get);
  // Fresh legs around the hour: swap the most tired outfield players when the bench has someone nearly as good.
  // gf-ref: in three windows (two changes at each of the first two), and one in extra time.
  const plan = m.minute === 60 || m.minute === 72 ? 2 : m.minute === 82 || m.minute === 100 ? 1 : 0;
  if (s.autoSubs && plan && !m.plus) {
    const slots = FORMATIONS[s.tactics.formation].slots;
    // The most tired outfielder with a bench player nearly as good for his slot (tactics v3: a tired wing-back with no
    // full-back on the bench no longer blocks every other change).
    // gf-ref: in three windows (two changes at each of the first two), and one in extra time.
    for (let n = 0; n < plan && canSub(m, i); n++) {
      const tired = s.onPitch
        .map((id, k) => ({ id, k }))
        .filter(({ id, k }) => id && slots[k].pos !== 'GK')
        .sort((a, b) => (m.fit[a.id] ?? 100) - (m.fit[b.id] ?? 100))[0];
      const inId = tired && bestIn(m, i, slots[tired.k].pos, get);
      if (!tired || !inId) break;
      const now = slotValue(get(tired.id), slots[tired.k].pos, m.fit[tired.id]);
      const fresh = slotValue(get(inId), slots[tired.k].pos, m.fit[inId]);
      if (fresh >= now - 7) sub(m, i, tired.id, inId, get); else break;
    }
  }
}

// ---------- one minute ----------

// Tactics v3: running load by role lives in phases.ts slotLoad (wing-backs, box-to-box, pressers run more; outlets less).

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
  if (playOver(m)) return;
  ensureRef(m);
  tick(m); // gf-ref: the next regulation minute, or a minute of added time (engine/clock.ts)
  const t = m.plus ? 1000 + m.minute * 20 + m.plus : m.minute;
  const r = rngFor(m.key, t);
  const rr = rngFor(`${m.key}:ref`, t); // the referee's own stream
  const R = m.ref!;
  if (!m.plus && (m.minute === 1 || m.minute === 46 || m.minute === 91 || m.minute === 106)) R.rs[(m.minute === 46 || m.minute === 106 ? 1 : 0) * RSN + RS.ko]++;
  for (const i of [0, 1] as const) aiDecisions(m, i, get);
  let model: Model | null = null;
  const current = () => { if (!model || m.dirty) { model = modelNow(m, get); m.dirty = false; } return model; };
  const acts = actsOf(m, get);
  const hurt: Hurt[] = [];
  playMinute(m, r, current, rulesOf(m, get, rr, hurt), !!m.full, m.full ? rngFor(`${m.key}:pass`, t) : undefined); // the passes' own stream (engine/passes.ts)
  settle(m, acts);       // DOGSO with advantage: a card, or none if the move ended in a goal
  misconduct(m, acts, rr); // dissent, violent conduct
  // Hurt in a tackle (engine/injury.ts): the offence, the player's proneness and his load.
  if (hurt.length) {
    const ri = rngFor(`${m.key}:inj`, t);
    for (const h of hurt) {
      if (!m.sides[h.side].onPitch.includes(h.id) || m.events.some((e) => e.kind === 'injury' && e.playerId === h.id)) continue;
      if (ri() >= HURT[h.off] * proneness(get(h.id)) * (m.injuries ?? 1) * (m.risk?.[h.id] ?? 1)) continue;
      const out = ri() < (h.off === 'sfp' ? 0.45 : 0.15) ? 6 + Math.floor(ri() * 7) : 1 + Math.floor(ri() * 5);
      injure(m, h.side, h.id, out, get, h.off);
    }
  }
  // Time wasting: a booking now and then for the side running the clock.
  for (const i of [0, 1] as const) {
    const s = m.sides[i];
    if (s.tactics.waste && m.goals[i] > m.goals[1 - i] && r() < 0.012) {
      const on = s.onPitch.filter((id) => id && !m.events.some((e) => e.kind === 'yellow' && e.playerId === id));
      const gk = on.find((id) => get(id).position === 'GK') ?? on[0];
      if (gk) wasteBooking(m, acts, i, gk);
    }
  }
  const share = (m.tl!.poss[1] + 1) / (m.tl!.poss[0] + m.tl!.poss[1] + 2); // side 0 chases when side 1 has had it
  const P = playersOf(m, get);
  for (const i of [0, 1] as const) {
    const s = m.sides[i];
    const t = s.tactics;
    const slots = FORMATIONS[t.formation].slots;
    const plan = planFor(t);
    const cp = { cpress: t.cpress ?? 1 };
    // Fatigue: pressing, tempo, running roles, and chasing a side that keeps the ball.
    const chase = 1 + 0.35 * ((i === 0 ? share : 1 - share) - 0.5);
    const load = [0.85, 1, 1.28][t.pressing] * [0.93, 1, 1.08][t.tempo ?? 1] * (s.mods?.fatigue ?? 1) * chase * WX.tire[m.wx ?? 0];
    let n = 0, sum = 0, outN = 0, outSum = 0;
    for (let k = 0; k < s.onPitch.length; k++) {
      const id = s.onPitch[k];
      if (!id) continue;
      const p = P(id), pos = slots[k]?.pos ?? p.position;
      const f0 = m.fit[id] ?? 100;
      const run = plan.ip[k] ? slotLoad(pos, plan.ip[k], plan.oop[k], cp) : 1; // tactics v3: roles decide who runs
      const f = Math.max(20, f0 - (pos === 'GK' ? 0.04 : 0.135 * load * run * (1 - (p.attrs[5] - 70) / 300)));
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
    if (r() < BG * WX.inj[m.wx ?? 0] * 0.0014 * (m.injuries ?? 1) * (1 + Math.max(0, 75 - sum / n) / 40) * (t.pressing === 2 ? 1.12 : 1) * (rsum / Math.max(1, on.length))) {
      // Who: his load and his hidden proneness (engine/injury.ts).
      const wk = on.map((id, j) => rk[j] * proneness(P(id)));
      let pickAt = r() * wk.reduce((a, v) => a + v, 0), hi = 0;
      while (hi < on.length - 1 && pickAt >= wk[hi]) pickAt -= wk[hi++];
      const out = r() < 0.12 ? 6 + Math.floor(r() * 7) : 1 + Math.floor(r() * 5);
      injure(m, i, on[hi], out, get);
    }
    if (m.full && m.minute % 15 === 0 && !m.plus) m.tl!.fit[i].push(Math.round(outSum / Math.max(1, outN)));
  }
  afterTick(m); // the board goes up at 45, 90, 105 and 120
  if (m.full || m.minute >= 90) derive(m);
  // Knockout ties: extra time when the competition plays it, then penalties.
  if (knockout(m) && !m.pens && m.goals[0] === m.goals[1] && (periodOver(m, 3) || (periodOver(m, 1) && !needsExtra(m)))) shootout(m, get);
}
export { PERIOD_END };

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
  const r = rngFor(`${m.key}:shootout`, 0);
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

// `until` 90 (the default): to the final whistle, added time and extra time included. A smaller `until` stops there.
export function simulate(m: LiveMatch, get: Lookup, until = 90) {
  let guard = 0;
  if (until >= 90) { while (!playOver(m) && guard++ < 200) stepMinute(m, get); return; }
  while (m.minute < until && guard++ < 200) stepMinute(m, get);
}

export const isUserSide = (m: LiveMatch, c: Career) => (m.sides[0].clubId === c.clubId ? 0 : m.sides[1].clubId === c.clubId ? 1 : -1);
