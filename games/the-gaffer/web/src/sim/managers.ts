// V2.8 AI managers with a board (V2_DESIGN §3.8, smallest fun version). Every other club's manager (world.managers,
// name + style + rep) now answers to a board:
//   • at the checkpoints, a third and two thirds of the way through the league, a club 6+ places below where its
//     reputation says it should be sacks its manager half the time (seeded, so the same world always does the same);
//   • at the season's end, a club that missed its objective by 4+ places sacks him.
// The replacement brings his own style (the club's plan changes with him) and it's in the news.
import type { Career, LocalizedName } from '../model/types';
import { PHILOSOPHIES, type Philosophy } from './tactics';
import { playerName } from '../data/names';
import { bell, clamp, int, makeRng } from './rng';
import { objectiveOf, type Manager, type World } from './world';

export const CHECK_BELOW = 6;       // places below expectation that put an AI manager's job on the line mid-season
export const CHECK_CHANCE = 0.5;    // the board acts on it half the time
export const SEASON_MISS = 4;       // places short of the objective at the season's end that end it

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h; };

// A new manager for a club: his style suits the club's size (the same pools as makeManagers).
export function newManager(w: World, clubId: string, r: () => number): Manager {
  const club = w.clubs.find((x) => x.id === clubId)!;
  const lg = w.leagues.find((l) => l.id === club.leagueId)!;
  const style: Philosophy = club.reputation >= 85 ? (['possession', 'gegenpress', 'wings', 'possession'] as const)[int(r, 0, 3)]
    : club.reputation <= 68 ? (['bus', 'counter', 'direct', 'balanced'] as const)[int(r, 0, 3)] : PHILOSOPHIES[int(r, 0, PHILOSOPHIES.length - 1)];
  return { name: playerName(r() < 0.6 ? lg.country : ['ESP', 'POR', 'ITA', 'GER', 'FRA', 'ENG'][int(r, 0, 5)], r), style, rep: clamp(Math.round(club.reputation - 10 + bell(r) * 8), 20, 95) };
}

export interface Change { clubId: string; out: LocalizedName; in: LocalizedName }

// Positions in each league now, and where each club "should" be (by reputation).
function standings(w: World, leagueId: string, table: (lid: string) => { clubId: string }[]) {
  const rows = table(leagueId);
  const byRep = [...rows].sort((a, b) => w.clubs.find((x) => x.id === b.clubId)!.reputation - w.clubs.find((x) => x.id === a.clubId)!.reputation);
  return rows.map((row, i) => ({ clubId: row.clubId, pos: i + 1, expected: byRep.findIndex((x) => x.clubId === row.clubId) + 1 }));
}

// Mid-season checkpoints: call after each league matchday with the matchday just played (1-based count of rounds).
export function aiCheckpoint(w: World, c: Career, played: number, table: (lid: string) => { clubId: string }[]): { world: World; changes: Change[] } {
  const managers = { ...(w.managers ?? {}) };
  const changes: Change[] = [];
  for (const lg of w.leagues) {
    const rounds = (c.fixtures[lg.id] ?? []).length;
    if (!rounds || (played !== Math.floor(rounds / 3) && played !== Math.floor((2 * rounds) / 3))) continue;
    for (const s of standings(w, lg.id, table)) {
      if (s.clubId === c.clubId || !managers[s.clubId] || s.pos - s.expected < CHECK_BELOW) continue;
      const r = makeRng(hash(`${c.seed}:${c.season}:${played}:${s.clubId}`));
      if (r() >= CHECK_CHANCE) continue;
      const next = newManager(w, s.clubId, r);
      changes.push({ clubId: s.clubId, out: managers[s.clubId].name, in: next.name });
      managers[s.clubId] = next;
    }
  }
  return { world: changes.length ? { ...w, managers } : w, changes };
}

// The season's end: missed the objective by SEASON_MISS places or more.
export function aiSeasonEnd(w: World, c: Career, table: (lid: string) => { clubId: string }[], met: (o: ReturnType<typeof objectiveOf>, pos: number, n: number) => boolean): { world: World; changes: Change[] } {
  const managers = { ...(w.managers ?? {}) };
  const changes: Change[] = [];
  for (const lg of w.leagues) {
    const rows = table(lg.id);
    rows.forEach((row, i) => {
      if (row.clubId === c.clubId || !managers[row.clubId]) return;
      const obj = objectiveOf(w, w.clubs.find((x) => x.id === row.clubId)!);
      let short = 0;
      while (!met(obj, i + 1 - short, rows.length) && i + 1 - short > 1) short++;
      if (short < SEASON_MISS) return;
      const next = newManager(w, row.clubId, makeRng(hash(`${c.seed}:${c.season}:end:${row.clubId}`)));
      changes.push({ clubId: row.clubId, out: managers[row.clubId].name, in: next.name });
      managers[row.clubId] = next;
    });
  }
  return { world: changes.length ? { ...w, managers } : w, changes };
}
