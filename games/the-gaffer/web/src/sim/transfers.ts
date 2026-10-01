// Transfers and contracts for the user's club.
// E2E lessons: a bid always gets a clear answer and a reason (#7), the fee charged is exactly the agreed fee (#22),
// the fee box starts at a sensible number (#21), and counters update after a renewal (#20).
// G1 (integrity audit S1/S4): every transaction validates itself. `buy`, `acceptOffer` and `tryRenew` re-run their own
// judge and return `{ ok: false, reason }` without touching the world, so a caller that forgets the check can't push a
// budget negative, break the wage cap, or strip an AI club below a playable squad.
import { FREE_AGENT, type Career, type Deal, type Offer, type Player } from '../model/types';
import { freeShirt, squadOf, wageOf, type World } from './world';
import { roundFee } from './season';
import { addNews, hijacked } from './news';
import { balanceOf } from './balance';
import { recordDeal } from './records';
import { spendingRoom, wageRoom } from './recruit/money';

export const SQUAD_MAX = 32;
export const SQUAD_SELL_MIN = 16;
// Staff advice and delegated selling keep a workable squad: at or under SQUAD_COMFORT senior players (not out on loan)
// they no longer recommend selling anyone we haven't listed, and at or under SQUAD_THIN they turn such bids down.
// Following their picks used to take squads down to the 16-man floor while the cash piled up (audit GF-005).
export const SQUAD_COMFORT = 22;
export const SQUAD_THIN = 18;

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
const strengthOf = (w: World, clubId: string) => {
  const best = squadOf(w, clubId).map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return best.reduce((s, x) => s + x, 0) / Math.max(1, best.length);
};

// A player leaving the user's club leaves his XI slot empty (the best fit fills it), never a dangling id.
export function dropFromXI(c: Career, playerId: string): Career {
  const xi = c.tactics?.xi;
  if (!xi || !xi.includes(playerId)) return c;
  return { ...c, tactics: { ...c.tactics!, xi: xi.map((id) => (id === playerId ? '' : id)) } };
}

export interface Bid { fee: number; wage: number; years: number; role: Role }
export type BidReason = 'budget' | 'wageCap' | 'squadFull' | 'fee' | 'wage' | 'ambition' | 'role' | 'injured' | 'sellerThin';
export type BidAnswer = { ok: true } | { ok: false; reason: BidReason; counter?: number };

// One clear answer for every bid.
export function judgeBid(w: World, c: Career, p: Player, bid: Bid): BidAnswer {
  const club = clubOf(w, c.clubId);
  if (!club) return { ok: false, reason: 'budget' };
  if (p.clubId === c.clubId) return { ok: false, reason: 'ambition' };
  if (squadOf(w, c.clubId).length >= SQUAD_MAX) return { ok: false, reason: 'squadFull' };
  // The seller keeps a playable squad: a club sold down to ten players can't field a side (audit S1).
  if (p.clubId !== FREE_AGENT && squadOf(w, p.clubId).length <= SQUAD_SELL_MIN) return { ok: false, reason: 'sellerThin' };
  // Stars won't drop far below their level: say so first, whatever the money.
  if (p.rating > strengthOf(w, c.clubId) + 9) return { ok: false, reason: 'ambition' };
  // v2.5: spending room (cash less what we already owe), and the wage bill we actually pay (loan shares).
  if (bid.fee > spendingRoom(w, c)) return { ok: false, reason: 'budget' };
  if (bid.wage > wageRoom(w, c)) return { ok: false, reason: 'wageCap' };
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
  const base = from === c.clubId ? dropFromXI(c, p.id) : c;
  return {
    world: { ...w, clubs, players },
    career: recordDeal({ ...base, deals: [deal, ...c.deals], offers: c.offers.filter((o) => o.playerId !== p.id), ...(ledger ? { ops: { ...c.ops, ledger } } : {}) }, deal),
  };
}

export type BuyResult = { world: World; career: Career } & BidAnswer;

// Signs the player if the bid passes `judgeBid`; otherwise returns the same world and career with the reason.
export function buy(w: World, c: Career, p: Player, bid: Bid): BuyResult {
  const a = judgeBid(w, c, p, bid);
  if (!a.ok) return { world: w, career: c, ...a };
  const r = move(w, c, p, c.clubId, bid.fee, bid.wage, bid.years);
  // Signing a player other clubs were chasing ends that rumour (a hijack).
  const career = addNews(hijacked(r.career, p.id), 'transfers', 'userSign', { player: p.id, pn: p.name, club: c.clubId, club2: p.clubId, s: String(bid.fee) });
  return { world: r.world, career, ok: true };
}

export type SellCheck = { ok: true } | { ok: false; reason: 'squadMin' | 'buyerBudget' | 'gone' };

