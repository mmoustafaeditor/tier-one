// The user's club money: tickets, TV money, sponsors, facilities, staff, bonuses, donations and the wage cap.
// Every amount is scaled to the club's size (its wage cap), so small systems matter at every club (E2E report §7),
// and every movement goes into the ledger, so the monthly and season totals add up line by line (E2E #9, #29).
import type { Career, Club, ClubOps, Facility, LocalizedName, SponsorDeal, SponsorSlot, Staff, StaffRole } from '../model/types';
import { KIT_MAKERS, shirtBrands, sponsorsOf } from '../data/sponsors';
import { playerName } from '../data/names';
import { clamp, int, makeRng, pick, type Rng } from './rng';
import { squadOf, type World } from './world';
import { roundFee } from './season';
import { balanceOf } from './balance';

export const FACILITIES: Facility[] = ['stadium', 'medical', 'training', 'academy', 'scouting'];
export const STAFF_ROLES: StaffRole[] = ['assistant', 'director', 'fitness', 'doctor', 'psychologist', 'scout'];
export const SLOTS: SponsorSlot[] = ['shirt', 'kit', 'stadium', 'sleeve', 'commercial'];
const SLOT_SHARE: Record<SponsorSlot, number> = { shirt: 0.4, kit: 0.25, stadium: 0.15, sleeve: 0.1, commercial: 0.1 };

// Typical ticket price per country (top flight); second tiers pay half.
const TICKET: Record<string, number> = { ENG: 55, ESP: 45, ITA: 40, GER: 35, FRA: 35, KSA: 10, EGY: 3, MAR: 4, TUN: 3, ALG: 3, UAE: 8, QAT: 8 };

const leagueOf = (w: World, c: Club) => w.leagues.find((l) => l.id === c.leagueId)!;
export const refPrice = (w: World, c: Club) => {
  const lg = leagueOf(w, c);
  return (TICKET[lg.country] ?? 10) * (lg.tier === 1 ? 1 : 0.5) * (0.6 + c.reputation / 250);
};

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 23);

// ---------- setting up a club ----------

export function newOps(w: World, club: Club, season: number): ClubOps {
  const r = makeRng(hash(club.id) ^ season);
  const lg = leagueOf(w, club);
  const lvl = clamp(1 + Math.floor((club.reputation - 50) / 12), 1, 5);
  // Today's capacity; each stadium level above 1 adds 15% to the base, so the base is today's divided back.
  const today = 5000 + club.reputation ** 2 * 6 * (lg.tier === 1 ? 1 : 0.6);
  const baseCapacity = Math.round(today / (1 + 0.15 * (lvl - 1)) / 100) * 100;
  const ops: ClubOps = {
    clubId: club.id, ticket: Math.round(refPrice(w, club) * 10) / 10, baseCapacity,
    facilities: { stadium: lvl, medical: lvl, training: lvl, academy: lvl, scouting: Math.max(1, lvl - 1) },
    staff: {}, staffPool: [], sponsors: [], sponsorOffers: [],
    training: { load: 1, focus: {} }, academy: [], devPoints: 0, ledger: {}, report: { improved: [], hurt: [] },
  };
  // Staff: an average one in each role to start.
  for (const role of STAFF_ROLES) ops.staff[role] = makeStaff(r, club, role, clamp(Math.round(35 + club.reputation * 0.35 + (r() - 0.5) * 10), 20, 90));
  ops.staffPool = staffCandidates(r, club);
  // Kit supplier and shirt sponsor come with the club (the names shown on the home screen), the rest are open offers.
  const sp = sponsorsOf(club, lg.country, lg.tier);
  ops.sponsors = [
    deal(r, club, 'shirt', sp.shirt, int(r, 6, 24)),
    deal(r, club, 'kit', sp.kit, int(r, 12, 36)),
  ];
  ops.sponsorOffers = sponsorOffers(r, w, club, ops);
  return ops;
}

export const capacityOf = (ops: ClubOps) => Math.round(ops.baseCapacity * (1 + 0.15 * (ops.facilities.stadium - 1)));

// ---------- staff ----------

