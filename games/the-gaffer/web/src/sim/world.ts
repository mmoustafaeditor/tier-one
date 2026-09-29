// Builds the whole world (every league, club and player) from one seed.
// World integrity rule: every player gets a value, wage, contract and a unique shirt number,
// and belongs to exactly one club. checkWorld() enforces that and runs before every save.
import { COUNTRIES, LEAGUES } from '../data/leagues';
import { CLUB_ROWS, SECOND_TIER_TOWNS } from '../data/clubs';
import { FOREIGN_NATIONS, playerName } from '../data/names';
import { NICKS, STARS } from '../data/stars';
import { FREE_AGENT, type Club, type ClubOps, type League, type LocalizedName, type NamesMode, type Objective, type Player, type Position, type WorldKind } from '../model/types';
import type { Philosophy } from './tactics';
import { bell, clamp, int, makeRng, pick, type Rng } from './rng';

export interface World {
  leagues: League[]; clubs: Club[]; players: Player[];
  countries?: Record<string, LocalizedName>;  // country names changed in the world editor
  // v2 (save v4): what belongs to a club stays with it when the manager moves on (V2_DESIGN §7.1)
  clubOps?: Record<string, ClubOps>;          // operations of clubs the user managed before (academy, facilities, staff…)
  clubFam?: Record<string, Partial<Record<Philosophy, number>>>; // their squads' familiarity with each philosophy
  managers?: Record<string, Manager>;         // v2.1: the manager of every other club (name and style)
  data?: WorldKind;                           // v2.1: 'real2026' (the 2026/27 snapshot) or 'generated'
  names?: NamesMode;                          // v2.1: which names the world currently shows
}

// v2.1: every club has a manager with a style (his favourite philosophy). Names are invented (never real people).
export interface Manager { name: LocalizedName; style: Philosophy; rep: number }

export const FIRST_SEASON = 2026;

// A country with the name the world editor gave it (if any).
export function countryOf(w: Pick<World, 'countries'> | null | undefined, code: string | undefined) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? { ...c, name: w?.countries?.[c.code] ?? c.name } : undefined;
}

// Starting XI average for the weakest and strongest club of each league.
export const RATING_BAND: Record<string, [number, number]> = {
  eng1: [72, 85], esp1: [70, 85], ita1: [70, 84], ger1: [69, 84], fra1: [68, 83],
  eng2: [62, 70], esp2: [61, 68], ita2: [60, 67], ger2: [61, 68], fra2: [59, 66],
  ksa1: [62, 77], egy1: [58, 72], egy2: [50, 58], mar1: [57, 67], tun1: [55, 67], alg1: [55, 66], uae1: [58, 69], qat1: [57, 69],
};

// Transfer budget of the richest club in each league, in euros. Poorer clubs get a steep fraction of it.
export const TOP_BUDGET: Record<string, number> = {
  eng1: 250e6, esp1: 200e6, ita1: 140e6, ger1: 160e6, fra1: 120e6,
  eng2: 20e6, esp2: 8e6, ita2: 8e6, ger2: 10e6, fra2: 7e6,
  ksa1: 150e6, egy1: 12e6, egy2: 1.5e6, mar1: 4e6, tun1: 3.5e6, alg1: 3.5e6, uae1: 25e6, qat1: 30e6,
};

// Share of home-grown players per country's leagues.
const DOMESTIC: Record<string, number> = { ENG: 0.45, ESP: 0.6, ITA: 0.5, GER: 0.5, FRA: 0.55, KSA: 0.65, UAE: 0.7, QAT: 0.6 };

// 24-man squad: [position, how many]. The first of each position is the starter.
const SQUAD: [Position, number][] = [
  ['GK', 3], ['CB', 4], ['LB', 2], ['RB', 2], ['CDM', 2], ['CM', 3], ['CAM', 2], ['LW', 2], ['RW', 2], ['ST', 2],
];
const STARTERS: Record<Position, number> = { GK: 1, CB: 2, LB: 1, RB: 1, CDM: 1, CM: 2, CAM: 0, LW: 1, RW: 1, ST: 1 };
const NUMBERS: Record<Position, number[]> = {
  GK: [1, 13, 31], CB: [4, 5, 3, 15], LB: [3, 12], RB: [2, 22], CDM: [6, 16], CM: [8, 14, 18],
  CAM: [10, 20], LW: [11, 7], RW: [7, 17], ST: [9, 19],
};

