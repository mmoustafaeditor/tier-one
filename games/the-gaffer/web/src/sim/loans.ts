// Season-long loans, in and out of the user's club. The borrowing club pays the wage while the player is there;
// loaned players go back to their club at the end of the season, before contracts are looked at.
// Young players loaned out to get games come back a little better.
// G1: `loanIn` and `loanOut` validate themselves (audit S4) and a lender keeps at least 16 players (audit S1).
import { FREE_AGENT, type Career, type Loan, type Player } from '../model/types';
import { freeShirt, squadOf, strengthOf, type World } from './world';
import { makeRng } from './rng';
import { roundFee } from './season';
import { windowOf } from './windows';
import { spend } from './economy';
import { SQUAD_SELL_MIN, dropFromXI } from './transfers';

export const LOANS_MAX = 4; // each way
const top = (w: World, clubId: string, n: number) => new Set(squadOf(w, clubId).sort((a, b) => b.rating - a.rating).slice(0, n).map((p) => p.id));

export const loanOf = (c: Career, playerId: string) => (c.loans ?? []).find((l) => l.playerId === playerId && l.season === c.season);
export const loansIn = (c: Career) => (c.loans ?? []).filter((l) => l.to === c.clubId && l.season === c.season);
export const loansOut = (c: Career) => (c.loans ?? []).filter((l) => l.from === c.clubId && l.season === c.season);
export const loanFee = (p: Player) => roundFee(p.marketValue * 0.06);

export type LoanReason = 'window' | 'budget' | 'wageCap' | 'squad' | 'key' | 'limit' | 'free' | 'loaned' | 'injured' | 'lenderThin' | 'club';
export type LoanCheck = { ok: true } | { ok: false; reason: LoanReason };

// Can the user borrow this player? Clubs lend players outside their best XI, and never below a playable squad.
export function canLoanIn(w: World, c: Career, p: Player): LoanCheck {
  if (!windowOf(c)) return { ok: false, reason: 'window' };
  if (p.clubId === FREE_AGENT || p.clubId === c.clubId) return { ok: false, reason: 'free' };
  if (loanOf(c, p.id)) return { ok: false, reason: 'loaned' };
  if (loansIn(c).length >= LOANS_MAX) return { ok: false, reason: 'limit' };
  if (p.injured > 0) return { ok: false, reason: 'injured' };
  if (top(w, p.clubId, 11).has(p.id)) return { ok: false, reason: 'key' };
  if (squadOf(w, p.clubId).length <= SQUAD_SELL_MIN) return { ok: false, reason: 'lenderThin' };
  if (squadOf(w, c.clubId).length >= 32) return { ok: false, reason: 'squad' };
  const club = w.clubs.find((x) => x.id === c.clubId);
  if (!club) return { ok: false, reason: 'club' };
  if (club.budget < loanFee(p)) return { ok: false, reason: 'budget' };
  if (squadOf(w, c.clubId).reduce((s, x) => s + x.wage, 0) + p.wage > club.wageCap) return { ok: false, reason: 'wageCap' };
  return { ok: true };
}

function moveOnLoan(w: World, p: Player, to: string): World {
  const shirt = to === FREE_AGENT ? 0 : freeShirt(w, to, p.position);
  return { ...w, players: w.players.map((x) => (x.id === p.id ? { ...x, clubId: to, shirtNumber: shirt, listed: undefined } : x)) };
}

export type LoanResult = { world: World; career: Career } & LoanCheck;

export function loanIn(w: World, c: Career, p: Player): LoanResult {
  const check = canLoanIn(w, c, p);
  if (!check.ok) return { world: w, career: c, ...check };
  const fee = loanFee(p);
  const loan: Loan = { playerId: p.id, pn: p.name, from: p.clubId, to: c.clubId, fee, share: 1, season: c.season };
  let world = moveOnLoan(w, p, c.clubId);
  world = { ...world, clubs: world.clubs.map((x) => (x.id === p.clubId ? { ...x, budget: x.budget + fee } : x)) };
  const s = spend(world, c, 'loans', -fee);
  return { world: s.world, career: { ...s.career, loans: [...(c.loans ?? []), loan] }, ok: true };
}

// Clubs that would take this player on loan: a level where he'd play, mostly in the same country.
export function loanClubs(w: World, c: Career, p: Player): string[] {
  const myCountry = w.leagues.find((l) => l.id === w.clubs.find((x) => x.id === c.clubId)!.leagueId)!.country;
  const country = new Map(w.leagues.map((l) => [l.id, l.country]));
  const r = makeRng(p.id.length * 131 + c.round);
  return w.clubs
    .filter((x) => x.id !== c.clubId && country.get(x.leagueId) === myCountry)
    .map((x) => ({ id: x.id, s: strengthOf(w, x.id) }))
    .filter((x) => x.s >= p.rating - 8 && x.s <= p.rating + 3)
    .sort((a, b) => Math.abs(a.s - p.rating + 3) - Math.abs(b.s - p.rating + 3) + (r() - 0.5))
    .slice(0, 3)
    .map((x) => x.id);
}

export function canLoanOut(w: World, c: Career, p: Player): LoanCheck {
  if (!windowOf(c)) return { ok: false, reason: 'window' };
  if (p.clubId !== c.clubId) return { ok: false, reason: 'free' };
  if (loanOf(c, p.id)) return { ok: false, reason: 'loaned' };
  if (loansOut(c).length >= LOANS_MAX) return { ok: false, reason: 'limit' };
  if (squadOf(w, c.clubId).length <= SQUAD_SELL_MIN + 2) return { ok: false, reason: 'squad' };
  return { ok: true };
}

export function loanOut(w: World, c: Career, p: Player, to: string): LoanResult {
  const check = canLoanOut(w, c, p);
  if (!check.ok) return { world: w, career: c, ...check };
  if (to === c.clubId || to === FREE_AGENT || !w.clubs.some((x) => x.id === to)) return { world: w, career: c, ok: false, reason: 'club' };
  const loan: Loan = { playerId: p.id, pn: p.name, from: c.clubId, to, fee: 0, share: 1, season: c.season };
  return { world: moveOnLoan(w, p, to), career: { ...dropFromXI(c, p.id), loans: [...(c.loans ?? []), loan] }, ok: true };
}

// End of season: everyone goes home. Players under 23 who were loaned out come back up to +2.
export function returnLoans(w: World, c: Career): { world: World; career: Career } {
  const live = (c.loans ?? []).filter((l) => l.season === c.season);
  if (!live.length) return { world: w, career: c };
  let world = w;
  for (const l of live) {
    const p = world.players.find((x) => x.id === l.playerId);
    if (!p || p.clubId !== l.to) continue;
    world = moveOnLoan(world, p, l.from);
    if (l.from === c.clubId && c.season - p.birthYear <= 22) {
      const up = Math.min(2, Math.max(0, p.potential - p.rating));
      world = { ...world, players: world.players.map((x) => (x.id === p.id ? { ...x, rating: x.rating + up } : x)) };
    }
  }
  return { world, career: { ...c, loans: [] } };
}