const STAFF_SHARE: Record<StaffRole, number> = { assistant: 0.025, fitness: 0.015, doctor: 0.015, psychologist: 0.012, scout: 0.012, director: 0.02 };

function makeStaff(r: Rng, club: Club, role: StaffRole, quality: number): Staff {
  const nat = pick(r, ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'EGY', 'MAR', 'POR', 'BRA']);
  const n = playerName(nat, r);
  return { id: `st_${role}_${Math.floor(r() * 1e9)}`, role, name: n, quality, wage: roundFee(club.wageCap * STAFF_SHARE[role] * (0.4 + quality / 80)) };
}

export function staffCandidates(r: Rng, club: Club): Staff[] {
  const out: Staff[] = [];
  for (const role of STAFF_ROLES) for (let i = 0; i < 3; i++) out.push(makeStaff(r, club, role, clamp(Math.round(30 + r() * 65), 20, 98)));
  return out;
}

// Saves from before v0.12 have no sporting director: give the club an average one, and candidates to replace him.
export function ensureDirector(w: World, c: Career): Career {
  if (!c.ops || c.ops.staff.director) return c;
  const club = w.clubs.find((x) => x.id === c.clubId);
  if (!club) return c;
  const r = makeRng(hash(club.id) ^ (c.season * 131));
  const director = makeStaff(r, club, 'director', clamp(Math.round(35 + club.reputation * 0.35 + (r() - 0.5) * 10), 20, 90));
  const pool = [0, 1, 2].map(() => makeStaff(r, club, 'director', clamp(Math.round(30 + r() * 65), 20, 98)));
  return { ...c, ops: { ...c.ops, staff: { ...c.ops.staff, director }, staffPool: [...c.ops.staffPool, ...pool] } };
}

export const staffWages = (ops: ClubOps) => Object.values(ops.staff).reduce((s, x) => s + (x?.wage ?? 0), 0);
export const staffQ = (ops: ClubOps | undefined, role: StaffRole) => ops?.staff[role]?.quality ?? 0;

export function hireStaff(c: Career, s: Staff): Career {
  const old = c.ops.staff[s.role];
  const ops: ClubOps = {
    ...c.ops, staff: { ...c.ops.staff, [s.role]: s },
    staffPool: c.ops.staffPool.filter((x) => x.id !== s.id).concat(old ? [old] : []),
  };
  return { ...c, ops };
}

// ---------- sponsors ----------

function deal(r: Rng, club: Club, slot: SponsorSlot, brand: LocalizedName, months: number): SponsorDeal {
  const monthly = roundFee(club.wageCap * 0.5 * SLOT_SHARE[slot] * (0.85 + r() * 0.3));
  return { id: `sp_${slot}_${Math.floor(r() * 1e9)}`, slot, brand, monthly, months, bonusLeague: roundFee(monthly * 3), bonusCup: roundFee(monthly * 1.5) };
}

const BRANDS: Record<SponsorSlot, [string, string][]> = {
  shirt: [], kit: KIT_MAKERS,
  stadium: [['Samsong Arena', 'ساحة سامسونغ'], ['Emiratez Park', 'حديقة الإماراتز'], ['Orangi Stadium', 'استاد أورانجي'], ['Vodafun Dome', 'قبة فودافَن']],
  sleeve: [['Rakutin', 'راكوتين'], ['Spotifly', 'سبوتيفلاي'], ['Koshary Express', 'كشري إكسبريس'], ['Kebab King', 'ملك الكباب'], ['Chipsi', 'شيبسيه']],
  commercial: [['CIBB Bank', 'بنك سي آي بي بي'], ['Red Bool', 'ريد بوول'], ['Juhayma', 'جهايمة'], ['Pepsy', 'بيبسيه'], ['Aramcoo', 'أرامكوو']],
};

export function sponsorOffers(r: Rng, w: World, club: Club, ops: ClubOps): SponsorDeal[] {
  const lg = leagueOf(w, club);
  const out: SponsorDeal[] = [];
  for (const slot of SLOTS) {
    if (ops.sponsors.some((s) => s.slot === slot)) continue;
    for (let i = 0; i < 2; i++) {
      const brands = slot === 'shirt' ? shirtBrands(lg.country, lg.tier, club.reputation) : BRANDS[slot];
      const [en, ar] = pick(r, brands);
      out.push(deal(r, club, slot, { en, ar }, pick(r, [12, 24, 36])));
    }
  }
  return out;
}

