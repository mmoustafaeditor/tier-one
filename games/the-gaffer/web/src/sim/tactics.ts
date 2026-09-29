// Tactics: formations, the user's XI, style and set-piece takers.
// E2E lesson #1: ONE source for the line-up. The tactics screen, the match and the commentary all read xiFor().
import type { Career, Player, Position } from '../model/types';
import { squadOf, type World } from './world';

export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1';

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
}

// Every instruction filled in: what the engine reads.
export type FullTactics = Required<Omit<Tactics, 'mark'>> & { mark: string | null };
export const fullTactics = (t: Tactics): FullTactics => ({
  formation: t.formation, mentality: t.mentality ?? 0, pressing: t.pressing ?? 1, passing: t.passing ?? 1, fullback: t.fullback ?? 0,
  striker: t.striker ?? 0, trap: t.trap ?? 0, philosophy: t.philosophy ?? 'balanced', line: t.line ?? 1, width: t.width ?? 1,
  tempo: t.tempo ?? 1, counter: !!t.counter, waste: !!t.waste, mark: t.mark ?? null, routine: t.routine ?? 0,
});

// A philosophy is a starting set of instructions; mastery of it is the team's cohesion when playing it.
export type Instructions = Pick<FullTactics, 'mentality' | 'pressing' | 'passing' | 'fullback' | 'striker' | 'trap' | 'line' | 'width' | 'tempo' | 'counter' | 'waste' | 'routine'>;
const BASE: Instructions = { mentality: 0, pressing: 1, passing: 1, fullback: 0, striker: 0, trap: 0, line: 1, width: 1, tempo: 1, counter: false, waste: false, routine: 0 };
export const PRESETS: Record<Philosophy, Instructions> = {
  balanced: BASE,
  possession: { ...BASE, passing: 0, tempo: 0, fullback: 2, width: 1, striker: 2 },
  counter: { ...BASE, mentality: -1, pressing: 0, line: 0, passing: 2, tempo: 2, counter: true },
  gegenpress: { ...BASE, mentality: 1, pressing: 2, line: 2, tempo: 2, striker: 3, trap: 2 },
  bus: { ...BASE, mentality: -2, pressing: 0, line: 0, width: 0, passing: 2, counter: true },
  wings: { ...BASE, width: 2, fullback: 1, routine: 1, trap: 1 },
  direct: { ...BASE, passing: 2, striker: 1, tempo: 2, routine: 1 },
};
export const applyPreset = <X extends Tactics>(t: X, ph: Philosophy): X => ({ ...t, ...PRESETS[ph], philosophy: ph });

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

export const FORMATIONS: Record<FormationId, { slots: Slot[]; attack: number; defence: number }> = {
  '4-3-3': { slots: [...BACK4, s('CDM', 50, 41), s('CM', 70, 53), s('CM', 30, 53), s('RW', 85, 77), s('ST', 50, 85), s('LW', 15, 77)], attack: 1, defence: 0 },
  '4-4-2': { slots: [...BACK4, s('RW', 86, 56), s('CM', 62, 50), s('CM', 38, 50), s('LW', 14, 56), s('ST', 62, 82), s('ST', 38, 82)], attack: 0, defence: 0.5 },
  '4-2-3-1': { slots: [...BACK4, s('CDM', 62, 41), s('CDM', 38, 41), s('RW', 83, 66), s('CAM', 50, 64), s('LW', 17, 66), s('ST', 50, 86)], attack: 0.5, defence: 0.5 },
  '3-5-2': { slots: [s('GK', 50, 7), s('CB', 72, 21), s('CB', 50, 19), s('CB', 28, 21), s('RB', 89, 50), s('CDM', 50, 40), s('CM', 68, 56), s('CM', 32, 56), s('LB', 11, 50), s('ST', 62, 82), s('ST', 38, 82)], attack: 1, defence: -0.5 },
  '5-3-2': { slots: [s('GK', 50, 7), s('RB', 88, 32), s('CB', 70, 20), s('CB', 50, 18), s('CB', 30, 20), s('LB', 12, 32), s('CM', 70, 52), s('CDM', 50, 45), s('CM', 30, 52), s('ST', 62, 80), s('ST', 38, 80)], attack: -1, defence: 1.5 },
  '4-1-4-1': { slots: [...BACK4, s('CDM', 50, 39), s('RW', 85, 60), s('CM', 63, 55), s('CM', 37, 55), s('LW', 15, 60), s('ST', 50, 84)], attack: -0.5, defence: 1 },
};
export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];
// "4-2-3-1" must read left to right in Arabic too: wrap it in Unicode LTR isolate marks.
export const fmt = (f: FormationId) => `\u2066${f}\u2069`;

export const DEFAULT_TACTICS: UserTactics = {
  formation: '4-3-3', mentality: 0, pressing: 1, passing: 1, xi: null, captain: null, penalties: null, freeKicks: null, corners: null,
  fullback: 0, striker: 0, trap: 0, philosophy: 'balanced', line: 1, width: 1, tempo: 1, counter: false, waste: false, mark: null, routine: 0,
};