const KIT_COLOURS: [string, string][] = [
  ['#1D4ED8', '#FFFFFF'], ['#B91C1C', '#FFFFFF'], ['#15803D', '#FFFFFF'], ['#111827', '#FACC15'], ['#FACC15', '#111827'],
  ['#7C3AED', '#FFFFFF'], ['#0EA5E9', '#0F172A'], ['#EA580C', '#111827'], ['#FFFFFF', '#1E3A8A'], ['#9F1239', '#60A5FA'],
];

const CLUB_STYLES: Record<string, [string, string][]> = {
  ENG: [['{t} Town', '{t} تاون'], ['{t} City', '{t} سيتي'], ['{t} United', '{t} يونايتد'], ['{t} Rovers', '{t} روفرز'], ['{t} Athletic', '{t} أثلتيك'], ['{t} Albion', '{t} ألبيون'], ['{t} Wanderers', '{t} واندررز']],
  ESP: [['Real {t}', 'ريال {t}'], ['Deportivo {t}', 'ديبورتيفو {t}'], ['Unión {t}', 'يونيون {t}'], ['Racing {t}', 'راسينغ {t}'], ['Atlético {t}', 'أتلتيكو {t}']],
  ITA: [['AC {t}', 'إيه سي {t}'], ['US {t}', 'يو إس {t}'], ['Calcio {t}', 'كالتشيو {t}'], ['Sporting {t}', 'سبورتينغ {t}']],
  GER: [['SV {t}', 'إس في {t}'], ['FC {t}', 'إف سي {t}'], ['VfL {t}', 'في إف إل {t}'], ['SC {t}', 'إس سي {t}'], ['Eintracht {t}', 'آينتراخت {t}']],
  FRA: [['FC {t}', 'إف سي {t}'], ['AS {t}', 'إيه إس {t}'], ['Stade {t}', 'ستاد {t}'], ['Olympique {t}', 'أولمبيك {t}'], ['US {t}', 'يو إس {t}']],
};

export const round2 = (v: number) => {
  // Two significant figures: 27,431,000 -> 27,000,000.
  if (v <= 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / p) * p;
};

// Market value in euros: ~100k at 50, ~4M at 70, ~27M at 80, ~120M at 88; young high-potential players cost more, veterans less.
export function valueOf(rating: number, age: number, potential: number): number {
  let v = 100_000 * Math.pow(1.205, rating - 50);
  if (age <= 21) v *= 1.2 + Math.max(0, potential - rating) * 0.03;
  else if (age >= 33) v *= 0.25;
  else if (age >= 31) v *= 0.5;
  else if (age >= 29) v *= 0.75;
  return Math.max(25_000, round2(v));
}

// Monthly wage in euros.
export const wageOf = (value: number, leagueId: string) =>
  Math.max(1_500, round2(value * (leagueId.startsWith('ksa') || leagueId.startsWith('qat') || leagueId.startsWith('uae') ? 0.012 : 0.006)));

// Attribute profile per position: offset from the overall rating for
// [pace, shooting, passing, dribbling, defending, physical, goalkeeping].
const PROFILE: Record<Position, number[]> = {
  GK: [-30, -45, -20, -35, -30, -5, 3],
  CB: [-10, -30, -12, -20, 4, 3, -60],
  LB: [3, -22, -6, -6, -2, -4, -60],
  RB: [3, -22, -6, -6, -2, -4, -60],
  CDM: [-10, -15, 0, -8, 2, 2, -60],
  CM: [-6, -6, 3, 0, -8, -3, -60],
  CAM: [-2, 0, 4, 4, -25, -10, -60],
  LW: [5, -3, -3, 4, -30, -10, -60],
  RW: [5, -3, -3, 4, -30, -10, -60],
  ST: [2, 4, -10, 0, -35, 0, -60],
};

export function makeAttrs(r: Rng, rating: number, pos: Position): number[] {
  return PROFILE[pos].map((off) => clamp(Math.round(rating + off + bell(r) * 5), 10, 99));
}

// Settles a player's attributes after the rating changes (development, decline).
export const shiftAttrs = (attrs: number[], by: number) => attrs.map((a) => clamp(a + by, 10, 99));

export function freeShirt(w: { players: Player[] }, clubId: string, pos: Position): number {
  const used = new Set(w.players.filter((p) => p.clubId === clubId).map((p) => p.shirtNumber));
  return NUMBERS[pos].find((x) => !used.has(x)) ?? [...Array(79).keys()].map((x) => x + 2).find((x) => !used.has(x)) ?? 99;
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '');