export function canSell(w: World, c: Career, o: Offer): SellCheck {
  const p = w.players.find((x) => x.id === o.playerId);
  if (!p || p.clubId !== c.clubId || !clubOf(w, o.clubId)) return { ok: false, reason: 'gone' };
  if (squadOf(w, c.clubId).length <= SQUAD_SELL_MIN) return { ok: false, reason: 'squadMin' };
  if ((clubOf(w, o.clubId)?.budget ?? 0) < o.fee) return { ok: false, reason: 'buyerBudget' };
  return { ok: true };
}

export type SellResult = { world: World; career: Career } & SellCheck;

// Sells the player if `canSell` agrees; otherwise nothing moves and the reason comes back.
export function acceptOffer(w: World, c: Career, o: Offer): SellResult {
  const ok = canSell(w, c, o);
  if (!ok.ok) return { world: w, career: c, ...ok };
  const p = w.players.find((x) => x.id === o.playerId)!;
  const years = Math.max(2, p.contractUntil - c.season);
  const r = move(w, c, p, o.clubId, o.fee, Math.max(p.wage, wageOf(p.marketValue, leagueOfClub(w, o.clubId))), years);
  return { world: r.world, career: addNews(r.career, 'transfers', 'userSell', { player: p.id, pn: p.name, club: o.clubId, club2: c.clubId, s: String(o.fee) }), ok: true };
}

export const rejectOffer = (c: Career, o: Offer): Career => ({ ...c, offers: c.offers.filter((x) => x.id !== o.id) });

// Counter-offer: the buyer meets a raise of up to ~25% over market value, otherwise walks away.
// `roll` is a seeded number in [0, 1) (see `dealRoll`), so the answer is part of the career's story, not luck of the reload.
export function counterOffer(c: Career, o: Offer, p: Player, fee: number, roll: number): { career: Career; accepted: boolean } {
  const limit = p.marketValue * (1.1 + roll * 0.25);
  if (fee <= limit) return { career: { ...c, offers: c.offers.map((x) => (x.id === o.id ? { ...x, fee: roundFee(fee) } : x)) }, accepted: true };
  return { career: rejectOffer(c, o), accepted: false };
}

// One repeatable roll in [0, 1) per career, matchday and deal (audit S6: no Math.random() in commands).
export function dealRoll(c: Pick<Career, 'seed' | 'season' | 'round'>, key: string): number {
  let h = (c.seed ^ (c.season * 7919 + c.round * 104729)) >>> 0;
  for (const ch of key) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  h = (h + 0x6d2b79f5) >>> 0;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

export type RenewAnswer = { ok: true } | { ok: false; reason: 'wage' | 'years' | 'wageCap' | 'unhappy' | 'gone' | 'trust'; counter?: number };

// `factor`: what the terms beyond the wage do to his demand (v2.4: a squad role, a release clause; sim/room.ts).
export function judgeRenewal(w: World, c: Career, p: Player, wage: number, years: number, factor = 1): RenewAnswer {
  const club = clubOf(w, c.clubId);
  const cur = w.players.find((x) => x.id === p.id);
  if (!club || !cur || cur.clubId !== c.clubId) return { ok: false, reason: 'gone' };
  const d0 = renewDemand(cur, c.season, balanceOf(c).wages);
  const d = { ...d0, wage: roundFee(d0.wage * factor) };
  if (cur.morale < 25) return { ok: false, reason: 'unhappy' };
  if ((cur.trust ?? 50) < 25) return { ok: false, reason: 'trust' }; // v2.4: he doesn't believe a word you say
  if (years > d.maxYears) return { ok: false, reason: 'years', counter: d.maxYears };
  if (wage < d.wage * 0.97) return { ok: false, reason: 'wage', counter: d.wage };
  if (wageBillOf(w, c.clubId) - cur.wage + wage > club.wageCap) return { ok: false, reason: 'wageCap' };
  return { ok: true };
}

// A renewal EXTENDS the current deal: `years` extra seasons after the later of the current end and next summer (GF-03).
export const newContractEnd = (p: Player, season: number, years: number) => Math.max(p.contractUntil, season + 1) + years;

export type RenewResult = { world: World } & RenewAnswer;

export function tryRenew(w: World, c: Career, p: Player, wage: number, years: number, factor = 1): RenewResult {
  const a = judgeRenewal(w, c, p, wage, years, factor);
  if (!a.ok) return { world: w, ...a };
  return {
    ok: true,
    world: { ...w, players: w.players.map((x) => (x.id === p.id ? { ...x, wage, contractUntil: newContractEnd(x, c.season, years), morale: Math.min(100, x.morale + 8) } : x)) },
  };
}

// Same as `tryRenew` for callers that only want the world back: an unjudged renewal leaves the world untouched.
export const renew = (w: World, c: Career, p: Player, wage: number, years: number): World => tryRenew(w, c, p, wage, years).world;
