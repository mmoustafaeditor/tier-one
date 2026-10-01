// Typed bridge to the shared rules engine (api/tier-one/v3/_lib). The server runs the same files.
import * as E0 from '../../../../../../api/tier-one/v3/_lib/engine.mjs';
import * as W0 from '../../../../../../api/tier-one/v3/_lib/world.mjs';
import * as WR0 from '../../../../../../api/tier-one/v3/_lib/wire.mjs';
import worldJson from '../data/world.json';

export type Act = ['a', number, string] | ['c', number, number, number] | ['u', number, number, number] | ['e'] | ['f', string, number];
export interface Clue { src: string; day: number; r: number; era: number; again?: boolean }
export interface Call { o: number; s: number; day: number; ut: boolean; two: boolean; from?: { o: number; s: number; day: number } }
export interface Post { i: number; id: string; day: number; claim: number }
export interface Twist { i: number; day: number; voided: Call | null; pen: number }
export interface Pub { day: number; left: number; posts7: number; over: boolean; clues: Clue[][]; calls: (Call | null)[]; pens: number[]; feed: Post[]; twist: Twist | null; noTwist: boolean; tips?: Record<number, number> }
export interface Source { cost: number; from: number; kind: 'own' | 'street'; says?: string[]; M?: number[][]; rel?: number; map?: number[] }
export interface Rules {
  SAGAS: number; DAYS: number; CONTACTS: number; DD_CONTACTS: number; DD_POSTS: number; DD_SECONDS: number; DD_SNAP: number;
  PRIOR: number[]; BASE: number[]; LOSS: number[]; EARLY: number[]; EXCL: number[]; UT_PEN: number[];
  SOURCES: Record<string, Source>; LEAK: Source; TIERS: { T1: number; T2: number; T3: number; T4: number };
  CIRCLE: Record<string, string>; TALLY: Record<string, number[][]>; CLAIM_TALLY: Record<string, number>;
  RIVALS: { id: string; days: number[]; p: number; rel: number; kind: string }[]; TW_M: number[][]; SPIN: number[][]; TWIST_DAY: number[][];
  SCORE_MIN: number; SCORE_MAX: number;
  PER?: Record<number, Record<string, Source>>; AGAIN?: string[]; FAVOURS?: boolean;
}
export interface BoardSaga { i: number; pre: number; truth: number; tw: number; spin: number[]; rivals: { id: string; day: number; claim: number }[] }
export interface Board { seed: string; sagas: BoardSaga[]; twI: number; twDay: number }
export interface Game extends Pub { board: Board; R: Rules; log: Act[] }
export interface Preview { base: number; early: number; excl: number; exclPossible: boolean; two: boolean; open: boolean; pen: number; win: number; lose: number; ut: boolean }
export interface ResultSaga {
  i: number; truth: number; pre: number; tw: number; spin: number; spinPre: number; pts: number; called: boolean; right: boolean; excl: boolean;
  why: 'uncalled' | 'wrong' | 'ok' | 'strength' | 'uturn' | 'twosource' | 'beaten';
  reads: (Clue & { right: boolean })[]; posts: (Post & { right: boolean })[]; firstRight: { id: string; day: number; claim: number } | null;
  call: Call | null; pen: number; parts: { base: number; early: number; excl: number; loss: number; pen: number };
}
export interface Result { total: number; tier: Tier; right: number; wrong: number; ex: number; called: number; uturns: number; row?: string; per: ResultSaga[]; cast?: CastSaga[]; rank?: number | null; players?: number; weekRank?: number | null; weekPlayers?: number; par?: number | null }
export type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'SPIKED';

export interface WClub { id: string; n: string; s: string; k: string; l: string; c1: string; c2: string }
export interface WPlayer { id: string; n: string; s: string; c: string; pos: string; no: number; nat: string; age: number; star: number }
export interface World { asOf: string; mode: string; clubs: WClub[]; players: WPlayer[]; buyers: string[] }
export interface CastSaga { i: number; player: WPlayer; from: WClub; to: WClub; alt?: WClub }

