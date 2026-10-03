// Tactics: formations, the user's XI, style and set-piece takers.
// E2E lesson #1: ONE source for the line-up. The tactics screen, the match and the commentary all read xiFor().
import type { Career, Player, Position } from '../model/types';
import { squadOf, type World } from './world';

export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1' | '3-4-3' | '4-3-1-2' | '3-4-2-1' | '4-2-2-2' | '5-4-1' | '4-4-1-1';

export interface Tactics {
  formation: FormationId;
  mentality: number;   // -2 park the bus … +2 all-out attack
  pressing: 0 | 1 | 2; // low, balanced, high
  passing: 0 | 1 | 2;  // short, mixed, direct
  fullback?: 0 | 1 | 2;     // classic, overlapping, inverted
  striker?: 0 | 1 | 2 | 3;  // advanced, target man, false 9, pressing forward
  trap?: 0 | 1 | 2 | 3;     // none, wings, centre, half-spaces
  philosophy?: Philosophy;
  // Engine v2 instructions (missing = the middle setting, so old saves play exactly as "balanced").
  line?: 0 | 1 | 2;         // defensive line: deep, normal, high
  width?: 0 | 1 | 2;        // in possession: narrow, normal, wide
  tempo?: 0 | 1 | 2;        // slow, normal, fast
  counter?: boolean;        // break forward the moment the ball is won
  waste?: boolean;          // slow every restart down (runs the clock, risks a booking)
  mark?: string | null;     // opponent player id to man-mark
  routine?: 0 | 1 | 2;      // corner routine: mixed, big men up (aerial), short
  // Tactics v3 (all optional: missing = what the engine did before, so every old save plays as it did).
  oop?: FormationId;        // out-of-possession shape (missing = the same as `formation`, the in-possession shape)
  roles?: string[];         // in-possession role per slot of `formation` ('' or missing = the position's default)
  oopRoles?: string[];      // out-of-possession role per slot of `formation` (the player in that slot), for his OOP position
  build?: 0 | 1 | 2;        // build-up: play out from the back, mixed, go long (missing = follows `passing`)
  cpress?: 0 | 1 | 2;       // when we lose it: regroup, balanced, counter-press
  // Marking (foundation step 5, like FM): missing = mixed, the engine as it was.
  marking?: 0 | 1 | 2;      // open play: zonal (hold the shape), mixed, man (each takes his man)
  setMark?: 0 | 1 | 2;      // defending corners and free kicks: zonal, mixed, man
}

// Every instruction filled in: what the engine reads.
export type FullTactics = Required<Omit<Tactics, 'mark' | 'roles' | 'oopRoles'>> & { mark: string | null; roles: string[] | null; oopRoles: string[] | null };
export const fullTactics = (t: Tactics): FullTactics => ({
  formation: t.formation, mentality: t.mentality ?? 0, pressing: t.pressing ?? 1, passing: t.passing ?? 1, fullback: t.fullback ?? 0,
  striker: t.striker ?? 0, trap: t.trap ?? 0, philosophy: t.philosophy ?? 'balanced', line: t.line ?? 1, width: t.width ?? 1,
  tempo: t.tempo ?? 1, counter: !!t.counter, waste: !!t.waste, mark: t.mark ?? null, routine: t.routine ?? 0,
  oop: t.oop && t.oop in FORMATIONS ? t.oop : t.formation, roles: t.roles ?? null, oopRoles: t.oopRoles ?? null,
  build: t.build ?? t.passing ?? 1, cpress: t.cpress ?? 1, marking: t.marking ?? 1, setMark: t.setMark ?? 1,
});