export function signSponsor(c: Career, d: SponsorDeal): Career {
  if (c.ops.sponsors.some((s) => s.slot === d.slot)) return c;
  return { ...c, ops: { ...c.ops, sponsors: [...c.ops.sponsors, d], sponsorOffers: c.ops.sponsorOffers.filter((x) => x.slot !== d.slot) } };
}

// Ask for 10% more: they agree or walk away, about half the time each (the old game: 1 in 2).
export function haggleSponsor(c: Career, d: SponsorDeal, roll: number): { career: Career; ok: boolean } {
  if (roll < 0.5) {
    const better = { ...d, monthly: roundFee(d.monthly * 1.1), bonusLeague: roundFee(d.bonusLeague * 1.1), bonusCup: roundFee(d.bonusCup * 1.1) };
    return { career: { ...c, ops: { ...c.ops, sponsorOffers: c.ops.sponsorOffers.map((x) => (x.id === d.id ? better : x)) } }, ok: true };
  }
  return { career: { ...c, ops: { ...c.ops, sponsorOffers: c.ops.sponsorOffers.filter((x) => x.id !== d.id) } }, ok: false };
}

export const extendSponsor = (c: Career, d: SponsorDeal): Career =>
  ({ ...c, ops: { ...c.ops, sponsors: c.ops.sponsors.map((x) => (x.id === d.id ? { ...x, months: x.months + 12 } : x)) } });

// Ending a deal early costs two months of it.
export function endSponsor(w: World, c: Career, d: SponsorDeal): { world: World; career: Career } {
  const fee = d.monthly * 2;
  const r = makeRng(hash(d.id));
  let career: Career = { ...c, ops: { ...c.ops, sponsors: c.ops.sponsors.filter((x) => x.id !== d.id) } };
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  career = { ...career, ops: { ...career.ops, sponsorOffers: [...career.ops.sponsorOffers, ...sponsorOffers(r, w, club, career.ops).filter((x) => x.slot === d.slot)] } };
  return spend(w, career, 'sponsors', -fee);
}

// ---------- money in and out ----------

// Money movement for the user's club: changes the budget and writes the ledger.
export function spend(w: World, c: Career, key: string, amount: number): { world: World; career: Career } {
  const clubs = w.clubs.map((x) => (x.id === c.clubId ? { ...x, budget: x.budget + amount } : x));
  return { world: { ...w, clubs }, career: { ...c, ops: { ...c.ops, ledger: { ...c.ops.ledger, [key]: (c.ops.ledger[key] ?? 0) + amount } } } };
}

// Share of seats sold at a price: full near the usual price, falling off above it; fans and reputation help.
export function attendance(w: World, c: Career, price: number): number {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const ref = refPrice(w, club);
  const x = price / ref;
  const fill = clamp(1.02 - Math.max(0, x - 0.55) * 0.75, 0.08, 1) * (0.75 + c.board.fans / 400);
  return Math.round(capacityOf(c.ops) * clamp(fill, 0.05, 1));
}

const tvMoney = (w: World, club: Club) => roundFee(club.wageCap * (leagueOf(w, club).tier === 1 ? 0.35 : 0.25));
export const upkeep = (ops: ClubOps, club: Club) => roundFee(club.wageCap * 0.004 * FACILITIES.reduce((s, f) => s + ops.facilities[f], 0));

// Gate money is scaled to the club's size: a full house at the usual price (on the base stadium, so a bigger ground
// still earns more) pays at most GATE_SHARE of a month's wage cap. The giants keep their full gate; a small club's
// ticket income is about a third of its wage bill (TV and sponsors pay the rest), not several times it.
export const GATE_SHARE = 0.25;
export const gateScale = (w: World, club: Club, ops: ClubOps) =>
  Math.min(1, (GATE_SHARE * club.wageCap) / Math.max(1, ops.baseCapacity * refPrice(w, club)));
