// Transfers and contracts for the user's club.
// E2E lessons: a bid always gets a clear answer and a reason (#7), the fee charged is exactly the agreed fee (#22),
// the fee box starts at a sensible number (#21), and counters update after a renewal (#20).
import { FREE_AGENT, type Career, type Deal, type Offer, type Player } from '../model/types';
import { freeShirt, squadOf, wageOf, type World } from './world';
import { roundFee } from './season';
import { addNews, hijacked } from './news';
import { balanceOf } from './balance';
import { recordDeal } from './records';

export const SQUAD_MAX = 32;
export const SQUAD_SELL_MIN = 16;

export type Role = 'star' | 'regular' | 'rotation' | 'prospect';
const ROLE_WAGE: Record<Role, number> = { star: 1, regular: 1.05, rotation: 1.15, prospect: 1.1 };

const leagueOfClub = (w: World, clubId: string) => w.clubs.find((c) => c.id === clubId)?.leagueId ?? 'eng2';
export const clubOf = (w: World, clubId: string) => w.clubs.find((c) => c.id === clubId);

// What the selling club wants. Key players cost more; free agents cost nothing.
export function askingPrice(w: World, p: Player, m = 1): number {
  if (p.clubId === FREE_AGENT) return 0;
  const squad = squadOf(w, p.clubId).sort((a, b) => b.rating - a.rating);
  const rank = squad.findIndex((x) => x.id === p.id);
  const importance = rank < 3 ? 1.5 : rank < 11 ? 1.3 : 1.1;
  return roundFee(p.marketValue * importance * m);
}

// Asking price of every player at once (the market filters thousands of players).
export function askingPrices(w: World, m = 1): Map<string, number> {
  const byClub = new Map<string, Player[]>();
  for (const p of w.players) (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p);
  const out = new Map<string, number>();
  for (const [clubId, ps] of byClub) {
    if (clubId === FREE_AGENT) { for (const p of ps) out.set(p.id, 0); continue; }
    ps.sort((a, b) => b.rating - a.rating).forEach((p, rank) => out.set(p.id, roundFee(p.marketValue * (rank < 3 ? 1.5 : rank < 11 ? 1.3 : 1.1) * m)));
  }
  return out;
}

// Monthly wage the player asks for at the user's club.
export function wageDemand(w: World, p: Player, toClubId: string, role: Role, m = 1): number {
  const base = Math.max(p.wage * 1.1, wageOf(p.marketValue, leagueOfClub(w, toClubId)));
  return roundFee(base * ROLE_WAGE[role] * m);
}

export const wageBillOf = (w: World, clubId: string) => squadOf(w, clubId).reduce((s, p) => s + p.wage, 0);
const strengthOfClub = (w: World, clubId: string) => {
  const best = squadOf(w, clubId).map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return best.reduce((s, x) => s + x, 0) / Math.max(1, best.length);
};

export interface Bid { fee: number; wage: number; years: number; role: Role }
export type BidAnswer =
  | { ok: true }
  | { ok: false; reason: 'budget' | 'wageCap' | 'squadFull' | 'fee' | 'wage' | 'ambition' | 'role' | 'injured'; counter?: number };

// One clear answer for every bid.
export function judgeBid(w: World, c: Career, p: Player, bid: Bid): BidAnswer {
  const club = clubOf(w, c.clubId)!;
  if (squadOf(w, c.clubId).length >= SQUAD_MAX) return { ok: false, reason: 'squadFull' };
  // Stars won't drop far below their level: say so first, whatever the money.
  if (p.rating > strengthOfClub(w, c.clubId) + 9) return { ok: false, reason: 'ambition' };
  if (bid.fee > club.budget) return { ok: false, reason: 'budget' };
  if (wageBillOf(w, c.clubId) + bid.wage > club.wageCap) return { ok: false, reason: 'wageCap' };
  const ask = askingPrice(w, p, balanceOf(c).prices);
  if (bid.fee < ask * 0.95) return { ok: false, reason: 'fee', counter: ask };
  if (bid.role === 'prospect' && c.season - p.birthYear > 21) return { ok: false, reason: 'role' };
  const want = wageDemand(w, p, c.clubId, bid.role, balanceOf(c).wages);
  if (bid.wage < want * 0.97) return { ok: false, reason: 'wage', counter: want };
  return { ok: true };
}