function makeClubs(r: Rng): Club[] {
  const clubs: Club[] = [];
  for (const lg of LEAGUES) {
    const rows = CLUB_ROWS[lg.id];
    const list: Club[] = rows
      ? rows.map(([id, en, ar, short, c1, c2, rep]): Club => ({ id, leagueId: lg.id, name: { en, ar }, shortName: short, colors: [c1, c2], reputation: rep, budget: 0, wageCap: 0 }))
      : SECOND_TIER_TOWNS[lg.id].map(([ten, tar], i) => {
          const [fen, far] = pick(r, CLUB_STYLES[lg.country]);
          return {
            id: `${lg.id}_${i + 1}`,
            leagueId: lg.id,
            name: { en: fen.replace('{t}', ten), ar: far.replace('{t}', tar) },
            shortName: strip(ten).slice(0, 3).toUpperCase(),
            colors: pick(r, KIT_COLOURS),
            reputation: int(r, 50, 66),
            budget: 0,
            wageCap: 0,
          };
        });
    const reps = list.map((c) => c.reputation);
    const lo = Math.min(...reps), hi = Math.max(...reps);
    for (const c of list) {
      const f = hi === lo ? 0.5 : (c.reputation - lo) / (hi - lo);
      c.budget = round2(TOP_BUDGET[lg.id] * Math.pow(0.25 + 0.75 * f, 3));
    }
    clubs.push(...list);
  }
  return clubs;
}

function makeSquad(r: Rng, club: Club, lg: League, strength: number, season: number): Player[] {
  const players: Player[] = [];
  const used = new Set<number>();
  const domestic = DOMESTIC[lg.country] ?? 0.8;
  const foreign = FOREIGN_NATIONS[lg.country];
  let n = 0;
  for (const [pos, count] of SQUAD) {
    for (let k = 0; k < count; k++) {
      const starter = k < STARTERS[pos] || (pos === 'CAM' && k === 0 && r() < 0.5);
      const age = clamp(Math.round(26 + bell(r) * 8), 17, 35);
      // Starters sit on the club's level; backups a bit under; kids further under but with room to grow.
      let rating = strength + (starter ? 1 : -4 - k * 2) + bell(r) * 4;
      if (age <= 20) rating -= 5;
      if (age >= 33) rating -= 2;
      rating = clamp(Math.round(rating), 40, 94);
      const growth = age <= 23 ? (24 - age) * (1 + r() * 1.5) : age <= 27 ? r() * 3 : 0;
      const potential = clamp(Math.round(rating + growth), rating, 97);
      const nationality = r() < domestic ? lg.country : pick(r, foreign);
      const shirt = NUMBERS[pos].find((x) => !used.has(x)) ?? [...Array(60).keys()].map((x) => x + 21).find((x) => !used.has(x))!;
      used.add(shirt);
      const marketValue = valueOf(rating, age, potential);
      players.push({
        id: `${club.id}_p${++n}`,
        clubId: club.id,
        name: playerName(nationality, r),
        nationality,
        birthYear: season - age,
        position: pos,
        rating,
        potential,
        marketValue,
        wage: wageOf(marketValue, lg.id),
        contractUntil: season + int(r, 1, 5),
        shirtNumber: shirt,
        attrs: makeAttrs(r, rating, pos),
        fitness: 100,
        morale: 65,
        injured: 0,
        banned: 0,
      });
    }
  }
  return players;
}