// A philosophy is a starting set of instructions; mastery of it is the team's cohesion when playing it.
export type Instructions = Pick<FullTactics, 'mentality' | 'pressing' | 'passing' | 'fullback' | 'striker' | 'trap' | 'line' | 'width' | 'tempo' | 'counter' | 'waste' | 'routine' | 'build' | 'cpress'>;
const BASE: Instructions = { mentality: 0, pressing: 1, passing: 1, fullback: 0, striker: 0, trap: 0, line: 1, width: 1, tempo: 1, counter: false, waste: false, routine: 0, build: 1, cpress: 1 };
export const PRESETS: Record<Philosophy, Instructions> = {
  balanced: BASE,
  possession: { ...BASE, passing: 0, build: 0, tempo: 0, fullback: 2, width: 1, striker: 2, cpress: 2 },
  counter: { ...BASE, mentality: -1, pressing: 0, line: 0, passing: 2, build: 2, tempo: 2, counter: true, cpress: 0 },
  gegenpress: { ...BASE, mentality: 1, pressing: 2, line: 2, tempo: 2, striker: 3, trap: 2, cpress: 2 },
  bus: { ...BASE, mentality: -2, pressing: 0, line: 0, width: 0, passing: 2, build: 2, counter: true, cpress: 0 },
  wings: { ...BASE, width: 2, fullback: 1, routine: 1, trap: 1 },
  direct: { ...BASE, passing: 2, build: 2, striker: 1, tempo: 2, routine: 1 },
};
// The out-of-possession shape a style drops into from an in-possession shape: wing-backs drop into a back five, a
// deep block adds a fourth midfielder, a counter keeps two up. Everything else defends in the shape it attacks in.
export function oopFor(ip: FormationId, ph: Philosophy): FormationId {
  if (ip === '3-5-2') return ph === 'gegenpress' ? '3-5-2' : '5-3-2';
  if (ip === '3-4-3' || ip === '3-4-2-1') return ph === 'gegenpress' ? ip : '5-4-1';
  if (ph === 'bus' || ph === 'wings') return ip === '5-3-2' || ip === '5-4-1' ? ip : '4-1-4-1';
  if (ph === 'counter') return ip === '4-3-3' || ip === '4-2-3-1' ? '4-4-2' : ip;
  return ip;
}
// A style is a starting set of instructions, roles (from its full-back and striker knobs) and a defensive shape.
export const applyPreset = <X extends Tactics>(t: X, ph: Philosophy): X => ({ ...t, ...PRESETS[ph], philosophy: ph, roles: undefined, oopRoles: undefined, oop: oopFor(t.formation, ph) });

// Playing philosophies (from the old game's list). Each beats two others; mastery grows with every game played with it.
export type Philosophy = 'balanced' | 'possession' | 'counter' | 'gegenpress' | 'bus' | 'wings' | 'direct';
export const PHILOSOPHIES: Philosophy[] = ['balanced', 'possession', 'counter', 'gegenpress', 'bus', 'wings', 'direct'];
export const BEATS: Record<Philosophy, Philosophy[]> = {
  balanced: [], possession: ['bus', 'direct'], counter: ['possession', 'gegenpress'], gegenpress: ['possession', 'wings'],
  bus: ['wings', 'counter'], wings: ['direct', 'bus'], direct: ['gegenpress', 'counter'],
};
// Which philosophy beats `p` (for the counter plan in scouting reports and the assistant's advice).
export const beatenBy = (p: Philosophy): Philosophy[] => PHILOSOPHIES.filter((x) => BEATS[x].includes(p));
// A trap that works against a philosophy: wings trap vs wing play, centre trap vs possession, half-spaces vs direct play.
export const TRAP_VS: Partial<Record<Philosophy, 1 | 2 | 3>> = { wings: 1, possession: 2, direct: 3 };

export interface UserTactics extends Tactics {
  xi: string[] | null; // player id per slot; null = pick the best XI for me
  captain: string | null;
  penalties: string | null;
  freeKicks: string | null;
  corners: string | null;
}

export interface Slot { pos: Position; x: number; y: number }

