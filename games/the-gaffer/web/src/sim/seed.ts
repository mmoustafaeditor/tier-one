// V2.1: the real 2026/27 world. Builds the same World shape as generateWorld from the Semba data snapshot
// (src/data/real.ts, made from data/seed by scripts/import-seed.mjs). FACTS come from the data: names, clubs,
// positions, birth years, nationalities, shirt numbers, captaincy, kit colours. ABILITY is our own model:
//   rating = the club's level (league band × the club's standing) + squad role (shirt number, captaincy) + age curve
//            + seeded variation, normalised so the club's best XI sits at its level;
//   then the designers' tiers for about 400 notable players (scripts/tiers.mjs) set their level and position.
// Values and wages come from the game's own formulas. Leagues the snapshot doesn't cover keep generated squads; the
// clubs relegated in 2025/26 play the second tier under their real names with generated squads.
import { FREE_AGENT, type Club, type LocalizedName, type NamesMode, type Player, type Position } from '../model/types';
import { REAL_CLUBS, REAL_PLAYERS, REAL_RELEGATED, type RealClubRow } from '../data/real';
import { playerName } from '../data/names';
import { CLUB_ROWS } from '../data/clubs';
import { LEAGUES } from '../data/leagues';
import { bell, clamp, int, rngFor, hash32 } from './rng';
import {
  FIRST_SEASON, RATING_BAND, TOP_BUDGET, freeShirt, generateWorld, makeAttrs, round2, seedElo, valueOf, wageOf, type Manager, type World,
} from './world';
import { PHILOSOPHIES, type Philosophy } from './tactics';

// Build flag (VITE_WORLD_NAMES=fictional) or the per-career setting: fictional names everywhere, same ids.
export const BUILD_NAMES: NamesMode = (import.meta.env?.VITE_WORLD_NAMES === 'fictional' ? 'fictional' : 'real');

type Row = { id: string; name: string; short: string; nat: string; born: number; pos: 'GK' | 'DF' | 'MF' | 'FW'; club: number; shirt: number; captain: boolean; loan: boolean; tier: number; tierPos: Position | '' };
let ROWS: Row[] | null = null;
function rows(): Row[] {
  if (ROWS) return ROWS;
  ROWS = REAL_PLAYERS.split('\n').map((line) => {
    const f = line.split('|');
    return {
      id: f[0], name: f[1], short: f[2] || f[1], nat: f[3], born: Number(f[4]) || 0, pos: f[5] as Row['pos'], club: Number(f[6]), shirt: Number(f[7]) || 0,
      captain: f[8].includes('c'), loan: f[8].includes('l'), tier: Number(f[9]) || 0, tierPos: (f[10] || '') as Position | '',
    };
  });
  return ROWS;
}

const AGE_SHIFT = (a: number) => (a <= 18 ? -7 : a === 19 ? -5 : a === 20 ? -3.5 : a === 21 ? -2.5 : a === 22 ? -1.5 : a === 23 ? -0.5 : a <= 30 ? 0 : a === 31 ? -0.5 : a === 32 ? -1 : a === 33 ? -1.5 : a === 34 ? -2.5 : -3.5);
const ROLE_SHIFT = (shirt: number) => (shirt >= 1 && shirt <= 11 ? 2.5 : shirt >= 12 && shirt <= 25 ? 0.5 : shirt >= 26 && shirt <= 39 ? -2 : -4.5);

