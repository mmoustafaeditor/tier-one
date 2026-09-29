// Brings saves from older builds up to date. Runs only AFTER the checksum has been verified,
// so it can never turn an edited save into a valid one.
// Two layers: `upgradeWorld`/`upgradeCareer` fill in fields by presence (every save before G1 said "version 1"
// whatever it held), then `UPGRADES` moves the file's `version` number up one explicit step at a time.
import { FREE_AGENT, type Career, type Player, type SaveFile } from '../model/types';
import { makeRng } from './rng';
import { seasonFixtures } from './season';
import { makeCups } from './cups';
import { newCoach } from './coach';
import { ensureDirector, newOps } from './economy';
import { makeAttrs, makeFreeAgents, seedElo, type World } from './world';
import { ensureV2 } from './match';

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

export function upgradeWorld(w: World, season: number): World {
  let players: Player[] = w.players;
  if (players.some((p) => !Array.isArray(p.attrs) || typeof p.fitness !== 'number')) {
    // v0.3 and older: add attributes and match condition.
    players = players.map((p) => (Array.isArray(p.attrs) && typeof p.fitness === 'number' ? p : {
      ...p, attrs: makeAttrs(makeRng(hash(p.id)), p.rating, p.position), fitness: 100, morale: 65, injured: 0, banned: 0,
    }));
  }
  if (!players.some((p) => p.clubId === FREE_AGENT)) players = [...players, ...makeFreeAgents(makeRng(season), season, 160)];
  const clubs = w.clubs.some((c) => typeof c.wageCap !== 'number')
    ? w.clubs.map((c) => (typeof c.wageCap === 'number' ? c : {
        ...c, wageCap: Math.round(players.filter((p) => p.clubId === c.id).reduce((s, p) => s + p.wage, 0) * 1.15),
      }))
    : w.clubs;
  if (clubs.some((c) => c.elo === undefined)) { const cs = clubs.map((c) => ({ ...c })); seedElo(cs, players); return { ...w, players, clubs: cs }; }
  return players === w.players && clubs === w.clubs ? w : { ...w, players, clubs };
}

type OldCareer = Career & { goals?: Record<string, number> };

export function upgradeCareer(w: World, c: OldCareer): Career {
  let next: OldCareer = c;
  // v0.2: no fixtures yet.
  if (!next.fixtures || !next.history) next = { ...next, round: 0, fixtures: seasonFixtures(w, next.seed, next.season), history: [] };
  // v0.3: goals only; v0.4 keeps [apps, goals, assists, yellows, reds].
  if (!next.stats) {
    const stats: Career['stats'] = {};
    for (const [id, g] of Object.entries(next.goals ?? {})) stats[id] = [0, g, 0, 0, 0];
    next = { ...next, stats };
  }
  if (!next.offers) next = { ...next, offers: [] };
  if (!next.deals) next = { ...next, deals: [] };
  // v0.5: no cups or coach yet. Cups start from the current matchday on.
  if (!next.cups) next = { ...next, cups: makeCups(w, next, null, next.round + 1), cupDay: next.round - 1 };
  if (!next.coach) next = { ...next, coach: newCoach(w.clubs.find((x) => x.id === next.clubId)!) };
  if (!next.board) next = { ...next, board: { confidence: 60, fans: 55 } };
  if (!next.inbox) next = { ...next, inbox: [] };
  if (!next.jobs) next = { ...next, jobs: [] };
  // v0.6: no club operations yet.
  if (!next.ops) next = { ...next, ops: newOps(w, w.clubs.find((x) => x.id === next.clubId)!, next.season) };
  if (!next.mastery) next = { ...next, mastery: { balanced: 100 } };
  // v0.12: the sporting director (staff delegation).
  next = ensureDirector(w, next) as OldCareer;
  const { goals: _drop, ...clean } = next;
  void _drop;
  return clean;
}

// ---------- file versions ----------

// The version `makeSave` writes. Bump it together with a new entry in UPGRADES.
export const SAVE_VERSION = 3;

// One step each: UPGRADES[n] turns a version-n file into version n+1. Applied in order by `upgradeSave`.
export const UPGRADES: Record<number, (s: SaveFile) => SaveFile> = {
  // 1 → 2 (G1 "Integrity"): the v0.12 career fields exist explicitly instead of being "maybe there", so the
  // career-level checks in sim/save.ts can read them without guessing.
  1: (s) => ({
    ...s,
    version: 2,
    career: s.career ? { shortlist: [], watch: {}, loans: [], delegate: {}, staffLog: [], ...s.career } : null,
  }),
  // 2 → 3 (match engine v2): the new instructions are written out at their middle setting (so an old tactic plays
  // exactly as it did), and a match saved half-way through by the v1 engine carries on under v2 with its stats kept.
  2: (s) => {
    const c = s.career;
    if (!c) return { ...s, version: 3 };
    const tactics = c.tactics ? { line: 1 as const, width: 1 as const, tempo: 1 as const, counter: false, waste: false, mark: null, routine: 0 as const, ...c.tactics } : c.tactics;
    const live = c.live ? JSON.parse(JSON.stringify(c.live)) : c.live;
    if (live) ensureV2(live);
    return { ...s, version: 3, career: { ...c, tactics, live } };
  },
};

export function upgradeSave(s: SaveFile): SaveFile {
  let out = s;
  while (out.version < SAVE_VERSION) {
    const step = UPGRADES[out.version];
    if (!step) throw new Error(`no upgrade from save version ${out.version}`);
    out = step(out);
  }
  return out;
}