type EngineAPI = {
  OUT: string[]; RULES: Rules; SRC: string[]; RIVAL_IDS: string[];
  buildBoard(seed: string, R?: Rules): Board; newGame(b: Board, R?: Rules): Game; apply(g: Game, a: Act): boolean;
  replay(b: Board, log: Act[], R?: Rules): Game | null; pub(g: Game): Pub; resolve(g: Game): Result; finish(g: Game): Game; isOver(g: Game | Pub): boolean;
  askState(g: Game, i: number, src: string): 'none' | 'over' | 'asked' | 'closed' | 'broke' | 'ok';
  callState(g: Game, i: number): 'over' | 'called' | 'ddcap' | 'nosource' | 'ok';
  canUturn(g: Game, i: number): boolean; preview(g: Game, i: number, o: number, s: number): Preview;
  tally(g: Game, i: number): number[]; circlesFor(g: Game, i: number, o: number): Set<string>; curReads(g: Game, i: number): Clue[];
  livePosts(g: Game, i: number): Post[]; weights(R: Rules, key: string, r: number): number[]; srcOf(R: Rules, i: number, src: string): Source | null;
  sourcesFor(R: Rules, i: number): string[]; eraOf(s: { tw: number }, day: number): number; posterior(g: Game, i: number): number[];
  tierFor(total: number, ex: number, R?: Rules): Tier; gridRow(r: Result): string; exclusiveOpen(g: Game, i: number, o: number): boolean;
};
export const E = E0 as unknown as EngineAPI;
export const RULES = E.RULES;

type WorldAPI = { buildCast(seed: string, w: World, o?: { n?: number; pool?: 'top' | 'small' | 'stars'; maxStar?: number }): { sagas: { i: number; player: WPlayer; from: string; to: string; alt: string }[]; clubs: WClub[] } };
const W = W0 as unknown as WorldAPI;
export const WORLD = worldJson as World;
const CLUB = new Map(WORLD.clubs.map((c) => [c.id, c]));
export const clubById = (id: string) => CLUB.get(id);
export function castFor(seed: string, opts: Parameters<WorldAPI['buildCast']>[2] = {}): CastSaga[] {
  const c = W.buildCast(seed, WORLD, opts);
  return c.sagas.map((s) => ({ i: s.i, player: s.player, from: CLUB.get(s.from)!, to: CLUB.get(s.to)!, alt: CLUB.get(s.alt)! }));
}

type WireAPI = { WIRE: { DAILY_CALLS: number; OPEN_CALLS: number; CORRECT_MIN: number; FEE_BANDS: string[] }; marketOf(r: unknown): number };
export const WR = WR0 as unknown as WireAPI;

// A player-visible stand-in for the board: only the twist that has already happened is known.
export function shadow(p: Pub, R: Rules = RULES): Game {
  const sagas: BoardSaga[] = p.calls.map((_, i) => ({ i, pre: 0, truth: 0, tw: p.twist && p.twist.i === i ? p.twist.day : 0, spin: [0, 0], rivals: [] }));
  return { ...p, R, board: { seed: '', sagas, twI: p.twist ? p.twist.i : -1, twDay: p.twist ? p.twist.day : 0 }, log: [] };
}
export const OUTS = ['done', 'hijack', 'off', 'fake'] as const;
export const STRENGTHS = ['talks', 'advanced', 'confirmed'] as const;