// GK/DF/MF/FW → the game's ten positions, by shirt number first, then balanced so every squad can field its shapes.
function detailPositions(list: Row[], seed: number): Map<string, Position> {
  const out = new Map<string, Position>();
  const pick = (r: Row, opts: [Position, number][]) => {
    let u = (hash32(`${seed}:${r.id}:pos`) % 1000) / 1000;
    for (const [p, w] of opts) { if (u < w) return p; u -= w; }
    return opts[opts.length - 1][0];
  };
  for (const r of list) {
    if (r.tierPos) { out.set(r.id, r.tierPos); continue; }
    const s = r.shirt % 100;
    if (r.pos === 'GK') out.set(r.id, 'GK');
    else if (r.pos === 'DF') out.set(r.id, [2, 12, 22, 32].includes(s) ? 'RB' : [3, 13, 23, 33].includes(s) ? 'LB' : [4, 5, 6, 15, 16, 24, 25, 44].includes(s) ? 'CB' : pick(r, [['CB', 0.6], ['RB', 0.2], ['LB', 0.2]]));
    else if (r.pos === 'MF') out.set(r.id, [6, 16, 5].includes(s) ? 'CDM' : [10, 20].includes(s) ? 'CAM' : [8, 14, 18].includes(s) ? 'CM' : pick(r, [['CM', 0.5], ['CDM', 0.25], ['CAM', 0.25]]));
    else out.set(r.id, [9, 19, 99, 90].includes(s) ? 'ST' : [7, 17, 27].includes(s) ? 'RW' : [11, 21].includes(s) ? 'LW' : pick(r, [['ST', 0.4], ['LW', 0.3], ['RW', 0.3]]));
  }
  // Every squad gets at least one of each full-back, a holding midfielder, two central midfielders and a striker.
  const need: [Position, Row['pos'], number][] = [['LB', 'DF', 1], ['RB', 'DF', 1], ['CB', 'DF', 3], ['CDM', 'MF', 1], ['CM', 'MF', 2], ['ST', 'FW', 1], ['LW', 'FW', 1], ['RW', 'FW', 1]];
  for (const [pos, group, n] of need) {
    let have = list.filter((r) => out.get(r.id) === pos).length;
    const donors = list.filter((r) => r.pos === group && !r.tierPos && out.get(r.id) !== pos)
      .sort((a, b) => list.filter((x) => out.get(x.id) === out.get(b.id)).length - list.filter((x) => out.get(x.id) === out.get(a.id)).length);
    for (const d of donors) { if (have >= n) break; if (list.filter((x) => out.get(x.id) === out.get(d.id)).length <= (need.find((q) => q[0] === out.get(d.id))?.[2] ?? 0)) continue; out.set(d.id, pos); have++; }
  }
  return out;
}

export const REAL_SQUAD_MAX = 30;

function realSquad(club: Club, list: Row[], level: number, season: number, seed: number): Player[] {
  const age = (r: Row) => (r.born ? season - r.born : clamp(Math.round(25 + bell(rngFor(seed, 'age', r.id)) * 5), 18, 34));
  const pos = detailPositions(list, seed);
  // Importance within the squad: who plays. Third-choice keepers and fringe numbers sit lower.
  const keepers = list.filter((r) => r.pos === 'GK').sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
  const importance = (r: Row) => ROLE_SHIFT(r.shirt) + AGE_SHIFT(age(r)) + (r.captain ? 1.5 : 0) - (r.pos === 'GK' && keepers.indexOf(r) >= 2 ? 4 : 0);
  // Big squads: keep the thirty who matter most (the rest are reserves the snapshot lists).
  const kept = list.length > REAL_SQUAD_MAX ? [...list].sort((a, b) => (b.tier - a.tier) || (importance(b) - importance(a))).slice(0, REAL_SQUAD_MAX) : list;
  const raw = new Map(kept.map((r) => [r.id, r.tier || level + importance(r) + bell(rngFor(seed, 'rating', r.id)) * 2.5]));
  // Normalise: the best eleven (tiered players included) average the club's level; only the modelled players move.
  for (let k = 0; k < 3; k++) {
    const top = [...raw.values()].sort((a, b) => b - a).slice(0, 11);
    const delta = clamp(level - top.reduce((s, x) => s + x, 0) / Math.max(1, top.length), -3, 6);
    if (Math.abs(delta) < 0.05) break;
    for (const r of kept) if (!r.tier) raw.set(r.id, raw.get(r.id)! + delta);
  }
  const used = new Set<number>();
  const players: Player[] = [];
  for (const r of kept) {
    const a = age(r);
    const rating = clamp(Math.round(raw.get(r.id)!), 42, 94);
    const rr = rngFor(seed, 'pot', r.id);
    const growth = a <= 21 ? 3 + rr() * (22 - a) * 1.2 + (r.tier ? 3 : 0) : a <= 23 ? (24 - a) * (1 + rr() * 1.2) : a <= 26 ? rr() * 2.5 : 0;
    const potential = clamp(Math.round(rating + growth), rating, 97);
    const p0 = pos.get(r.id)!;
    const marketValue = valueOf(rating, a, potential);
    const shirt = r.shirt && !used.has(r.shirt) ? r.shirt : 0;
    if (shirt) used.add(shirt);
    const cr = rngFor(seed, 'contract', r.id);
    players.push({
      id: r.id, clubId: club.id, name: { en: r.name, ar: r.name }, short: r.short, nationality: r.nat, birthYear: season - a, position: p0,
      rating, potential, marketValue, wage: wageOf(marketValue, club.leagueId),
      contractUntil: season + (a <= 23 ? int(cr, 3, 5) : a <= 29 ? int(cr, 2, 4) : int(cr, 1, 2)),
      shirtNumber: shirt, attrs: makeAttrs(rngFor(seed, 'attrs', r.id), rating, p0), fitness: 100, morale: r.captain ? 70 : 65, injured: 0, banned: 0,
      ...(r.captain ? { captain: true } : {}),
    });
  }
  // Players with no number (or a clash) get the first free one for their position.
  const world = { players };
  for (const p of players) if (!p.shirtNumber) p.shirtNumber = freeShirt(world, club.id, p.position);
  return players;
}