// Hand-made stars take the place of the weakest generated player in their position at their club.
function placeStars(r: Rng, clubs: Club[], players: Player[], season: number) {
  STARS.forEach(([clubId, en, ar, nationality, position, age, rating, potential, shirt], i) => {
    const club = clubs.find((c) => c.id === clubId);
    if (!club) return;
    const squad = players.filter((p) => p.clubId === clubId);
    const out = squad.filter((p) => p.position === position && !p.id.startsWith('star_')).sort((a, b) => a.rating - b.rating)[0]
      ?? squad.filter((p) => !p.id.startsWith('star_')).sort((a, b) => a.rating - b.rating)[0];
    if (!out) return;
    // The star gets his famous number; whoever wore it takes the number of the player he replaces.
    const holder = squad.find((p) => p !== out && p.shirtNumber === shirt);
    const holderIsStar = holder?.id.startsWith('star_');
    if (holder && !holderIsStar) holder.shirtNumber = out.shirtNumber;
    const taken = new Set(holderIsStar ? [shirt] : []);
    const marketValue = valueOf(rating, age, potential);
    const star: Player = {
      id: `star_${i}`, clubId, name: { en, ar }, nationality, birthYear: season - age, position, rating, potential, marketValue,
      wage: wageOf(marketValue, club.leagueId), contractUntil: season + int(r, 2, 4), shirtNumber: taken.has(shirt) ? out.shirtNumber : shirt,
      attrs: makeAttrs(r, rating, position), fitness: 100, morale: 70, injured: 0, banned: 0,
      nick: NICKS[en] ? { en: NICKS[en][0], ar: NICKS[en][1] } : undefined,
    };
    players[players.indexOf(out)] = star;
  });
  for (const club of clubs) {
    if (!STARS.some((s) => s[0] === club.id)) continue;
    club.wageCap = round2(players.filter((p) => p.clubId === club.id).reduce((s, p) => s + p.wage, 0) * 1.15);
  }
}

// Ranking points start from real squad strength (reputation is relative to each league, so Al Ahly and Madrid both have ~95).
export function seedElo(clubs: Club[], players: Player[]) {
  for (const c of clubs) {
    const s = squadStrength(players.filter((p) => p.clubId === c.id));
    c.elo = Math.round(1000 + (s - 50) * 30);
  }
}

// Players without a club: anyone can sign them for no fee.
export function makeFreeAgents(r: Rng, season: number, n: number, from = 0): Player[] {
  const out: Player[] = [];
  const nations = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'BRA', 'POR', 'ARG', 'SEN', 'NGA', 'EGY', 'MAR', 'KSA', 'TUN', 'ALG'];
  for (let i = 0; i < n; i++) {
    const pos = pick(r, SQUAD.map(([p]) => p));
    const age = clamp(Math.round(27 + bell(r) * 7), 18, 35);
    const rating = clamp(Math.round(62 + bell(r) * 12), 45, 82);
    const potential = clamp(Math.round(rating + (age <= 23 ? (24 - age) * (1 + r() * 1.5) : 0)), rating, 92);
    const nationality = pick(r, nations);
    const marketValue = valueOf(rating, age, potential);
    out.push({
      id: `fa_${season}_${from + i}`, clubId: FREE_AGENT, name: playerName(nationality, r), nationality, birthYear: season - age,
      position: pos, rating, potential, marketValue, wage: wageOf(marketValue, 'eng2'), contractUntil: season, shirtNumber: 0,
      attrs: makeAttrs(r, rating, pos), fitness: 90, morale: 60, injured: 0, banned: 0,
    });
  }
  return out;
}

export function generateWorld(seed: number, season = FIRST_SEASON): World {
  const r = makeRng(seed);
  const leagues = LEAGUES.map((l) => ({ ...l }));
  const clubs = makeClubs(r);
  const players: Player[] = [];
  for (const lg of leagues) {
    const list = clubs.filter((c) => c.leagueId === lg.id);
    const reps = list.map((c) => c.reputation);
    const lo = Math.min(...reps), hi = Math.max(...reps);
    const [bottom, top] = RATING_BAND[lg.id];
    for (const c of list) {
      const f = hi === lo ? 0.5 : (c.reputation - lo) / (hi - lo);
      const squad = makeSquad(r, c, lg, bottom + (top - bottom) * f, season);
      players.push(...squad);
      // Wage cap: today's wage bill plus 15% room to sign players.
      c.wageCap = round2(squad.reduce((s, p) => s + p.wage, 0) * 1.15);
    }
  }
  placeStars(r, clubs, players, season);
  seedElo(clubs, players);
  players.push(...makeFreeAgents(r, season, 160));
  return { leagues, clubs, players };
}