const s = (pos: Position, x: number, y: number): Slot => ({ pos, x, y });
const BACK4 = [s('GK', 50, 7), s('RB', 86, 26), s('CB', 63, 21), s('CB', 37, 21), s('LB', 14, 26)];
const BACK3 = [s('GK', 50, 7), s('CB', 72, 21), s('CB', 50, 19), s('CB', 28, 21)];

export const FORMATIONS: Record<FormationId, { slots: Slot[]; attack: number; defence: number }> = {
  '4-3-3': { slots: [...BACK4, s('CDM', 50, 41), s('CM', 70, 53), s('CM', 30, 53), s('RW', 85, 77), s('ST', 50, 85), s('LW', 15, 77)], attack: 1, defence: 0 },
  // (B2: the wide men higher and the centre pair a little deeper than the old flat 4-4, which was 7% weaker than every
  // other shape with players who suit it; sim-tests/formations.ts)
  '4-4-2': { slots: [...BACK4, s('RW', 86, 62), s('CM', 62, 45), s('CM', 38, 45), s('LW', 14, 62), s('ST', 62, 82), s('ST', 38, 82)], attack: 0, defence: 0.5 },
  // (B3: the wide men at 62, not 66: with every role at its default it came out 3.5% above the other shapes)
  '4-2-3-1': { slots: [...BACK4, s('CDM', 62, 41), s('CDM', 38, 41), s('RW', 83, 62), s('CAM', 50, 64), s('LW', 17, 62), s('ST', 50, 86)], attack: 0.5, defence: 0.5 },
  '3-5-2': { slots: [s('GK', 50, 7), s('CB', 72, 21), s('CB', 50, 19), s('CB', 28, 21), s('RB', 89, 50), s('CDM', 50, 40), s('CM', 68, 56), s('CM', 32, 56), s('LB', 11, 50), s('ST', 62, 82), s('ST', 38, 82)], attack: 1, defence: -0.5 },
  '5-3-2': { slots: [s('GK', 50, 7), s('RB', 88, 32), s('CB', 70, 20), s('CB', 50, 18), s('CB', 30, 20), s('LB', 12, 32), s('CM', 70, 52), s('CDM', 50, 45), s('CM', 30, 52), s('ST', 62, 80), s('ST', 38, 80)], attack: -1, defence: 1.5 },
  '4-1-4-1': { slots: [...BACK4, s('CDM', 50, 39), s('RW', 85, 60), s('CM', 63, 55), s('CM', 37, 55), s('LW', 15, 60), s('ST', 50, 84)], attack: -0.5, defence: 1 },
  // Plan "خطة قفل الفجوات" B2: six more shapes (FM has many more). Wing-backs are the RB/LB slots pushed up. Where each
  // man stands was chosen so that no shape is a free win: with players who suit it, every shape is within a few per cent
  // of the others' expected points (sim-tests/formations.ts; the engine favours a crowded middle, so narrow shapes keep
  // their wide men wide).
  '3-4-3': { slots: [...BACK3, s('RB', 89, 48), s('CM', 62, 47), s('CM', 38, 47), s('LB', 11, 48), s('RW', 82, 78), s('ST', 50, 86), s('LW', 18, 78)], attack: 1, defence: -0.5 },
  '4-3-1-2': { slots: [...BACK4, s('CDM', 50, 40), s('CM', 74, 55), s('CM', 26, 55), s('CAM', 50, 58), s('ST', 66, 84), s('ST', 34, 84)], attack: 0.5, defence: 0 },
  '3-4-2-1': { slots: [...BACK3, s('RB', 89, 48), s('CM', 62, 38), s('CM', 38, 38), s('LB', 11, 48), s('CAM', 62, 76), s('CAM', 38, 76), s('ST', 50, 86)], attack: 0.5, defence: 0 },
  '4-2-2-2': { slots: [...BACK4, s('CDM', 62, 44), s('CDM', 38, 44), s('RW', 78, 62), s('LW', 22, 62), s('ST', 66, 84), s('ST', 34, 84)], attack: 1, defence: 0 },
  '5-4-1': { slots: [s('GK', 50, 7), s('RB', 88, 32), s('CB', 70, 20), s('CB', 50, 18), s('CB', 30, 20), s('LB', 12, 32), s('RW', 84, 58), s('CM', 62, 40), s('CM', 38, 40), s('LW', 16, 58), s('ST', 50, 84)], attack: -1.5, defence: 2 },
  '4-4-1-1': { slots: [...BACK4, s('RW', 86, 64), s('CM', 62, 44), s('CM', 38, 44), s('LW', 14, 64), s('CAM', 50, 70), s('ST', 50, 85)], attack: 0, defence: 0.5 },
};
export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];
// "4-2-3-1" must read left to right in Arabic too: wrap it in Unicode LTR isolate marks.
export const fmt = (f: FormationId) => `\u2066${f}\u2069`;