// ---------- Tier One 4 "The Call" (games/tier-one/v3/RULES4.md). The v3 exports above stay until every screen has moved. ----------
import * as E40 from '../../../../../../api/tier-one/v3/_lib/engine4.mjs';
export type Act4 = ['a', number, string] | ['c', number, number, number] | ['e'];
export interface Clue4 { src: string; day: number; r: number }
export interface Call4 { o: number; s: number; day: number }
export interface Post4 { i: number; id: string; day: number; claim: number }
export interface Source4 { cost: number; from: number; kind: 'own' | 'street'; says?: string[]; M?: number[][]; rel?: number }
export interface Rules4 {
  STORIES: number; DAYS: number; CALLS: number[]; PRIOR: number[]; SPIN: number[][];
  WIN: number[]; LOSS: number[]; EARLY: number[]; SCOOP: number[];
  SOURCES: Record<string, Source4>; RIVALS: { id: string; days: number[]; p: number; kind: string; rel: number; boss?: Boss4 }[];
  TIERS: { T1: number; T2: number; T3: number; T4: number };
  /** Story mode: per-story contact overrides (Vince's clients' agent, Vince's planted contact). E4.srcOf reads them. */
  PER?: Record<number, Record<string, Source4 & { planted?: boolean }>>;
  /** Story mode: stories that are Vince's clients (the agent talks it up, @ITK_Kev posts a day early). */
  TAGGED?: number[];
  /** Deadline Day only: the clock, in seconds. */
  CLOCK_S?: number;
}
/** Every mode a driver can run (lib/driver.ts makeDriver). daily, room, practice and challenge play RULES4 exactly. */
export type Mode4 = 'daily' | 'practice' | 'career' | 'deadline' | 'room' | 'challenge' | 'tutorial';
/** A rule set that can travel (a saved window, a challenge): the mode and its knobs. E4.rulesOf(spec) rebuilds the rules. */
export interface RuleSpec4 { mode: Mode4; opts?: CareerOpts4 }
/** Story mode's bosses (engine4.mjs BOSSES): who they post as, and their p / rel / days by rank. */
export type Boss4 = 'bants' | 'kev' | 'pete' | 'roar' | 'vince';
/** Career rule knobs (engine4.mjs rulesFor 'career'). Everything past rank/trust is Story mode (CONCEPT4 §10, §16). */
export interface CareerOpts4 {
  rank?: number; trust?: Record<string, number>;
  /** The chapter's boss, and the rank their accuracy and speed scale with (defaults to rank). */
  boss?: Boss4; bossRank?: number;
  /** Contacts that exist this window (others answer 'none'). */
  contacts?: string[];
  /** Ordinary rival accounts that post (the boss is added on top). */
  rivals?: string[];
  /** Bought extra DMs on day 1 (0–2). */
  extraDm?: number;
  /** Vince's clients: story indexes where the agent talks the deal up and @ITK_Kev posts a day early. */
  tagged?: number[];
  /** Vince's play: the contact planted on story i (repeats the rumour mill whatever the truth). */
  planted?: { i: number; src: string };
  /** The finale: a Deadline Day window on this clock (seconds). */
  live?: number;
}
export interface Story4 { i: number; truth: number; spin: number; rivals: { id: string; day: number; claim: number }[] }
export interface Board4 { v: 4; seed: string; stories: Story4[] }
export interface Pub4 { v: 4; day: number; left: number; over: boolean; clues: Clue4[][]; calls: (Call4 | null)[]; feed: Post4[] }
export interface Game4 extends Omit<Pub4, 'v' | 'over'> { board: Board4; R: Rules4; log: Act4[] }
export interface Preview4 { win: number; lose: number; early: number; scoop: number }
export interface ResultStory4 {
  i: number; truth: number; spin: number; reads: (Clue4 & { right: boolean })[]; rivals: { id: string; day: number; claim: number; right: boolean }[];
  firstRight: { id: string; day: number; claim: number } | null; call: Call4 | null; pts: number; right: boolean; scoop: boolean;
  why: 'uncalled' | 'wrong' | 'scoop' | 'small' | 'beaten'; parts: { win: number; early: number; scoop: number; loss: number };
}
export interface Result4 { v: 4; total: number; right: number; wrong: number; scoops: number; called: number; per: ResultStory4[]; tier: Tier }
type Engine4API = {
  V: 4; OUT: string[]; RULES: Rules4; SRC: string[]; RIVAL_IDS: string[]; MODES: Mode4[];
  V4_FROM: string; isV4Day(ymd: string): boolean; TUTORIAL_SEED: string; DEADLINE_SECONDS: number;
  rulesFor(mode: Mode4, opts?: CareerOpts4): Rules4;
  specOf(mode: Mode4, opts?: CareerOpts4): RuleSpec4;
  BOSSES: Record<Boss4, { id: string; kind: 'own' | 'street'; t: [number, number, number, number][] }>;
  srcOf(R: Rules4, i: number, src: string): Source4 | undefined; rulesOf(spec: RuleSpec4 | null | undefined): Rules4;
  bounds(R?: Rules4): { min: number; max: number };
  buildBoard(seed: string, R?: Rules4): Board4; newGame(b: Board4, R?: Rules4): Game4; apply(g: Game4, a: Act4): boolean;
  replay(b: Board4, log: Act4[], R?: Rules4): Game4 | null; pub(g: Game4): Pub4; resolve(g: Game4): Result4; finish(g: Game4): Game4; isOver(g: Game4 | Pub4): boolean;
  ask(g: Game4, i: number, src: string): Clue4 | null; call(g: Game4, i: number, o: number, s: number): boolean; endDay(g: Game4): boolean;
  askState(g: Game4, i: number, src: string): 'none' | 'over' | 'asked' | 'closed' | 'broke' | 'ok';
  callState(g: Game4, i: number): 'none' | 'over' | 'called' | 'nosource' | 'ok';
  preview(g: Game4, i: number, o: number, s: number): Preview4; scoopOpen(g: Game4, i: number, o: number): boolean;
  posterior(g: Game4, i: number): number[]; tierFor(total: number, scoops: number, R?: Rules4): Tier;
  tierBars(R?: Rules4): { T1: number; T2: number; T3: number }; gridRow(r: Result4): string; readRight(R: Rules4, s: Story4, c: Clue4): boolean;
};
export const E4 = E40 as unknown as Engine4API;
export const RULES4 = E4.RULES;
export const OUTS4 = ['signs', 'elsewhere', 'stays'] as const;
export const BACKING = ['x1', 'x2', 'allin'] as const;
// Daily boards from this UTC date play by 4.0; older Dailies keep v3 so the archive still replays. One value, shared
// with the server (engine4.mjs V4_FROM).
export const V4_FROM: string = E4.V4_FROM;
export const isV4Day = (ymd: string) => ymd >= V4_FROM;
export const TUTORIAL_SEED: string = E4.TUTORIAL_SEED;