// Returns a list of problems; empty means the world is sound. Saving refuses a world with problems.
export function checkWorld(w: World): string[] {
  const issues: string[] = [];
  const clubIds = new Set(w.clubs.map((c) => c.id));
  const seen = new Set<string>();
  const shirts = new Map<string, Set<number>>();
  for (const c of w.clubs) {
    const n = squadOf(w, c.id).length;
    if (n < 11) issues.push(`${c.id}: only ${n} players`);
  }
  for (const l of w.leagues) {
    const n = w.clubs.filter((c) => c.leagueId === l.id).length;
    if (n !== l.clubs) issues.push(`${l.id}: ${n} clubs, expected ${l.clubs}`);
  }
  for (const p of w.players) {
    if (seen.has(p.id)) issues.push(`${p.id}: duplicate player`);
    seen.add(p.id);
    if (p.clubId !== FREE_AGENT && !clubIds.has(p.clubId)) issues.push(`${p.id}: unknown club ${p.clubId}`);
    for (const k of ['marketValue', 'wage', 'contractUntil', 'shirtNumber', 'rating', 'potential', 'fitness', 'morale', 'injured', 'banned'] as const)
      if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) issues.push(`${p.id}: missing ${k}`);
    if (!Array.isArray(p.attrs) || p.attrs.length !== 7) issues.push(`${p.id}: missing attrs`);
    if (p.clubId === FREE_AGENT) continue;
    const s = shirts.get(p.clubId) ?? new Set<number>();
    if (s.has(p.shirtNumber)) issues.push(`${p.id}: shirt ${p.shirtNumber} taken at ${p.clubId}`);
    s.add(p.shirtNumber);
    shirts.set(p.clubId, s);
  }
  return issues;
}

// ---------- read helpers used by the screens ----------

export const clubsOf = (w: World, leagueId: string) => w.clubs.filter((c) => c.leagueId === leagueId).sort((a, b) => b.reputation - a.reputation);
// Players by club and by id, cached per players array (worlds are never mutated in place, a change makes a new array).
const INDEX = new WeakMap<Player[], { byClub: Map<string, Player[]>; byId: Map<string, Player> }>();
export function indexOf(w: World) {
  let ix = INDEX.get(w.players);
  if (!ix) {
    const byClub = new Map<string, Player[]>();
    const byId = new Map<string, Player>();
    for (const p of w.players) { (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p); byId.set(p.id, p); }
    ix = { byClub, byId };
    INDEX.set(w.players, ix);
  }
  return ix;
}
export const squadOf = (w: World, clubId: string) => [...(indexOf(w).byClub.get(clubId) ?? [])];
export const playerOf = (w: World, id: string) => indexOf(w).byId.get(id);

const POS_ORDER: Position[] = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
export const sortSquad = (ps: Player[]) =>
  [...ps].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.rating - a.rating);

// Club strength = average of its best 11 players. One formula for the engine, the market and the screens.
export function squadStrength(squad: Player[]): number {
  const best = squad.map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return best.reduce((s, x) => s + x, 0) / Math.max(1, best.length);
}
export const strengthOf = (w: World, clubId: string) => Math.round(squadStrength(squadOf(w, clubId)));

// 1-5 stars (halves) by the club's place in its own league.
export function starsOf(w: World, club: Club): number {
  const list = clubsOf(w, club.leagueId);
  const rank = list.findIndex((c) => c.id === club.id);
  return Math.max(1, Math.round((5 - (rank / list.length) * 4) * 2) / 2);
}

// What the board expects, from the club's reputation rank in its league.
export function objectiveOf(w: World, club: Club): Objective {
  const list = clubsOf(w, club.leagueId);
  const rank = list.findIndex((c) => c.id === club.id) + 1;
  const lg = w.leagues.find((l) => l.id === club.leagueId)!;
  const hasLower = w.leagues.some((l) => l.country === lg.country && l.tier === lg.tier + 1);
  if (lg.tier > 1) return rank <= 3 ? 'promotion' : rank <= 8 ? 'playoffs' : 'midTable';
  if (rank <= 2) return 'title';
  if (rank <= 5) return 'europe';
  if (rank <= Math.ceil(list.length / 2)) return 'topHalf';
  return hasLower ? 'survive' : 'midTable';
}

export const ageOf = (p: Player, season: number) => season - p.birthYear;
export const wageBill = (w: World, clubId: string) => squadOf(w, clubId).reduce((s, p) => s + p.wage, 0);

// Amounts are wrapped in Unicode LTR isolate marks, so «€26K» reads the same inside Arabic text.
export function money(v: number): string {
  const neg = v < 0 ? '−' : '';
  const a = Math.abs(v);
  const txt = a >= 1e6 ? `€${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M` : a >= 1e3 ? `€${Math.round(a / 1e3)}K` : `€${Math.round(a * 10) / 10}`;
  return `\u2066${neg}${txt}\u2069`;
}
