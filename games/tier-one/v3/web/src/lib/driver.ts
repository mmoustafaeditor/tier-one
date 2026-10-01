// One window, whoever holds the truth. 4.0 (RULES4.md §2): every mode is the same game on engine4 with different knobs,
// and this file is the one way a screen plays it: makeDriver({ mode, … }) → a Driver4.
//
//   Remote (the Daily, a room round): the server holds the board and scores the log (api/tier-one/v3 daily.*). The
//   driver mirrors the public state and answers the read-only questions (preview, askState, scoopOpen) from a shadow
//   of it, so the post screen never waits on the network.
//   Local (Practice, Career, Deadline Day, a challenge, the first window): the engine runs here, the action log lives
//   in the save under `v4.live[mode]` and is replayed on resume. Nothing ranked depends on a local window; a challenge's
//   log goes to the server, which replays it under the same rules.
//
// Usage (the play lane):
//   const d = makeDriver({ mode: 'practice', coach: true });   // or { mode: 'daily' }, { mode: 'career' }, { mode: 'deadline' } …
//   await d.start();                                           // remote: loads; local: immediate
//   const clue = await d.ask(i, 'kitman');                     // null + d.error() when the rules say no
//   d.preview(i, o, s)  →  { win, lose, early, scoop }         // "Win 46 if he signs. Lose 60 if he doesn't."
//   await d.post(i, o, s); await d.endDay(); d.isOver(); d.result()
//   useSyncExternalStore(d.subscribe, d.version)               // re-render after every change
import {
  E4, RULES4, castFor, shadow4, TUTORIAL_SEED,
  type Act4, type CastSaga, type Clue4, type Game4, type Pub4, type Preview4, type Result4, type Rules4, type Mode4, type RuleSpec4, type Window4, type Last4, type Tier,
} from './engine';
import { v3 } from './api';
import { getSave, update, type Save } from './save';
import { RANKS, careerTrust } from './career';
import { tr } from './i18n';

export type { Mode4 };
// 3.x screens still construct the v3 driver until the play lane moves; it lives in driver3.ts (legacy, replay only).
export { remoteDriver, localDriver, practiceRules, type Driver, type View, type ActOut, type Mode, type RoomRef } from './driver3';
import type { RoomRef } from './driver3';
export type AskState = 'none' | 'over' | 'asked' | 'closed' | 'broke' | 'ok';
export type CallState = 'none' | 'over' | 'called' | 'nosource' | 'ok';
/** A finished window as a screen shows it: the engine's result plus the row, the cast and (ranked) the placing. */
export interface Outcome4 extends Result4 { row: string; cast: CastSaga[]; no?: number; rank?: number | null; players?: number; weekRank?: number | null; weekPlayers?: number; par?: number | null }
export type DriverError = 'net' | 'offline' | 'rule' | 'clock' | 'done' | 'version' | 'dev' | string;

export interface DriverOpts {
  mode: Mode4;
  /** Local modes: the board's seed. Missing: a random one (the tutorial always plays TUTORIAL_SEED). */
  seed?: string;
  /** Local modes: the rules. Missing: by mode (career reads rank and trust from the save; tutorial = career rank 0). */
  rules?: RuleSpec4;
  /** Local modes: who the stories are about. Missing: castFor(seed) sized by the rules. */
  cast?: CastSaga[];
  /** Room rounds: which room and round. */
  room?: RoomRef;
  label?: string;
  /** Show the exact odds (E4.posterior). Practice reads save.v4.practice.coach; the tutorial is always on; never ranked. */
  coach?: boolean;
  /** A challenge being played: its code. */
  code?: string;
  /** Pick up the live window of this mode from the save (default true). false starts over on `seed`. */
  resume?: boolean;
  /** Called once when the window ends (local: at once; remote: when the server's result lands). */
  onDone?: (r: Outcome4, d: Driver4) => void;
}
export interface Driver4 {
  readonly mode: Mode4; readonly remote: boolean; readonly seed: string; readonly R: Rules4; readonly cast: CastSaga[];
  readonly label?: string; readonly room?: RoomRef; readonly code?: string;
  /** The Daily's number (remote, after start()). */
  readonly no?: number;
  /** The Coach: exact odds for story i from what the player can see. Only on Practice and the first window. */
  readonly coach?: (i: number) => number[];
  start(): Promise<Pub4 | null>;
  pub(): Pub4;
  ask(i: number, src: string): Promise<Clue4 | null>;
  post(i: number, o: number, s: number): Promise<boolean>;
  endDay(): Promise<boolean>;
  /** End every remaining day now. */
  finish(): Promise<Outcome4 | null>;
  isOver(): boolean;
  /** Sealed until the window is over (remote: until the server has scored it). */
  result(): Outcome4 | null;
  preview(i: number, o: number, s: number): Preview4;
  askState(i: number, src: string): AskState;
  callState(i: number): CallState;
  scoopOpen(i: number, o: number): boolean;
  /** Deadline Day: when the clock runs out (ms since epoch), once it has started. */
  clock(): number | null;
  log(): Act4[];
  /** The last failure ('rule', 'net', 'clock', 'done', 'version' …), cleared by the next success. */
  error(): DriverError | null;
  subscribe(fn: () => void): () => void;
  version(): number;
}