export const DEFAULT_TACTICS: UserTactics = {
  formation: '4-3-3', mentality: 0, pressing: 1, passing: 1, xi: null, captain: null, penalties: null, freeKicks: null, corners: null,
  fullback: 0, striker: 0, trap: 0, philosophy: 'balanced', line: 1, width: 1, tempo: 1, counter: false, waste: false, mark: null, routine: 0,
};

// ---------- players in slots ----------

// gf-ref: suspensions are per competition: `banned` is the league's, `sus[cupId]` a cup's (sim/discipline.ts).
export const available = (p: Player) => p.injured === 0 && p.banned === 0;
export const availableIn = (p: Player, cup?: string) => p.injured === 0 && (cup ? !((p.sus?.[cup] ?? 0) > 0) : p.banned === 0);
// F10 (rework): who can play the next match and why the others can't, from the same rule selection uses (availableIn
// for that competition, rested players out). Tired players are available but flagged: fit enough to play, not sharp.
export const MATCH_SHARP = 78;
export type OutWhy = 'injured' | 'banned' | 'rested' | 'tired';
export function availabilityFor(squad: Player[], cup: string | undefined, rested: string[] = []): { available: Player[]; out: { p: Player; why: OutWhy }[] } {
  const rest = new Set(rested);
  const out: { p: Player; why: OutWhy }[] = [];
  const available: Player[] = [];
  for (const p of squad) {
    const why: OutWhy | null = p.injured > 0 ? 'injured' : !availableIn(p, cup) ? 'banned' : rest.has(p.id) ? 'rested' : null;
    if (why) { out.push({ p, why }); continue; }
    available.push(p);
    if (p.fitness < MATCH_SHARP) out.push({ p, why: 'tired' });
  }
  const rank: Record<OutWhy, number> = { injured: 0, banned: 1, rested: 2, tired: 3 };
  out.sort((a, b) => rank[a.why] - rank[b.why] || a.p.fitness - b.p.fitness);
  return { available, out };
}
// Match-day level: a tired or unhappy player plays under his rating.
export const formOf = (p: Player, fitness = p.fitness) => p.rating * (0.75 + 0.25 * (fitness / 100)) + (p.morale - 60) / 20;

const NEAR: Record<Position, Position[]> = {
  GK: [], CB: ['CDM', 'LB', 'RB'], LB: ['RB', 'LW', 'CB'], RB: ['LB', 'RW', 'CB'], CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'],
  CAM: ['CM', 'LW', 'RW', 'ST'], LW: ['RW', 'CAM', 'ST', 'LB'], RW: ['LW', 'CAM', 'ST', 'RB'], ST: ['CAM', 'LW', 'RW'],
};

// Rating lost by playing out of position.
export function fitPenalty(player: Position, slot: Position): number {
  if (player === slot) return 0;
  if (player === 'GK' || slot === 'GK') return 35;
  return NEAR[slot].includes(player) ? 4 : 12;
}

// v2.6: a second position learned in training (p.alt) plays at almost full value (1 point off: still not his first).
export const slotValue = (p: Player, slot: Position, fitness = p.fitness) => formOf(p, fitness) - (p.alt === slot && p.position !== slot ? 1 : fitPenalty(p.position, slot));

