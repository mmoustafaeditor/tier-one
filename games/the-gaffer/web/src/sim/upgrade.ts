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
import { deptsFromDuties } from './delegation';
import { seedAcademies } from './youth';
import { addMsg } from './coach';
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
export const SAVE_VERSION = 8;

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

// 3 → 4 (v2.0–v2.3, "connected core"). Documented defaults:
//  - the event log starts empty (tickSeq 0); inbox, news and staff-log items from before have no `ev` and show as they did;
//  - delegation: the 13 on/off duties become 7 departments, any duty switched on → that department on 'staff', else 'me'
//    (so an old career behaves exactly as before); no pending staff proposals;
//  - development points are retired: points left over become a one-off +5 morale for the squad (V2_DESIGN §3.5);
//  - the world is marked 'generated' with fictional names (old careers stay fictional; there is no conversion to the
//    real 2026/27 world, the title screen offers a new 2026/27 career in a second slot instead);
//  - no match records, pulse, rests, Plan B or weekly focus yet; they fill in from the next matchday.
function upgrade3(s: SaveFile): SaveFile {
  const w = { ...(s.world as World), data: (s.world as World).data ?? 'generated' as const, names: (s.world as World).names ?? 'fictional' as const };
  const c = s.career;
  if (!c) return { ...s, version: 4, world: w };
  let players = w.players;
  const dev = c.ops?.devPoints ?? 0;
  if (dev > 0) players = players.map((p) => (p.clubId === c.clubId ? { ...p, morale: Math.min(100, p.morale + 5) } : p));
  const career: Career = {
    ...c, events: c.events ?? [], tickSeq: c.tickSeq ?? 0, dept: c.dept ?? deptsFromDuties(c.delegate), pending: c.pending ?? [], done: c.done ?? {},
    data: c.data ?? 'generated', names: c.names ?? 'fictional', matches: c.matches ?? [], pulse: c.pulse ?? [], rested: c.rested ?? [],
    ops: c.ops ? { ...c.ops, devPoints: 0 } : c.ops,
  };
  return { ...s, version: 4, world: { ...w, players }, career };
}
UPGRADES[3] = upgrade3;

// 7 → 8 (V2.6 "Training & pathway"). Written to run after 6 (dressing room) and 7 (recruitment) or without them: it reads
// nothing they add. Documented defaults:
//  - the academy becomes a world squad: `ops.academy` (and every managed club's in world.clubOps) moves to
//    world.academy with the club's id; every other club gets a seeded academy of 4–6 kids (sim/youth.ts seedAcademies);
//  - development points are retired for good: any left (in ops or a managed club's ops) become a one-off +5 squad morale
//    and a note in the inbox (v4 already did this for most saves; this catches the rest);
//  - load, recent minutes and rating history start empty and fill in from the next matchday (the profile curve shows
//    real samples only, starting from here); no individual position plans; no Intake Day prepared yet (the preview
//    fires ten matchdays before this season's Intake Day, or next season's if it has passed).
function upgrade7(s: SaveFile): SaveFile {
  const c = s.career;
  const w0 = s.world as World;
  if (!c) return { ...s, version: 8 };
  const academy: Player[] = [...(w0.academy ?? [])];
  const has = new Set([...academy.map((p) => p.id), ...w0.players.map((p) => p.id)]);
  const take = (kids: Player[] | undefined, clubId: string) => { for (const k of kids ?? []) if (!has.has(k.id)) { has.add(k.id); academy.push({ ...k, clubId, shirtNumber: 0, hg: k.hg ?? clubId }); } };
  take(c.ops?.academy, c.clubId);
  const clubOps = w0.clubOps ? Object.fromEntries(Object.entries(w0.clubOps).map(([id, o]) => { take(o.academy, id); return [id, { ...o, academy: [], devPoints: 0 }]; })) : w0.clubOps;
  const dev = (c.ops?.devPoints ?? 0) + Object.values(w0.clubOps ?? {}).reduce((a, o) => a + (o.devPoints ?? 0), 0);
  let players = w0.players;
  if (dev > 0) players = players.map((p) => (p.clubId === c.clubId ? { ...p, morale: Math.min(100, p.morale + 5) } : p));
  let world: World = { ...w0, players, academy, ...(clubOps ? { clubOps } : {}) };
  let career: Career = { ...c, ops: c.ops ? { ...c.ops, academy: [], devPoints: 0 } : c.ops };
  world = seedAcademies(world, career);
  if (dev > 0) career = addMsg(career, 'club', 'y_devGone', { n: dev });
  return { ...s, version: 8, world, career };
}
UPGRADES[7] = upgrade7;

export function upgradeSave(s: SaveFile): SaveFile {
  let out = s;
  while (out.version < SAVE_VERSION) {
    const step = UPGRADES[out.version];
    // Three lanes add steps 6, 7 and 8 in parallel: a version with no step of its own (yet) carries over unchanged.
    out = step ? step(out) : { ...out, version: out.version + 1 };
  }
  return out;
}