// ---------- players in slots ----------

export const available = (p: Player) => p.injured === 0 && p.banned === 0;
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

export const slotValue = (p: Player, slot: Position, fitness = p.fitness) => formOf(p, fitness) - fitPenalty(p.position, slot);

// Best XI for a formation: goalkeeper first, then each slot takes its best free player.
export function autoXI(squad: Player[], formation: FormationId): Player[] {
  const ok = squad.filter(available);
  const pool = ok.length >= 11 ? ok : squad;
  const used = new Set<string>();
  const xi: Player[] = [];
  const slots = FORMATIONS[formation].slots;
  const order = slots.map((sl, i) => ({ sl, i })).sort((a, b) => (a.sl.pos === 'GK' ? -1 : b.sl.pos === 'GK' ? 1 : 0));
  const out: (Player | undefined)[] = [];
  for (const { sl, i } of order) {
    const best = pool.filter((p) => !used.has(p.id)).sort((a, b) => slotValue(b, sl.pos) - slotValue(a, sl.pos))[0];
    if (best) { used.add(best.id); out[i] = best; }
  }
  for (const p of out) if (p) xi.push(p);
  return xi;
}

// The user's XI in slot order. Picks the user made are kept while they're still fit, available and at the club;
// any hole is filled with the best available player for that slot. Returns the players and who was replaced.
export function xiFor(w: World, c: Career): { xi: Player[]; replaced: Player[] } {
  const tac = c.tactics ?? DEFAULT_TACTICS;
  // v2.3: players the manager rested for this match stay out of the XI (when there are still eleven others).
  const all = squadOf(w, c.clubId);
  const rest = new Set(c.rested ?? []);
  const squad = rest.size && all.filter((p) => available(p) && !rest.has(p.id)).length >= 11 ? all.filter((p) => !rest.has(p.id)) : all;
  const byId = new Map(squad.map((p) => [p.id, p]));
  if (!tac.xi) return { xi: autoXI(squad, tac.formation), replaced: [] };
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
  const pool = squad.filter((p) => available(p) && !used.has(p.id));
  slots.forEach((sl, i) => {
    if (out[i]) return;
    const best = (pool.length ? pool : squad.filter((p) => !used.has(p.id))).sort((a, b) => slotValue(b, sl.pos) - slotValue(a, sl.pos))[0];
    if (best) { out[i] = best; used.add(best.id); pool.splice(pool.indexOf(best), 1); }
  });
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

// AI clubs: a formation that suits the squad, a philosophy that suits the club, and a plan for this opponent.
// `opp` (the other squad) lets the AI read the matchup the way a manager would: pace in behind slow defenders,
// sit deep and break against a much stronger side, keep the ball against a weaker one.
// `style`: the club's manager's favourite philosophy (v2.1); without one the squad decides as before.
export function aiTactics(squad: Player[], myLevel: number, theirLevel: number, opp?: Player[], style?: Philosophy): Tactics {
  const count = (ps: Position[]) => squad.filter((p) => ps.includes(p.position) && available(p)).length;
  const formation: FormationId = count(['LW', 'RW']) >= 3 ? '4-3-3' : count(['ST']) >= 3 ? '4-4-2' : count(['CAM']) >= 2 ? '4-2-3-1' : '4-1-4-1';
  const gap = myLevel - theirLevel;
  // Big sides keep the ball or press; small ones sit deep or break; the rest mix it (fixed per squad, so a club has an identity).
  const seed = squad.reduce((s, p) => s + p.id.length + p.shirtNumber, 0);
  const philosophy: Philosophy = style ?? (myLevel >= 82 ? (['possession', 'gegenpress', 'wings'] as const)[seed % 3]
    : myLevel <= 68 ? (['bus', 'counter', 'direct'] as const)[seed % 3] : PHILOSOPHIES[1 + (seed % 6)]);
  const t: Tactics = { formation, ...PRESETS[philosophy], philosophy };
  t.mentality = Math.max(-2, Math.min(2, t.mentality + (gap > 5 ? 1 : gap < -6 ? -1 : 0)));
  if (opp?.length) {
    const top = [...opp].filter(available).sort((a, b) => b.rating - a.rating).slice(0, 11);
    const avg = (ps: Player[], a: number) => (ps.length ? ps.reduce((s, p) => s + p.attrs[a], 0) / ps.length : 60);
    const theirBack = top.filter((p) => ['CB', 'LB', 'RB'].includes(p.position));
    const mine = [...squad].filter(available).sort((a, b) => b.rating - a.rating).slice(0, 11);
    const myFront = mine.filter((p) => ['ST', 'LW', 'RW'].includes(p.position));
    // Slow back line and quick forwards: play in behind.
    if (avg(theirBack, 0) + 8 < avg(myFront, 0)) { t.tempo = 2; if (philosophy !== 'possession') t.passing = 2; }
    // A much stronger opponent: drop the line and break.
    if (gap < -7) { t.line = 0; t.counter = true; t.pressing = Math.min(t.pressing, 1) as 0 | 1 | 2; }
  }
  return t;
}