// Moves a player between clubs (or from free agency) and records the deal.
// `years` counts this season: a 3-year deal signed in 2026 runs until the summer of 2029.
function move(w: World, c: Career, p: Player, to: string, fee: number, wage: number, years: number): { world: World; career: Career } {
  const from = p.clubId;
  const clubs = w.clubs.map((x) => (x.id === to ? { ...x, budget: x.budget - fee } : x.id === from ? { ...x, budget: x.budget + fee } : x));
  const shirt = freeShirt(w, to, p.position);
  const players = w.players.map((x) =>
    x.id === p.id ? { ...x, clubId: to, wage, contractUntil: c.season + years, shirtNumber: shirt, listed: undefined, morale: Math.min(100, x.morale + 10) } : x);
  const kind: Deal['kind'] = to === c.clubId ? (from === FREE_AGENT ? 'free' : 'in') : 'out';
  const deal: Deal = { season: c.season, playerId: p.id, name: p.name, from, to, fee, kind };
  const ledger = c.ops ? { ...c.ops.ledger } : null;
  if (ledger && fee) {
    if (to === c.clubId) ledger.transfersIn = (ledger.transfersIn ?? 0) - fee;
    else if (from === c.clubId) ledger.transfersOut = (ledger.transfersOut ?? 0) + fee;
  }
  return {
    world: { ...w, clubs, players },
    career: recordDeal({ ...c, deals: [deal, ...c.deals], offers: c.offers.filter((o) => o.playerId !== p.id), ...(ledger ? { ops: { ...c.ops, ledger } } : {}) }, deal),
  };
}

export function buy(w: World, c: Career, p: Player, bid: Bid) {
  const r = move(w, c, p, c.clubId, bid.fee, bid.wage, bid.years);
  // Signing a player other clubs were chasing ends that rumour (a hijack).
  const career = addNews(hijacked(r.career, p.id), 'transfers', 'userSign', { player: p.id, pn: p.name, club: c.clubId, club2: p.clubId, s: String(bid.fee) });
  return { world: r.world, career };
}

export type SellCheck = { ok: true } | { ok: false; reason: 'squadMin' | 'buyerBudget' };

export function canSell(w: World, c: Career, o: Offer): SellCheck {
  if (squadOf(w, c.clubId).length <= SQUAD_SELL_MIN) return { ok: false, reason: 'squadMin' };
  if ((clubOf(w, o.clubId)?.budget ?? 0) < o.fee) return { ok: false, reason: 'buyerBudget' };
  return { ok: true };
}

export function acceptOffer(w: World, c: Career, o: Offer) {
  const p = w.players.find((x) => x.id === o.playerId)!;
  const years = Math.max(2, p.contractUntil - c.season);
  const r = move(w, c, p, o.clubId, o.fee, Math.max(p.wage, wageOf(p.marketValue, leagueOfClub(w, o.clubId))), years);
  return { world: r.world, career: addNews(r.career, 'transfers', 'userSell', { player: p.id, pn: p.name, club: o.clubId, club2: c.clubId, s: String(o.fee) }) };
}

export const rejectOffer = (c: Career, o: Offer): Career => ({ ...c, offers: c.offers.filter((x) => x.id !== o.id) });

// Counter-offer: the buyer meets a raise of up to ~25% over market value, otherwise walks away.
export function counterOffer(c: Career, o: Offer, p: Player, fee: number, roll: number): { career: Career; accepted: boolean } {
  const limit = p.marketValue * (1.1 + roll * 0.25);
  if (fee <= limit) return { career: { ...c, offers: c.offers.map((x) => (x.id === o.id ? { ...x, fee: roundFee(fee) } : x)) }, accepted: true };
  return { career: rejectOffer(c, o), accepted: false };
}

export const setListed = (w: World, id: string, listed: boolean): World =>
  ({ ...w, players: w.players.map((p) => (p.id === id ? { ...p, listed: listed || undefined } : p)) });

// ---------- contracts ----------

export const expiring = (w: World, c: Career) => squadOf(w, c.clubId).filter((p) => p.contractUntil <= c.season + 1);

export function renewDemand(p: Player, season: number, m = 1): { wage: number; maxYears: number } {
  const age = season - p.birthYear;
  const wage = roundFee(Math.max(p.wage * 1.1, wageOf(p.marketValue, 'eng2') * 0.5) * (age >= 31 ? 0.95 : 1) * m);
  return { wage, maxYears: age >= 33 ? 1 : age >= 30 ? 2 : 5 };
}

export type RenewAnswer = { ok: true } | { ok: false; reason: 'wage' | 'years' | 'wageCap' | 'unhappy'; counter?: number };

export function judgeRenewal(w: World, c: Career, p: Player, wage: number, years: number): RenewAnswer {
  const d = renewDemand(p, c.season, balanceOf(c).wages);
  if (p.morale < 25) return { ok: false, reason: 'unhappy' };
  if (years > d.maxYears) return { ok: false, reason: 'years', counter: d.maxYears };
  if (wage < d.wage * 0.97) return { ok: false, reason: 'wage', counter: d.wage };
  const club = clubOf(w, c.clubId)!;
  if (wageBillOf(w, c.clubId) - p.wage + wage > club.wageCap) return { ok: false, reason: 'wageCap' };
  return { ok: true };
}

// `years` are extra seasons after this one.
export const renew = (w: World, c: Career, p: Player, wage: number, years: number): World =>
  ({ ...w, players: w.players.map((x) => (x.id === p.id ? { ...x, wage, contractUntil: c.season + 1 + years, morale: Math.min(100, x.morale + 8) } : x)) });