// F06 (rework): the best XI is the best eleven together, not slot by slot. The old greedy fill took each slot in order,
// so an early slot could take a man the next slot needed more (Van Dijk at right-back with Frimpong on the bench).
// Now one assignment maximises the summed slot values (Hungarian method, 11 slots × the squad), with a small bonus for
// a player's own position so equal totals keep men where they play.
const NATURAL = 0.5;
const fitValue = (p: Player, pos: Position) => slotValue(p, pos) + (p.position === pos ? NATURAL : 0);
export function assignXI(pool: Player[], positions: Position[]): (Player | undefined)[] {
  const n = positions.length, m = pool.length;
  if (!m) return positions.map(() => undefined);
  if (m < n) {
    // Not enough men for every slot: fill greedily (only happens with a gutted squad).
    const used = new Set<string>();
    return positions.map((pos) => { const b = pool.filter((p) => !used.has(p.id)).sort((a, b) => fitValue(b, pos) - fitValue(a, pos))[0]; if (b) used.add(b.id); return b; });
  }
  // Hungarian (rows = slots, cols = players), minimising cost = -value. O(n²m).
  const cost = positions.map((pos) => pool.map((p) => -fitValue(p, pos)));
  const INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0), pRow = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    pRow[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = pRow[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) { if (used[j]) { u[pRow[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (pRow[j0] !== 0);
    do { const j1 = way[j0]; pRow[j0] = pRow[j1]; j0 = j1; } while (j0);
  }
  const out: (Player | undefined)[] = positions.map(() => undefined);
  for (let j = 1; j <= m; j++) if (pRow[j]) out[pRow[j] - 1] = pool[j - 1];
  return out;
}

// The manager's side: the best eleven together (F06). Used for "Best XI for me", the assistant's pick at kick-off and
// the holes in the manager's own XI.
export function bestXI(squad: Player[], formation: FormationId, cup?: string): Player[] {
  const ok = squad.filter((p) => availableIn(p, cup));
  const pool = ok.length >= 11 ? ok : squad;
  return assignXI(pool, FORMATIONS[formation].slots.map((sl) => sl.pos)).filter(Boolean) as Player[];
}

// The AI clubs' pick (one place to switch it).
export const aiXI = (squad: Player[], formation: FormationId, cup?: string): Player[] => bestXI(squad, formation, cup);

// AI clubs still pick slot by slot, goalkeeper first (the selection every AI result and balance test is calibrated on).
// Moving them to the assignment is a results change for Milestone 4, with its own recalibration (REWORK_PROGRESS.md).
export function autoXI(squad: Player[], formation: FormationId, cup?: string): Player[] {
  const ok = squad.filter((p) => availableIn(p, cup));
  const pool = ok.length >= 11 ? ok : squad;
  const used = new Set<string>();
  const slots = FORMATIONS[formation].slots;
  const order = slots.map((sl, i) => ({ sl, i })).sort((a, b) => (a.sl.pos === 'GK' ? -1 : b.sl.pos === 'GK' ? 1 : 0));
  const out: (Player | undefined)[] = [];
  for (const { sl, i } of order) {
    const best = pool.filter((p) => !used.has(p.id)).sort((a, b) => slotValue(b, sl.pos) - slotValue(a, sl.pos))[0];
    if (best) { used.add(best.id); out[i] = best; }
  }
  return out.filter(Boolean) as Player[];
}

// The user's XI in slot order. Picks the user made are kept while they're still fit, available and at the club;
// any hole is filled with the best available player for that slot. Returns the players and who was replaced.
export function xiFor(w: World, c: Career, cup?: string): { xi: Player[]; replaced: Player[] } {
  const available = (p: Player) => availableIn(p, cup);
  const tac = c.tactics ?? DEFAULT_TACTICS;
  // v2.3: players the manager rested for this match stay out of the XI (when there are still eleven others).
  const all = squadOf(w, c.clubId);
  const rest = new Set(c.rested ?? []);
  const squad = rest.size && all.filter((p) => available(p) && !rest.has(p.id)).length >= 11 ? all.filter((p) => !rest.has(p.id)) : all;
  const byId = new Map(squad.map((p) => [p.id, p]));
  if (!tac.xi) return { xi: bestXI(squad, tac.formation, cup), replaced: [] };
  const slots = FORMATIONS[tac.formation].slots;
  const used = new Set<string>();
  const out: (Player | undefined)[] = [];
  const replaced: Player[] = [];
  tac.xi.forEach((id, i) => {
    const p = byId.get(id);
    if (p && available(p) && !used.has(id) && i < slots.length) { out[i] = p; used.add(id); }
    else {
      const gone = w.players.find((x) => x.id === id);
      if (gone) replaced.push(gone);
    }
  });
  // Holes (no pick, or the pick can't play) are filled together, by the same assignment as the best XI (F06).
  const holes = slots.map((_, i) => i).filter((i) => !out[i]);
  if (holes.length) {
    const free = squad.filter((p) => available(p) && !used.has(p.id));
    const pool = free.length >= holes.length ? free : squad.filter((p) => !used.has(p.id));
    assignXI(pool, holes.map((i) => slots[i].pos)).forEach((p, k) => { if (p) { out[holes[k]] = p; used.add(p.id); } });
  }
  return { xi: out.filter(Boolean) as Player[], replaced };
}

// ---------- set pieces (E2E #24: never all on the goalkeeper) ----------

const bestBy = (ps: Player[], f: (p: Player) => number) => [...ps].filter((p) => p.position !== 'GK').sort((a, b) => f(b) - f(a))[0] ?? ps[0];

export function setPieces(xi: Player[], tac: UserTactics | Tactics, season: number) {
  const inXI = (id: string | null | undefined) => (id ? xi.find((p) => p.id === id) : undefined);
  const u = tac as Partial<UserTactics>;
  return {
    captain: inXI(u.captain) ?? [...xi].sort((a, b) => (b.rating + (season - b.birthYear)) - (a.rating + (season - a.birthYear)))[0],
    penalties: inXI(u.penalties) ?? bestBy(xi, (p) => p.attrs[1]),
    freeKicks: inXI(u.freeKicks) ?? bestBy(xi, (p) => p.attrs[1] + p.attrs[2]),
    corners: inXI(u.corners) ?? bestBy(xi, (p) => p.attrs[2]),
  };
}

// The shape an AI club plays (B2): its style lists the shapes that suit it, its squad rules out the ones it can't fill
// (two strikers, a playmaker, four centre-backs, two wide men), and its own fixed draw picks among the rest, so a club
// keeps its identity. Every shape is within a few per cent of the others with players who suit it.
const STYLE_SHAPES: Record<Philosophy, FormationId[]> = {
  balanced: ['4-3-3', '4-2-3-1', '4-4-2', '4-1-4-1'],
  possession: ['4-3-3', '4-2-3-1', '3-4-2-1', '4-1-4-1'],
  gegenpress: ['4-3-3', '4-2-2-2', '3-4-3', '4-2-3-1'],
  counter: ['4-4-1-1', '4-4-2', '4-2-3-1', '4-3-3'],
  bus: ['5-4-1', '4-1-4-1', '5-3-2'],
  wings: ['4-3-3', '4-4-2', '3-4-3'],
  direct: ['4-4-2', '4-2-2-2', '4-3-1-2', '4-3-3'],
};
function aiShape(count: (ps: Position[]) => number, ph: Philosophy, seed: number): FormationId {
  const n = { wing: count(['LW', 'RW']), st: count(['ST']), cam: count(['CAM']), cb: count(['CB']) };
  const can = (f: FormationId) => {
    const sl = FORMATIONS[f].slots, need = (ps: Position[]) => sl.filter((x) => ps.includes(x.pos)).length;
    return n.st >= need(['ST']) && n.cam >= need(['CAM']) && n.cb >= need(['CB']) + 1 && n.wing >= need(['LW', 'RW']);
  };
  const ok = STYLE_SHAPES[ph].filter(can);
  return ok.length ? ok[seed % ok.length] : '4-3-3';
}
// AI clubs: a formation that suits the squad, a philosophy that suits the club, and a plan for this opponent.
// `opp` (the other squad) lets the AI read the matchup the way a manager would: pace in behind slow defenders,
// sit deep and break against a much stronger side, keep the ball against a weaker one.
// `style`: the club's manager's favourite philosophy (v2.1); without one the squad decides as before.
export function aiTactics(squad: Player[], myLevel: number, theirLevel: number, opp?: Player[], style?: Philosophy, who = ''): Tactics {
  const count = (ps: Position[]) => squad.filter((p) => ps.includes(p.position) && available(p)).length;
  const gap = myLevel - theirLevel;
  // Big sides keep the ball or press; small ones sit deep or break; the rest mix it (fixed per squad, so a club has an identity).
  const seed = squad.reduce((s, p) => s + p.id.length + p.shirtNumber, 0);
  const philosophy: Philosophy = style ?? (myLevel >= 82 ? (['possession', 'gegenpress', 'wings'] as const)[seed % 3]
    : myLevel <= 68 ? (['bus', 'counter', 'direct'] as const)[seed % 3] : PHILOSOPHIES[1 + (seed % 6)]);
  // `who`: the club and its manager, so the shape is his (a new manager may bring another one, as in FM).
  let hs = 2166136261; for (let i = 0; i < who.length; i++) hs = Math.imul(hs ^ who.charCodeAt(i), 16777619) >>> 0;
  const formation = aiShape(count, philosophy, who ? hs : Math.floor(seed / 7));
  const t: Tactics = { formation, ...PRESETS[philosophy], philosophy, oop: oopFor(formation, philosophy) };
  t.mentality = Math.max(-2, Math.min(2, t.mentality + (gap > 5 ? 1 : gap < -6 ? -1 : 0)));
  if (opp?.length) {
    const top = [...opp].filter(available).sort((a, b) => b.rating - a.rating).slice(0, 11);
    const avg = (ps: Player[], a: number) => (ps.length ? ps.reduce((s, p) => s + p.attrs[a], 0) / ps.length : 60);
    const theirBack = top.filter((p) => ['CB', 'LB', 'RB'].includes(p.position));
    const mine = [...squad].filter(available).sort((a, b) => b.rating - a.rating).slice(0, 11);
    const myFront = mine.filter((p) => ['ST', 'LW', 'RW'].includes(p.position));
    // Slow back line and quick forwards: play in behind.
    if (avg(theirBack, 0) + 8 < avg(myFront, 0)) { t.tempo = 2; if (philosophy !== 'possession') { t.passing = 2; t.build = 2; } }
    // A much stronger opponent: drop the line and break.
    if (gap < -7) { t.line = 0; t.counter = true; t.pressing = Math.min(t.pressing, 1) as 0 | 1 | 2; }
    // Marking at set pieces: tall, strong centre-backs take a man each; facing big men in the air, hold zones.
    const air = (ps: Player[]) => avg(ps.filter((p) => p.position === 'CB' || p.position === 'ST'), 5);
    if (air(mine) >= air(top) + 6) t.setMark = 2;
    else if (air(top) >= air(mine) + 6) t.setMark = 0;
  }
  // Marking in open play by style (foundation step 5): deep or possession sides hold zones, pressing sides go man to man.
  t.marking = AI_MARKING[philosophy];
  return t;
}
const AI_MARKING: Record<Philosophy, 0 | 1 | 2> = { balanced: 1, possession: 0, counter: 0, gegenpress: 2, bus: 0, wings: 1, direct: 1 };
