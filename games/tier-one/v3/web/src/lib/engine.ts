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
  SAGAS: number; DAYS: number; CONTACTS: number; ROLLOVER?: number; DD_CONTACTS: number; DD_POSTS: number; DD_SECONDS: number; DD_SNAP: number;
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