export const gateMoney = (w: World, c: Career, att: number) => att * c.ops.ticket * gateScale(w, w.clubs.find((x) => x.id === c.clubId)!, c.ops);
// What an AI club takes at the gate in a month: two home games at the usual two-thirds full house.
export const AI_GATE_SHARE = 2 * GATE_SHARE * 0.65;

// Monthly picture for the finance screen: the same numbers the weekly flow uses, times four.
export function monthly(w: World, c: Career) {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const wages = squadOf(w, c.clubId).reduce((s, p) => s + p.wage, 0);
  const gate = gateMoney(w, c, attendance(w, c, c.ops.ticket)) * 2; // about two home games a month
  const sponsors = c.ops.sponsors.reduce((s, d) => s + d.monthly, 0);
  const tv = tvMoney(w, club);
  const staff = staffWages(c.ops);
  const keep = upkeep(c.ops, club);
  return { tickets: gate, tv, sponsors, wages: -wages, staff: -staff, upkeep: -keep, net: gate + tv + sponsors - wages - staff - keep };
}

// One league matchday = a quarter of a month: gate (home games), TV, sponsors, wages, staff and upkeep.
export function economyWeek(w: World, c: Career, home: boolean): { world: World; career: Career } {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  let world = w, career = c;
  const step = (key: string, amount: number) => ({ world, career } = spend(world, career, key, Math.round(amount)));
  const inc = balanceOf(c).income;
  if (home) {
    const att = attendance(world, career, career.ops.ticket);
    const revenue = gateMoney(world, career, att) * inc;
    step('tickets', revenue);
    career = { ...career, ops: { ...career.ops, lastGate: { attendance: att, revenue } } };
  }
  step('tv', tvMoney(world, club) / 4 * inc);
  step('sponsors', career.ops.sponsors.reduce((s, d) => s + d.monthly, 0) / 4 * inc);
  step('wages', -squadOf(world, c.clubId).reduce((s, p) => s + p.wage, 0) / 4);
  step('staff', -staffWages(career.ops) / 4);
  step('upkeep', -upkeep(career.ops, club) / 4);
  // Sponsor deals run by the month (every 4 matchdays). A deal that runs out is renewed by the sponsor for another
  // year at today's rate the same matchday, so a club is never left without a shirt sponsor; ending it is still free
  // to choose (endSponsor brings the slot's other offers).
  if (c.round % 4 === 3) {
    const r = makeRng(hash(c.clubId) ^ (c.season * 97 + c.round));
    const sponsors = career.ops.sponsors.map((d) => (d.months > 1 ? { ...d, months: d.months - 1 } : { ...deal(r, club, d.slot, d.brand, SPONSOR_RENEWAL), id: d.id }));
    career = { ...career, ops: { ...career.ops, sponsors } };
  }
  return { world, career };
}
export const SPONSOR_RENEWAL = 12; // months a sponsor renews for when a deal runs out

// The other clubs' week, the cheap way: wages and upkeep out, TV, the gate and their sponsors in. That about breaks
// even; league prize money (endSeason) is what lets the top of the table buy, so treasuries stop growing without limit.
export const AI_SPONSOR_SHARE = 0.325; // shirt + kit deals at the usual rate
export function aiEconomyWeek(w: World, c: Career): World {
  const bills = new Map<string, number>();
  for (const p of w.players) if (p.clubId !== c.clubId) bills.set(p.clubId, (bills.get(p.clubId) ?? 0) + p.wage);
  const clubs = w.clubs.map((x) => {
    if (x.id === c.clubId) return x;
    const tier1 = leagueOf(w, x).tier === 1;
    const lvl = clamp(1 + Math.floor((x.reputation - 50) / 12), 1, 5);
    const monthly = x.wageCap * ((tier1 ? 0.35 : 0.25) + AI_GATE_SHARE) + x.wageCap * 0.5 * AI_SPONSOR_SHARE - (bills.get(x.id) ?? 0) - x.wageCap * 0.004 * (5 * lvl - 1);
    // The owner covers a shortfall: a club never goes below zero on wages alone.
    return { ...x, budget: Math.max(0, Math.round(x.budget + monthly / 4)) };
  });
  return { ...w, clubs };
}