export const isRemote = (mode: Mode4) => mode === 'daily' || mode === 'room';
export function randomSeed() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const b = new Uint8Array(6); crypto.getRandomValues(b); for (const x of b) s += a[x % a.length]; return s; }

/** Trust per contact for Career rules: the Contacts Book level (1–5) as 0…1 (lib/career.ts careerTrust). */
export function trustFor(s: Save = getSave()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of E4.SRC) { const t = (careerTrust(s, k) - 1) / 4; if (t > 0) out[k] = Math.round(t * 100) / 100; }
  return out;
}
/** The rule spec a mode plays by default. */
export function specFor(mode: Mode4, s: Save = getSave()): RuleSpec4 {
  if (mode === 'career') return E4.specOf('career', { rank: s.career ? s.career.rank : 0, trust: trustFor(s) });
  return E4.specOf(mode);
}
/** The cast a local window gets when none is passed: the Daily's pool, Career's pool by rank, small names for the first window. */
export function castForSpec(seed: string, spec: RuleSpec4, R: Rules4 = E4.rulesOf(spec)): CastSaga[] {
  if (spec.mode === 'tutorial') return castFor(seed, { n: R.STORIES, pool: 'small', maxStar: 2 });
  if (spec.mode === 'career') { const rk = RANKS[Math.min(RANKS.length - 1, spec.opts?.rank || 0)]; return castFor(seed, { n: R.STORIES, pool: rk.pool, ...(rk.pool === 'small' ? { maxStar: 2 } : {}) }); }
  return castFor(seed, { n: R.STORIES });
}
export const liveWindow = (mode: Mode4, s: Save = getSave()): Window4 | null => (s.v4 && s.v4.live && s.v4.live[mode]) || null;
export const lastWindow = (mode: Mode4, s: Save = getSave()): Last4 | null => (s.v4 && s.v4.last && s.v4.last[mode]) || null;
/** Days into a live window, for "Resume · day 3" cards. */
export const dayOfLog = (log: Act4[]) => log.filter((a) => a[0] === 'e').length + 1;

export function makeDriver(o: DriverOpts): Driver4 { return isRemote(o.mode) ? remote(o) : local(o); }

// ---------------------------------------------------------------- the shared skeleton
type Core = { subs: Set<() => void>; ver: number; err: DriverError | null; bump(): void };
const core = (): Core => { const c: Core = { subs: new Set(), ver: 0, err: null, bump() { c.ver++; c.subs.forEach((f) => f()); } }; return c; };
const outcome = (g: Game4, cast: CastSaga[]): Outcome4 => { const r = E4.resolve(g); return { ...r, row: E4.gridRow(r), cast }; };