// Monogram for crests: initials of the name's words (skipping FC, AFC, CF, SC…), up to three letters.
export function monogram(name: string): string {
  const skip = new Set(['FC', 'AFC', 'CF', 'SC', 'AC', 'AS', 'SS', 'US', 'CD', 'RC', 'UD', 'SD', 'CA', 'VFL', 'VFB', 'TSG', 'SV', 'OGC', 'RCD', 'DE', 'LA', 'EL', 'AL', 'OF', 'THE', '1.']);
  const words = name.replace(/[^\p{L}\s.-]/gu, ' ').split(/[\s-]+/).filter((w) => w && !skip.has(w.toUpperCase()));
  if (!words.length) return name.slice(0, 2).toUpperCase();
  const init = words.map((w) => w[0].toUpperCase()).join('');
  return init.length === 1 ? words[0].slice(0, 1).toUpperCase() : init.slice(0, 3);
}

// Every club gets a manager with a style. Names are generated (never real people); the style drives the club's plan.
export function makeManagers(w: World, seed: number): Record<string, Manager> {
  const out: Record<string, Manager> = {};
  for (const c of w.clubs) {
    const r = rngFor(seed, 'manager', c.id);
    const lg = w.leagues.find((l) => l.id === c.leagueId)!;
    const style: Philosophy = c.reputation >= 85 ? (['possession', 'gegenpress', 'wings', 'possession'] as const)[int(r, 0, 3)]
      : c.reputation <= 68 ? (['bus', 'counter', 'direct', 'balanced'] as const)[int(r, 0, 3)] : PHILOSOPHIES[int(r, 0, PHILOSOPHIES.length - 1)];
    out[c.id] = { name: playerName(r() < 0.6 ? lg.country : ['ESP', 'POR', 'ITA', 'GER', 'FRA', 'ENG'][int(r, 0, 5)], r), style, rep: clamp(Math.round(c.reputation - 10 + bell(r) * 8), 20, 95) };
  }
  return out;
}