// Sponsor bonuses for a league title or a cup, paid when it happens.
export function sponsorBonus(w: World, c: Career, kind: 'league' | 'cup'): { world: World; career: Career } {
  const total = c.ops.sponsors.reduce((s, d) => s + (kind === 'league' ? d.bonusLeague : d.bonusCup), 0);
  return total ? spend(w, c, 'bonusSponsor', total) : { world: w, career: c };
}

// ---------- facilities ----------

export const upgradeCost = (club: Club, level: number) => roundFee(club.wageCap * [0, 1.5, 3, 5, 8][level]);

export function upgradeFacility(w: World, c: Career, f: Facility): { world: World; career: Career; ok: boolean } {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const lvl = c.ops.facilities[f];
  if (lvl >= 5) return { world: w, career: c, ok: false };
  const cost = upgradeCost(club, lvl);
  if (club.budget < cost) return { world: w, career: c, ok: false };
  const r = spend(w, c, 'facilities', -cost);
  return { world: r.world, career: { ...r.career, ops: { ...r.career.ops, facilities: { ...r.career.ops.facilities, [f]: lvl + 1 } } }, ok: true };
}

// ---------- bonuses, donations, wage cap ----------

// A bonus lifts morale by how big it is next to the players' wages.
export function payBonus(w: World, c: Career, ids: string[], each: number, fromWallet: boolean): { world: World; career: Career; ok: boolean } {
  const total = each * ids.length;
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  if (fromWallet ? c.coach.wallet < total : club.budget < total) return { world: w, career: c, ok: false };
  const set = new Set(ids);
  const players = w.players.map((p) => {
    if (!set.has(p.id)) return p;
    const lift = clamp(Math.round((each / Math.max(1, p.wage)) * 40), 2, 15);
    return { ...p, morale: clamp(p.morale + lift, 0, 100), savings: (p.savings ?? 0) + each };
  });
  let world: World = { ...w, players }, career = c;
  if (fromWallet) career = { ...career, coach: { ...career.coach, wallet: career.coach.wallet - total }, ops: { ...career.ops, ledger: { ...career.ops.ledger, bonusCoach: (career.ops.ledger.bonusCoach ?? 0) - total } } };
  else ({ world, career } = spend(world, career, 'bonuses', -total));
  return { world, career, ok: true };
}

// The coach gives his own money to the club. The board and fans react in proportion to the amount (E2E #4).
export function donate(w: World, c: Career, amount: number): { world: World; career: Career; ok: boolean } {
  if (amount <= 0 || c.coach.wallet < amount) return { world: w, career: c, ok: false };
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const weight = amount / Math.max(1, club.wageCap);
  const r = spend(w, { ...c, coach: { ...c.coach, wallet: c.coach.wallet - amount } }, 'donations', amount);
  const board = { ...c.board, confidence: clamp(c.board.confidence + Math.min(15, weight * 20), 0, 100), fans: clamp(c.board.fans + Math.min(10, weight * 12), 0, 100) };
  return { world: r.world, career: { ...r.career, board }, ok: true };
}

// Turning budget into a higher monthly wage cap costs 12 months of it; lowering the cap gives 6 months back
// (the cap also follows the wage bill at season end, so unused room is not a cash machine).
export const CAP_MONTHS_UP = 12;
export const CAP_MONTHS_DOWN = 6;
export function moveWageCap(w: World, c: Career, perMonth: number): { world: World; career: Career; ok: boolean } {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const cost = perMonth * (perMonth > 0 ? CAP_MONTHS_UP : CAP_MONTHS_DOWN);
  if (perMonth > 0 && club.budget < cost) return { world: w, career: c, ok: false };
  const bill = squadOf(w, c.clubId).reduce((s, p) => s + p.wage, 0);
  if (perMonth < 0 && club.wageCap + perMonth < bill) return { world: w, career: c, ok: false };
  const r = spend(w, c, 'wageCap', -cost);
  return { world: { ...r.world, clubs: r.world.clubs.map((x) => (x.id === c.clubId ? { ...x, wageCap: x.wageCap + perMonth } : x)) }, career: r.career, ok: true };
}