// ---------------------------------------------------------------- local windows
function local(o: DriverOpts): Driver4 {
  const s = getSave(), c = core();
  const prev = o.resume === false ? null : liveWindow(o.mode, s);
  const spec: RuleSpec4 = prev ? prev.rules : o.rules || specFor(o.mode, s);
  const seed = o.mode === 'tutorial' ? TUTORIAL_SEED : prev ? prev.seed : o.seed || (o.mode === 'career' ? 'car-' : '') + randomSeed();
  const R = E4.rulesOf(spec);
  const cast = o.cast && o.cast.length === R.STORIES ? o.cast : castForSpec(seed, spec, R);
  const board = E4.buildBoard(seed, R);
  const w: Window4 = prev || { seed, mode: o.mode, rules: spec, log: [], started: Date.now(), label: o.label, coach: o.mode === 'tutorial' ? true : o.coach ?? (o.mode === 'practice' ? s.v4?.practice?.coach !== false : false), code: o.code };
  const g = E4.replay(board, w.log, R) || E4.newGame(board, R);
  let settled = false, res: Outcome4 | null = null;
  const coachOn = !!w.coach && !isRemote(o.mode);
  const persist = () => {
    w.log = g.log.slice();
    update((x) => {
      const v = (x.v4 = x.v4 || {}); v.live = v.live || {};
      if (!E4.isOver(g)) { v.live[o.mode] = { ...w }; return; }
      v.live[o.mode] = null;
      const r = res || outcome(g, cast);
      v.last = v.last || {};
      v.last[o.mode] = { mode: o.mode, seed, rules: spec, log: g.log.slice(), total: r.total, tier: r.tier as Tier, row: r.row, scoops: r.scoops, at: Date.now(), label: w.label, code: w.code };
      if (o.mode === 'practice') { const p = (v.practice = v.practice || {}); const day = new Date().toISOString().slice(0, 10); if (p.day !== day) { p.day = day; p.today = 0; } p.today = (p.today || 0) + 1; p.played = (p.played || 0) + 1; }
      if (o.mode === 'tutorial') v.tutorial = { ...(v.tutorial || {}), done: true };
    });
  };
  const settle = () => { if (settled || !E4.isOver(g)) return; settled = true; res = outcome(g, cast); persist(); o.onDone?.(res, d); c.bump(); };
  const clockEnd = () => (R.CLOCK_S && w.clockAt ? w.clockAt + R.CLOCK_S * 1000 : null);
  // Deadline Day: once the clock (plus a breath of grace) has run out, the window ends whatever was tapped.
  const late = () => { const e = clockEnd(); if (e == null || Date.now() <= e + 1500 || E4.isOver(g)) return false; E4.finish(g); c.err = 'clock'; settle(); return true; };
  const act = (a: Act4): boolean => {
    if (E4.isOver(g)) { c.err = 'done'; return false; }
    if (late()) return false;
    if (R.CLOCK_S && !w.clockAt) w.clockAt = Date.now();
    const ok = E4.apply(g, a);
    c.err = ok ? null : 'rule';
    if (ok) { if (E4.isOver(g)) settle(); else persist(); c.bump(); }
    return ok;
  };
  const d: Driver4 = {
    mode: o.mode, remote: false, seed, R, cast, label: w.label, code: w.code,
    ...(coachOn ? { coach: (i: number) => E4.posterior(g, i) } : {}),
    // A new window is in the save from the moment it starts (so Home's "Resume" and a friend's code see it).
    async start() { const fresh = !prev; if (R.CLOCK_S && !w.clockAt && !E4.isOver(g)) w.clockAt = Date.now(); if (E4.isOver(g)) settle(); else if (!late() && (fresh || R.CLOCK_S)) persist(); c.bump(); return E4.pub(g); },
    pub: () => E4.pub(g),
    async ask(i, src) { const n = g.clues[i] ? g.clues[i].length : 0; return act(['a', i, src]) ? g.clues[i][n] : null; },
    async post(i, o2, s2) { return act(['c', i, o2, s2]); },
    async endDay() { return act(['e']); },
    async finish() { if (!E4.isOver(g)) { E4.finish(g); c.err = null; settle(); } return res; },
    isOver: () => E4.isOver(g),
    result: () => (E4.isOver(g) ? res || (res = outcome(g, cast)) : null),
    preview: (i, o2, s2) => E4.preview(g, i, o2, s2),
    askState: (i, src) => E4.askState(g, i, src),
    callState: (i) => E4.callState(g, i),
    scoopOpen: (i, o2) => E4.scoopOpen(g, i, o2),
    clock: clockEnd,
    log: () => g.log.slice(),
    error: () => c.err,
    subscribe: (fn) => { c.subs.add(fn); return () => { c.subs.delete(fn); }; },
    version: () => c.ver,
  };
  return d;
}