// League names as the data (and everyone else) writes them. Second tiers too; the cups keep generic names.
const REAL_LEAGUE: Record<string, [string, string]> = {
  eng1: ['Premier League', 'الدوري الإنجليزي الممتاز'], esp1: ['La Liga', 'الدوري الإسباني'], ita1: ['Serie A', 'الدوري الإيطالي'],
  ger1: ['Bundesliga', 'الدوري الألماني'], fra1: ['Ligue 1', 'الدوري الفرنسي'], egy1: ['Egyptian Premier League', 'الدوري المصري الممتاز'], ksa1: ['Saudi Pro League', 'دوري روشن السعودي'],
  eng2: ['Championship', 'دوري البطولة الإنجليزية'], esp2: ['Segunda División', 'الدرجة الثانية الإسبانية'], ita2: ['Serie B', 'الدرجة الثانية الإيطالية'],
  ger2: ['2. Bundesliga', 'الدرجة الثانية الألمانية'], fra2: ['Ligue 2', 'الدرجة الثانية الفرنسية'],
};
const realLeagues = (w: World) => w.leagues.map((l) => (REAL_LEAGUE[l.id] ? { ...l, name: { en: REAL_LEAGUE[l.id][0], ar: REAL_LEAGUE[l.id][1] } } : l));
const fictionalLeagues = (w: World) => w.leagues.map((l) => { const base = LEAGUES.find((x) => x.id === l.id); return base ? { ...l, name: base.name } : l; });

const realClub = (row: RealClubRow, rep: number): Club => ({
  id: row[0], leagueId: row[1], name: { en: row[2], ar: row[8] }, shortName: row[3], colors: [row[5], row[6]], reputation: rep, budget: 0, wageCap: 0,
  real: row[0], code: row[4],
});

export function generateRealWorld(seed: number, season = FIRST_SEASON, names: NamesMode = BUILD_NAMES): World {
  const base = generateWorld(seed, season);
  let clubs = base.clubs.map((c) => ({ ...c }));
  let players = base.players;
  const byLeague = new Map<string, RealClubRow[]>();
  for (const row of REAL_CLUBS) (byLeague.get(row[1]) ?? byLeague.set(row[1], []).get(row[1])!).push(row);
  const oldRep = new Map(base.clubs.map((c) => [c.id, c.reputation]));
  const drop = new Set<string>();
  const add: Club[] = [];
  const touched = new Set<string>();

  for (const [lid, list] of byLeague) {
    const lg = base.leagues.find((l) => l.id === lid);
    if (!lg) continue;
    touched.add(lid);
    const mapped = new Set(list.map((r) => r[7]).filter(Boolean));
    const full = list.length === lg.clubs;
    if (full) {
      // Old top-flight clubs the data doesn't have were relegated: they move down under their real names.
      const lower = base.leagues.find((l) => l.country === lg.country && l.tier === lg.tier + 1);
      const down = clubs.filter((c) => c.leagueId === lid && !mapped.has(c.id));
      if (lower) {
        touched.add(lower.id);
        const promoted = new Set(list.filter((r) => !r[7]).map((r) => r[2].split(' ')[0].toLowerCase()));
        const pool = clubs.filter((c) => c.leagueId === lower.id)
          .sort((a, b) => Number(promoted.has(b.name.en.split(' ').pop()!.toLowerCase()) || promoted.has(b.name.en.split(' ')[0].toLowerCase())) - Number(promoted.has(a.name.en.split(' ').pop()!.toLowerCase()) || promoted.has(a.name.en.split(' ')[0].toLowerCase())) || a.reputation - b.reputation);
        for (const c of pool.slice(0, down.length)) drop.add(c.id);
        for (const c of down) {
          const rn = REAL_RELEGATED[c.id];
          c.leagueId = lower.id;
          if (rn) { c.name = { en: rn[0], ar: rn[1] }; c.shortName = rn[0]; c.code = rn[2]; }
        }
      } else for (const c of down) drop.add(c.id);
      for (const c of clubs) if (c.leagueId === lid && mapped.has(c.id)) drop.add(c.id);
    } else for (const c of clubs) if (mapped.has(c.id)) drop.add(c.id);
    for (const row of list) add.push(realClub(row, (row[7] && oldRep.get(row[7])) || row[9] || 70));
  }
  clubs = [...clubs.filter((c) => !drop.has(c.id)), ...add];
  players = players.filter((p) => !drop.has(p.clubId));

  // Real squads at the club's level.
  const all = rows();
  const rosters = new Map<number, Row[]>();
  for (const r of all) (rosters.get(r.club) ?? rosters.set(r.club, []).get(r.club)!).push(r);
  const realPlayers: Player[] = [];
  for (const lid of byLeague.keys()) {
    const inLeague = clubs.filter((c) => c.leagueId === lid);
    const reps = inLeague.map((c) => c.reputation);
    const lo = Math.min(...reps), hi = Math.max(...reps);
    const [bottom, top] = RATING_BAND[lid];
    for (const c of inLeague) {
      if (!c.real) continue;
      const idx = REAL_CLUBS.findIndex((r) => r[0] === c.real);
      const f = hi === lo ? 0.5 : (c.reputation - lo) / (hi - lo);
      realPlayers.push(...realSquad(c, rosters.get(idx) ?? [], bottom + (top - bottom) * f, season, seed));
    }
  }
  players = [...players, ...realPlayers];

  // Money: budgets from each club's standing in its league, wage caps from the new wage bills.
  for (const lid of touched) {
    const inLeague = clubs.filter((c) => c.leagueId === lid);
    const reps = inLeague.map((c) => c.reputation);
    const lo = Math.min(...reps), hi = Math.max(...reps);
    for (const c of inLeague) {
      const f = hi === lo ? 0.5 : (c.reputation - lo) / (hi - lo);
      c.budget = round2(TOP_BUDGET[lid] * Math.pow(0.25 + 0.75 * f, 3));
      c.wageCap = round2(players.filter((p) => p.clubId === c.id).reduce((s, p) => s + p.wage, 0) * 1.15);
    }
  }
  for (const c of clubs) if (!c.code) c.code = c.shortName.slice(0, 3).toUpperCase();
  seedElo(clubs, players);
  let world: World = { ...base, leagues: realLeagues(base), clubs, players, data: 'real2026', names: 'real' };
  world = { ...world, managers: makeManagers(world, seed) };
  return names === 'fictional' ? fictionalWorld(world) : world;
}