/** A local 4.0 window in the save (`save.v4.live[mode]`, lib/driver.ts): the seed, the rules it was started with and
 *  the action log, which is all a window is. Replaying the log through E4 on the same seed and rules gives the game back. */
export interface Window4 {
  seed: string; mode: Mode4; rules: RuleSpec4; log: Act4[]; started: number;
  label?: string; coach?: boolean;
  /** Deadline Day: when the clock started (first action); the window ends CLOCK_S after it. */
  clockAt?: number;
  /** A challenge being played: its code, so the finished log goes back to the server. */
  code?: string;
}
/** A finished local window, kept for Results, the share card and challenge minting (the last one per mode). */
export interface Last4 { mode: Mode4; seed: string; rules: RuleSpec4; log: Act4[]; total: number; tier: Tier; row: string; scoops: number; at: number; label?: string; code?: string }
/** Everything 4.0 keeps in the save, under one key. All optional: a 3.x save loads unchanged. */
export interface V4Save {
  live?: Partial<Record<Mode4, Window4 | null>>;
  last?: Partial<Record<Mode4, Last4>>;
  practice?: { coach?: boolean; played?: number; day?: string; today?: number };
  tutorial?: { done?: boolean };
  /** Daily results by UTC day for v4 days (`v: 4`); the archive of older days stays in `save.daily`. */
  daily?: Record<string, { no: number; total: number; tier: Tier; row: string; scoops: number; rank?: number | null; players?: number; par?: number | null }>;
  /** Market Tips (CONCEPT4 §9): tokens a right Market call pays (hold up to 3), spent in Story as a free extra. */
  tips?: number;
}

/** A player-visible stand-in for a v4 board: the public state plus the rules, with no truth in it. Every read-only
 *  engine call that doesn't need the truth (askState, callState, preview, scoopOpen, posterior) works on it, so the
 *  Daily's remote state can answer "what happens if I post this now" without a round trip. */
export function shadow4(p: Pub4, R: Rules4 = RULES4): Game4 {
  const stories: Story4[] = p.calls.map((_, i) => ({ i, truth: 0, spin: 0, rivals: [] }));
  return { day: p.day, left: p.left, clues: p.clues, calls: p.calls, feed: p.feed, R, board: { v: 4, seed: '', stories }, log: [] };
}
