// The club stage (V2_DESIGN §3.4): the selling club's price and its answer to a bid.
//  - reservation R = value × importance (1.1 / 1.3 / 1.5 by squad rank) × contract (≤1 year left 0.75, 2 years 0.9)
//    × stance (selling to a rival 1.2) × prices setting × a seeded 0.95–1.05. The visible asking price is 1.1 × R.
//  - bid value E = upfront + Σ instalment × 0.92^years + sell-on % × value × 0.4
//  - answer: accept at E ≥ R; counter at E ≥ 0.75 R (first counter halfway to the asking price, later ones at R);
//    "not interested" below that; under 0.6 R is an insult (−2 patience). Three bids, then talks freeze for 5 matchdays.
import { FREE_AGENT, type Career, type Player } from '../../model/types';
import { rngFor } from '../rng';
import { squadOf, type World } from '../world';
import { balanceOf } from '../balance';
import { roundFee } from '../season';
import type { ClubOffer } from './state';

export const CLUB_PATIENCE = 3;
export const FREEZE = 5;
export const INST_DISCOUNT = 0.92;
export const MIN_UPFRONT = 0.4;
export const SELL_ON_W = 0.4;
export const SELL_ONS = [0, 0.1, 0.15, 0.2] as const;

export const nominal = (o: ClubOffer) => o.upfront + o.inst.reduce((s, x) => s + x, 0);

export function importance(w: World, p: Player): number {
  const rank = squadOf(w, p.clubId).sort((a, b) => b.rating - a.rating).findIndex((x) => x.id === p.id);
  return rank < 3 ? 1.5 : rank < 11 ? 1.3 : 1.1;
}

export function isRival(w: World, a: string, b: string): boolean {
  const A = w.clubs.find((x) => x.id === a), B = w.clubs.find((x) => x.id === b);
  return !!A && !!B && A.leagueId === B.leagueId && Math.abs(A.reputation - B.reputation) <= 10;
}

export function reservation(w: World, c: Career, p: Player): number {
  if (p.clubId === FREE_AGENT) return 0;
  const left = p.contractUntil - c.season;
  const contract = left <= 1 ? 0.75 : left === 2 ? 0.9 : 1;
  const stance = isRival(w, p.clubId, c.clubId) ? 1.2 : 1;
  const noise = 0.95 + rngFor(c.seed, 'reserve', p.id, c.season)() * 0.1;
  return Math.round(p.marketValue * importance(w, p) * contract * stance * balanceOf(c).prices * noise);
}

export const askOf = (w: World, c: Career, p: Player) => roundFee(reservation(w, c, p) * 1.1);

export const bidValue = (o: ClubOffer, value: number) =>
  o.upfront + o.inst.reduce((s, x, i) => s + x * Math.pow(INST_DISCOUNT, i + 1), 0) + o.sellOn * value * SELL_ON_W;

export type ClubAnswer = { k: 'accept' } | { k: 'counter'; fee: number } | { k: 'reject'; insult: boolean };
export function answerBid(R: number, ask: number, E: number, round: number): ClubAnswer {
  if (E >= R) return { k: 'accept' };
  if (E >= 0.75 * R) return { k: 'counter', fee: roundFee(round <= 1 ? (R + ask) / 2 : R) };
  return { k: 'reject', insult: E < 0.6 * R };
}

// An offer that is valid in shape: some money now, at least 40 % of the fee up front, at most two more seasons.
export function offerShapeOk(o: ClubOffer): boolean {
  if (!(o.upfront >= 0) || o.inst.length > 2 || o.inst.some((x) => !(x >= 0))) return false;
  if (!(SELL_ONS as readonly number[]).includes(o.sellOn)) return false;
  const total = nominal(o);
  return total > 0 && o.upfront >= MIN_UPFRONT * total - 1;
}

// An even split of a fee: `n` instalments after the upfront part.
export function split(total: number, n: number, upShare = n ? 0.5 : 1): ClubOffer {
  const up = roundFee(total * upShare);
  const rest = total - up;
  const inst = n ? Array.from({ length: n }, (_, i) => (i < n - 1 ? roundFee(rest / n) : 0)) : [];
  if (n) inst[n - 1] = Math.max(0, rest - inst.slice(0, -1).reduce((s, x) => s + x, 0));
  return { upfront: up, inst, sellOn: 0 };
}

// The asking price for many players at once (Search sorts thousands): the same formula with the squad ranks done once.
export function askAll(w: World, c: Career): (p: Player) => number {
  const rank = new Map<string, number>();
  const byClub = new Map<string, Player[]>();
  for (const p of w.players) (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p);
  for (const ps of byClub.values()) ps.sort((a, b) => b.rating - a.rating).forEach((p, i) => rank.set(p.id, i));
  const m = balanceOf(c).prices;
  const clubs = new Map(w.clubs.map((x) => [x.id, x]));
  const me = clubs.get(c.clubId);
  const rival = (id: string) => { const x = clubs.get(id); return !!x && !!me && x.leagueId === me.leagueId && Math.abs(x.reputation - me.reputation) <= 10; };
  return (p: Player) => {
    if (p.clubId === FREE_AGENT) return 0;
    const r = rank.get(p.id) ?? 20;
    const left = p.contractUntil - c.season;
    const R = p.marketValue * (r < 3 ? 1.5 : r < 11 ? 1.3 : 1.1) * (left <= 1 ? 0.75 : left === 2 ? 0.9 : 1) * (rival(p.clubId) ? 1.2 : 1) * m * (0.95 + rngFor(c.seed, 'reserve', p.id, c.season)() * 0.1);
    return roundFee(R * 1.1);
  };
}