// ---------------------------------------------------------------- the Daily and room rounds (the server scores)
type Remote = { ok: boolean; error?: string; v?: number; cast?: CastSaga[]; state?: Pub4; done?: boolean; result?: Outcome4; no?: number; answer?: Clue4 };
function remote(o: DriverOpts): Driver4 {
  const c = core(), R = RULES4;
  const who = () => { const s = getSave(); return o.room ? { room: o.room } : { dev: s.dev, nick: s.nick }; };
  let p: Pub4 = { v: 4, day: 1, left: R.CALLS[0], over: false, clues: [], calls: [], feed: [] };
  let sg: Game4 = shadow4(p, R), cast: CastSaga[] = [], res: Outcome4 | null = null, no: number | undefined, told = false, seed = '';
  const take = (r: Remote): boolean => {
    if (r.error) c.err = r.error; else c.err = null;
    if (!r.state || !r.cast) { if (!c.err) c.err = 'net'; return false; }
    if (r.v !== 4 || r.state.v !== 4) { c.err = 'version'; return false; }
    p = r.state; sg = shadow4(p, R); cast = r.cast; no = r.no; seed = o.room ? 'room-' + o.room.code + '-r' + (o.room.round + 1) : 'daily';
    if (r.result && r.done) { res = { ...r.result, cast: r.result.cast || cast, no }; if (!told) { told = true; o.onDone?.(res, d); } }
    c.bump();
    return true;
  };
  const act = async (a: Act4): Promise<Remote> => {
    const r = (await v3<Remote>('daily.act', { ...who(), act: a })) as unknown as Remote;
    take(r); return r;
  };
  const d: Driver4 = {
    mode: o.mode, remote: true, get seed() { return seed; }, R, get cast() { return cast; }, label: o.label, room: o.room, get no() { return no; },
    async start() { const r = (await v3<Remote>('daily.start', who())) as unknown as Remote; return take(r) ? p : null; },
    pub: () => p,
    async ask(i, src) { const r = await act(['a', i, src]); return r.ok && r.answer ? r.answer : null; },
    async post(i, o2, s2) { return (await act(['c', i, o2, s2])).ok; },
    async endDay() { return (await act(['e'])).ok; },
    async finish() {
      for (let k = 0; k < 3; k++) { const r = (await v3<Remote>('daily.finish', who(), 15000)) as unknown as Remote; if (take(r)) break; }
      return res;
    },
    isOver: () => !!res || p.over,
    result: () => res,
    preview: (i, o2, s2) => E4.preview(sg, i, o2, s2),
    askState: (i, src) => E4.askState(sg, i, src),
    callState: (i) => E4.callState(sg, i),
    scoopOpen: (i, o2) => E4.scoopOpen(sg, i, o2),
    clock: () => null,
    log: () => [],
    error: () => c.err,
    subscribe: (fn) => { c.subs.add(fn); return () => { c.subs.delete(fn); }; },
    version: () => c.ver,
  };
  return d;
}

// ---------------------------------------------------------------- the Coach's words (Practice, the first window)
/** Odds in words a person reads at a glance: "about 7 in 10". Never a percentage, never a decimal (RULES4.md §4). */
export function oddsWords(lang: string, p: number): string {
  const n = Math.round(Math.max(0, Math.min(1, p)) * 10);
  if (p < 0.05) return tr(lang, 'coach4.low');
  if (p > 0.95) return tr(lang, 'coach4.high');
  return tr(lang, 'coach4.about', { n: Math.max(1, Math.min(9, n)) });
}
/** The Coach's line for a story: the leading ending and its odds, e.g. "SIGNS · about 7 in 10". */
export function coachLine(lang: string, post: number[]): { o: number; p: number; words: string } {
  const o = post.indexOf(Math.max(...post)), p = post[o] || 0;
  return { o, p, words: oddsWords(lang, p) };
}
