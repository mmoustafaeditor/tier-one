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
  SOURCES: Record<string, Source4>; RIVALS: { id: string; days: number[]; p: number; kind: string; rel: number }[];
  TIERS: { T1: number; T2: number; T3: number; T4: number };
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
  V: 4; OUT: string[]; RULES: Rules4; SRC: string[]; RIVAL_IDS: string[];
  rulesFor(mode: 'daily' | 'deadline' | 'career', opts?: { rank?: number; trust?: Record<string, number> }): Rules4;
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
// Daily boards from this UTC date play by 4.0; older Dailies keep v3 so the archive still replays.
export const V4_FROM = '2026-10-05';
export const isV4Day = (ymd: string) => ymd >= V4_FROM;
