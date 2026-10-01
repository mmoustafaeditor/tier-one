// V2.9 press conferences (V2_DESIGN §3.7, smallest fun version): rare, short, and they matter. A presser happens only
// when there's a reason (sim/pressDecisions.ts): before a big match (a derby, a top-three clash, a cup final) or after
// a controversy (a red card, a heavy defeat, a lost derby). At most one a matchweek, up to three questions, three tones
// each (Confident, Measured, Deflect) plus "name a player" where it fits. Unanswered questions lapse: the assistant
// answers Measured, which costs nothing.
//
// What the answers do (applied when you answer, except the public claim, settled by the next result against that side):
//   predict  Confident: squad morale +2 and a public claim; Deflect: fans −1
//   star     Confident (back the named player): his morale +4, trust +3; Measured ("it's the team"): squad morale +1
//   rival    Confident (fire back): fans +2 and a public claim; Deflect: fans −1
//   blame    Confident ("on me"): squad morale +2, board −2; Deflect: fans −2; Name (criticise him): his morale −8 if
//            volatile, else −4, his trust −5, fans +1
//   ref      Confident (go after the referee): fans +2, board −2; Deflect: fans −1
// A public claim followed by a defeat costs board −3 and fans −4 on top of the result; a win after it gives fans +2.
import type { Career, Player } from '../model/types';
import { clamp } from './rng';
import { squadOf, type World } from './world';
import { archetypeOf, trustOf } from './room';

export type PressQ = 'predict' | 'star' | 'rival' | 'blame' | 'ref';
export type PressTone = 'confident' | 'measured' | 'deflect' | 'name';
export interface PressClaim { oppId: string; season: number; round: number }

export const CLAIM_LOSS = { board: 3, fans: 4 };
export const CLAIM_WIN_FANS = 2;
export const NAMED_CRITIC = { volatile: 8, other: 4, trust: 5 };

// The effects of one answer, as numbers (the UI shows them before you answer; `answer` applies exactly these).
export interface PressFx { squad?: number; board?: number; fans?: number; morale?: number; trust?: number; claim?: boolean }
export function pressFx(q: PressQ, tone: PressTone, named?: Pick<Player, 'id'>): PressFx {
  switch (q) {
    case 'predict': return tone === 'confident' ? { squad: 2, claim: true } : tone === 'deflect' ? { fans: -1 } : {};
    case 'star': return tone === 'confident' ? { morale: 4, trust: 3 } : tone === 'measured' ? { squad: 1 } : {};
    case 'rival': return tone === 'confident' ? { fans: 2, claim: true } : tone === 'deflect' ? { fans: -1 } : {};
    case 'blame':
      if (tone === 'confident') return { squad: 2, board: -2 };
      if (tone === 'deflect') return { fans: -2 };
      if (tone === 'name') return { morale: -(named && archetypeOf(named) === 'volatile' ? NAMED_CRITIC.volatile : NAMED_CRITIC.other), trust: -NAMED_CRITIC.trust, fans: 1 };
      return {};
    case 'ref': return tone === 'confident' ? { fans: 2, board: -2 } : tone === 'deflect' ? { fans: -1 } : {};
  }
}

// Apply one answer. `pid` is the named player (star, blame), `opp` the next opponent (for a claim).
export function answer(w: World, c: Career, q: PressQ, tone: PressTone, pid?: string, opp?: string): { world: World; career: Career } {
  const named = pid ? w.players.find((p) => p.id === pid && p.clubId === c.clubId) : undefined;
  const fx = pressFx(q, tone, named);
  const squad = fx.squad ? new Set(squadOf(w, c.clubId).map((p) => p.id)) : null;
  const touch = squad || ((fx.morale || fx.trust) && named);
  const world = touch ? {
    ...w,
    players: w.players.map((p) => {
      let x = p;
      if (squad?.has(p.id)) x = { ...x, morale: clamp(x.morale + fx.squad!, 0, 100), dm: [fx.squad!, 'press'] as [number, string] };
      if (named && p.id === named.id) {
        if (fx.morale) x = { ...x, morale: clamp(x.morale + fx.morale, 0, 100), dm: [fx.morale, 'press'] as [number, string] };
        if (fx.trust) { const t = clamp(trustOf(x) + fx.trust, 0, 100); x = { ...x, trust: t, dt: [t - trustOf(p), 'press'] as [number, string] }; }
      }
      return x;
    }),
  } : w;
  const board = { confidence: clamp(c.board.confidence + (fx.board ?? 0), 0, 100), fans: clamp(c.board.fans + (fx.fans ?? 0), 0, 100) };
  const claim = fx.claim && opp ? { oppId: opp, season: c.season, round: c.round } : c.claim;
  return { world, career: { ...c, board, claim } };
}

// The next result against the side we made a claim about settles it (any other result leaves it standing until the
// season ends). Called with the user's points from that match.
export function settleClaim(c: Career, oppId: string, pts: number): Career {
  if (!c.claim || c.claim.oppId !== oppId || c.claim.season !== c.season) return c.claim && c.claim.season !== c.season ? { ...c, claim: undefined } : c;
  const board = pts === 0
    ? { confidence: clamp(c.board.confidence - CLAIM_LOSS.board, 0, 100), fans: clamp(c.board.fans - CLAIM_LOSS.fans, 0, 100) }
    : pts === 3 ? { ...c.board, fans: clamp(c.board.fans + CLAIM_WIN_FANS, 0, 100) } : c.board;
  return { ...c, board, claim: undefined };
}