// ---------- the names switch ----------
// Fictional mode keeps every id, number, colour and rating and swaps the names: clubs take The Gaffer's own
// near-real names, players get invented names chosen from their id (the same every time). It is applied on load as
// well, so a takedown also cleans existing saves. `realNames` puts the real names back from the snapshot.
const FICTIONAL_CLUB = new Map(REAL_CLUBS.map((r) => [r[0], r]));
export function fictionalName(id: string, nat: string): LocalizedName {
  const n = playerName(nat, rngFor(0x5eb4, 'fictional', id));
  return n;
}
export function fictionalWorld(w: World): World {
  const clubs = w.clubs.map((c) => {
    const row = c.real ? FICTIONAL_CLUB.get(c.real) : undefined;
    if (!row) return c;
    const old = row[7] ? CLUB_ROWS[row[1]]?.find((x) => x[0] === row[7]) : undefined;
    return { ...c, name: { en: row[10], ar: old?.[2] ?? row[10] }, shortName: row[11], code: row[12] };
  });
  const players = w.players.map((p) => (p.id.startsWith('p-') ? { ...p, name: fictionalName(p.id, p.nationality), short: undefined } : p));
  return { ...w, leagues: fictionalLeagues(w), clubs, players, names: 'fictional' };
}
export function realNamesWorld(w: World): World {
  if (w.data !== 'real2026') return w;
  const byId = new Map(rows().map((r) => [r.id, r]));
  const clubs = w.clubs.map((c) => {
    const row = c.real ? FICTIONAL_CLUB.get(c.real) : undefined;
    return row ? { ...c, name: { en: row[2], ar: row[8] }, shortName: row[3], code: row[4] } : c;
  });
  const players = w.players.map((p) => { const r = byId.get(p.id); return r ? { ...p, name: { en: r.name, ar: r.name }, short: r.short } : p; });
  return { ...w, leagues: realLeagues(w), clubs, players, names: 'real' };
}
export const withNames = (w: World, mode: NamesMode): World => (w.data !== 'real2026' ? w : mode === 'fictional' ? (w.names === 'fictional' ? w : fictionalWorld(w)) : (w.names === 'real' ? w : realNamesWorld(w)));

// Free agents are never real people in either mode.
export const isReal = (p: Player) => p.id.startsWith('p-') && p.clubId !== FREE_AGENT;
