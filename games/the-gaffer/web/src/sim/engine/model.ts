// Engine v2 — DECISION layer: who is where, who contests what, and with which odds.
//
// The pitch is 6 columns (own goal → their goal) × 5 rows (left touchline → right). Each side has two shapes built from
// its formation and instructions: in possession (IP) and out of possession (OOP). A possession moves through a small
// graph of phases (build-up, progression by lane, the final third by lane, crosses, through balls, counters, set
// pieces, shots). Every phase is a CONTEST between the players the two shapes put in that zone, so formation and
// instructions change who is there and how many, and attributes decide who wins.
//
// The same graph is used three ways, so they can never disagree:
//   • FULL play (the user's match) samples a pair of players per contest and records who won,
//   • FAST play (every other match) samples the contest's average odds,
//   • solve() computes the exact long-run expectations (predict(), the board's expected points, suggestions).
import type { Player, Position } from '../../model/types';
import { FORMATIONS, fitPenalty, fullTactics, type FullTactics, type Tactics } from '../tactics';

export type Get = (id: string) => Player;

// ---------- shots ----------
export const SHOTS = ['box', 'cutback', 'header', 'through', 'counter', 'press', 'long', 'corner', 'set', 'fk', 'pen'] as const;
export type ShotType = typeof SHOTS[number];
// Chance quality (xG) of each kind of shot for an average finisher against an average keeper.
export const XG0 = [0.105, 0.12, 0.085, 0.29, 0.19, 0.14, 0.034, 0.07, 0.06, 0.055, 0.76];
const BLOCK = [0.28, 0.2, 0.04, 0.05, 0.12, 0.18, 0.34, 0.06, 0.06, 0.24, 0];
const ONT = [0.36, 0.36, 0.3, 0.46, 0.4, 0.38, 0.3, 0.3, 0.3, 0.4, 0.62];

// Every chance is a little different: its xG (and the chance of scoring it) is the kind's value × one of these
// (mean 1), so there are tap-ins and half-chances within each kind. Penalties are all the same.
export const QUAL = [0.4, 0.7, 1, 1.5, 2.8];
export const QUAL_W = [0.3, 0.25, 0.2, 0.15, 0.1];

// ---------- nodes of the possession graph ----------
export const N = {
  B: 0, LONG: 1, PCH: 2, P0: 3, P1: 4, P2: 5, FCH: 6, F0: 7, F1: 8, F2: 9, THR: 10, CRS: 11, FK: 12, SETH: 13, CRN: 14, CTR: 15,
  RMID: 16, RHIGH: 17, SHOT: 18,
} as const;
export const NODES = 18 + SHOTS.length;
export const START = [N.B, N.RMID, N.RHIGH]; // how a possession starts: settled, won in midfield, won high up
export const END = 100;                      // edges to END + s hand the ball over: the opponent starts at START[s]

// Edge events.
export const EV = { FOUL: 1, CORNER: 2, OFFSIDE: 3, TFOUL: 4, GOAL: 5, SAVE: 6, BLOCK: 7, MISS: 8, PENFOUL: 9 } as const;

export interface Edge { p: number; to: number; ev?: number; dt?: number }
export interface Actor {
  id: string; slot: number; pos: Position;
  a: number[];           // attributes as they play right now: fitness, form, morale, position, home crowd
  x: number; y: number;  // in possession (own frame: y 0 = own goal, x 0 = left touchline)
  ox: number; oy: number; // out of possession
  f: number;             // role flags (F_*)
}
export const F_GK = 1, F_DEF = 2, F_FB = 4, F_WING = 8, F_MID = 16, F_ST = 32;
const flagsOf = (pos: Position) => (pos === 'GK' ? F_GK : pos === 'CB' ? F_DEF : pos === 'LB' || pos === 'RB' ? F_DEF | F_FB
  : pos === 'LW' || pos === 'RW' ? F_WING : pos === 'ST' ? F_ST : F_MID);
export interface Duel {
  a: Actor[]; wa: number[]; d: Actor[]; wd: number[];
  p: number[];      // a × d: the attacker's chance in each pairing
  mean: number;     // the contest's odds (what FAST play and solve() use)
  na: number; nd: number; // numbers in the zone (weighted)
}
export interface Node { t: number; alt: Edge[]; duel?: Duel; win?: Edge[]; lose?: Edge[]; shot?: number }
export interface ShotTable { ids: string[]; w: number[]; conv: number[]; mean: number }
export interface Attack {
  side: 0 | 1;
  nodes: Node[];
  xg: number[];            // per shot type (context adjusted)
  shooters: ShotTable[];   // per shot type
  keeper: string;          // the opponent's keeper
  creators: { ids: string[]; w: number[] }; // assist candidates when the story doesn't say
  exposure: number;        // how open this side leaves itself when it loses the ball (read by the other side's counters)
  foulCard: number;        // chance a foul by the OTHER side (defending this attack) is booked
}
export interface Model { att: [Attack, Attack]; actors: [Actor[], Actor[]] }

// ---------- helpers ----------
const sig = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
// Soft edges (linear ramps: cheap, and smooth enough for weights).
const pw15 = (v: number) => v * Math.sqrt(v);
const ramp = (d: number, h: number) => (d <= -h ? 0 : d >= h ? 1 : 0.5 + d / (2 * h));
const band = (y: number, lo: number, hi: number) => ramp(y - lo, 10) * ramp(hi - y, 10);
const laneW = (x: number, l: number) => { const L = ramp(33 - x, 12), R = ramp(x - 67, 12); return l === 0 ? L : l === 2 ? R : Math.max(0, 1 - L - R); };

// Skill mixes, attribute order [pace, shooting, passing, dribbling, defending, physical, goalkeeping].
const S = {
  comp: (a: number[]) => 0.5 * a[2] + 0.25 * a[3] + 0.25 * a[5],     // playing out under pressure
  press: (a: number[]) => 0.4 * a[0] + 0.3 * a[5] + 0.3 * a[4],
  prog: (a: number[]) => 0.45 * a[2] + 0.3 * a[3] + 0.25 * a[0],
  screen: (a: number[]) => 0.55 * a[4] + 0.25 * a[0] + 0.2 * a[5],
  wingA: (a: number[]) => 0.4 * a[3] + 0.35 * a[0] + 0.25 * a[2],
  wingD: (a: number[]) => 0.55 * a[4] + 0.35 * a[0] + 0.1 * a[5],
  create: (a: number[]) => 0.45 * a[2] + 0.35 * a[3] + 0.2 * a[1],
  block: (a: number[]) => 0.6 * a[4] + 0.2 * a[5] + 0.2 * a[0],
  run: (a: number[]) => 0.65 * a[0] + 0.35 * a[3],
  chase: (a: number[]) => 0.6 * a[0] + 0.4 * a[4],
  airA: (a: number[]) => 0.65 * a[5] + 0.35 * a[1],
  airD: (a: number[]) => 0.6 * a[5] + 0.4 * a[4],
  brk: (a: number[]) => 0.5 * a[0] + 0.3 * a[3] + 0.2 * a[2],
  recover: (a: number[]) => 0.55 * a[0] + 0.45 * a[4],
  target: (a: number[]) => 0.55 * a[5] + 0.45 * a[0],
  hold: (a: number[]) => 0.45 * a[5] + 0.35 * a[4] + 0.2 * a[0],
};
export const SKILL = S;

// The engine's tuning in one place (logit units; 10 attribute points ≈ K).
export const TUNE = {
  K: 0.42, SUP: 0.28, HOME: 1.6,
  base: { B: 1.25, LONG: -0.35, P: 0.0, FLANK: -0.95, HEAD: -1.0, THR: -1.3, COMBO: -1.05, CTR: -1.5, HIGH: -1.9, CRN: -0.95 },
  time: { B: 10, LONG: 5, P: 8, F: 6, THR: 3, CRS: 3, SETH: 3, CRN: 2, CTR: 7, RMID: 2, RHIGH: 3, SHOT: 1 },
  dead: { GOAL: 55, FOUL: 18, CARD: 16, CORNER: 22, OFF: 16, MISS: 16, HELD: 5, PEN: 30 },
};

// ---------- players as the engine sees them ----------

export interface SideInput {
  xi: (Player | null)[]; // per slot, null = empty (red card, no subs)
  tactics: Tactics;
  fit: (id: string) => number;
  bonus: number;         // rating points: home crowd, form, captain, assistant, difficulty
  cohesion: number;      // logit: mastery of the philosophy
  talk: number;          // 0 none, 1 fire up, 2 calm down, 3 focus
  mark: string | null;   // the opponent this side man-marks
  foulK?: number;        // gf-ref: how many fouls this side commits (referee.ts foulFactor); missing = 1
}

// Where a player stands in each phase, from his slot and the instructions.
function shape(pos: Position, sx: number, sy: number, t: FullTactics): [number, number, number, number] {
  let x = sx, y = sy;
  const fl = flagsOf(pos);
  const gk = !!(fl & F_GK), def = !!(fl & F_DEF), fb = !!(fl & F_FB), st = !!(fl & F_ST), wing = !!(fl & F_WING), mid = !!(fl & F_MID);
  if (!gk) {
    y += (fb ? 3 : def ? 2 : 4) * t.mentality;
    if (fb && t.fullback === 1) { y += 24; x = x < 50 ? 7 : 93; }
    if (fb && t.fullback === 2) { y += 12; x = x < 50 ? 36 : 64; }
    if (st && t.striker === 2) y -= 17;
    if (st && t.striker === 1) y += 3;
    x = 50 + (x - 50) * [0.78, 1, 1.16][t.width];
    if (wing) x = 50 + (x - 50) * [0.85, 1, 1.06][t.width];
    if (def) y += [-4, 0, 6][t.line];
    if (t.counter && mid) y -= 3;
    if (t.passing === 2 && (st || wing)) y += 3;
  }
  let oy = gk ? 5 : 8 + sy * 0.78;
  const ox = gk ? 50 : 50 + (sx - 50) * 0.82;
  if (def) oy += [-6, 0, 9][t.line];
  else if (!gk) oy += [-9, 0, 9][t.pressing] + 2 * t.mentality + (st && t.striker === 3 ? 7 : 0);
  return [clamp(x, 2, 98), clamp(y, 2, 98), clamp(ox, 2, 98), clamp(oy, 2, 98)];
}

export function actorsOf(inp: SideInput): Actor[] {
  const t = fullTactics(inp.tactics);
  const slots = FORMATIONS[t.formation].slots;
  const out: Actor[] = [];
  inp.xi.forEach((p, k) => {
    if (!p || !slots[k]) return;
    const sl = slots[k];
    const fit = inp.fit(p.id) / 100;
    const phys = 0.72 + 0.28 * fit, tech = 0.9 + 0.1 * fit;
    const pen = fitPenalty(p.position, sl.pos) * 0.8;
    const b = inp.bonus + (p.morale - 60) / 20 - pen;
    const a = p.attrs.map((v, i) => (i === 0 || i === 5 ? v * phys : v * tech) + b);
    const [x, y, ox, oy] = shape(sl.pos, sl.x, sl.y, t);
    out.push({ id: p.id, slot: k, pos: sl.pos, a, x, y, ox, oy, f: flagsOf(sl.pos) });
  });
  return out;
}

// ---------- contests ----------

// The three players most involved (by weight), and the total weight (numbers in the zone).
function pickTop(xs: Actor[], w: number[]): { list: Actor[]; ws: number[]; n: number } {
  let n = 0;
  let i0 = -1, i1 = -1, i2 = -1, v0 = 0, v1 = 0, v2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const q = w[i];
    if (q <= 0.02) continue;
    n += q;
    if (q > v0) { i2 = i1; v2 = v1; i1 = i0; v1 = v0; i0 = i; v0 = q; }
    else if (q > v1) { i2 = i1; v2 = v1; i1 = i; v1 = q; }
    else if (q > v2) { i2 = i; v2 = q; }
  }
  const tot = v0 + v1 + v2 || 1;
  const list: Actor[] = [], ws: number[] = [];
  if (i0 >= 0) { list.push(xs[i0]); ws.push(v0 / tot); }
  if (i1 >= 0) { list.push(xs[i1]); ws.push(v1 / tot); }
  if (i2 >= 0) { list.push(xs[i2]); ws.push(v2 / tot); }
  return { list, ws, n };
}

const GHOST: Actor = { id: '', slot: -1, pos: 'CB', a: [45, 45, 45, 45, 45, 45, 20], x: 50, y: 50, ox: 50, oy: 50, f: F_DEF };

function duel(A: Actor[], wA: number[], sA: (a: number[]) => number, D: Actor[], wD: number[], sD: (a: number[]) => number,
  base: number, markId: string | null = null, supScale = 1): Duel {
  const at = pickTop(A, wA), df = pickTop(D, wD);
  if (!at.list.length) { at.list = [A[A.length - 1] ?? GHOST]; at.ws = [1]; }
  if (df.n < 0.25) { const k = df.n / 0.25; df.ws = df.ws.map((w) => w * k); df.list.push(GHOST); df.ws.push(1 - k); }
  const sup = clamp(at.n - df.n, -2.2, 2.2) * TUNE.SUP * supScale;
  const sd = df.list.map((d) => sD(d.a));
  const p: number[] = [];
  let mean = 0;
  for (let i = 0; i < at.list.length; i++) {
    const a = at.list[i];
    const sa = sA(a.a) + (a.id === markId ? -9 : 0);
    for (let j = 0; j < sd.length; j++) {
      const v = sig(base + sup + TUNE.K * (sa - sd[j]) / 10);
      p.push(v);
      mean += at.ws[i] * df.ws[j] * v;
    }
  }
  return { a: at.list, wa: at.ws, d: df.list, wd: df.ws, p, mean, na: at.n, nd: df.n };
}

// Contest zones: how much each player is involved in each contest (rows), computed once per model.
const Z = { B: 0, P0: 1, P1: 2, P2: 3, LONG: 4, FL: 5, FR: 6, COMBO: 7, THR: 8, BOX: 9, SET: 10, CTR: 11, HIGH: 12 } as const;
const NZ = 13;
function zonesA(A: Actor[], t: FullTactics, cornerTaker: string): number[][] {
  const rows: number[][] = [];
  for (let k = 0; k < NZ; k++) rows.push(new Array(A.length).fill(0));
  A.forEach((x, i) => {
    const gk = x.f & F_GK;
    rows[Z.B][i] = band(x.y, -10, 40) * (gk ? (t.passing === 0 ? 0.6 : 0.25) : 1);
    if (gk) return;
    const st = x.f & F_ST, wing = x.f & F_WING, def = x.f & F_DEF;
    const bp = band(x.y, 30, 72);
    for (let l = 0; l < 3; l++) rows[Z.P0 + l][i] = bp * laneW(x.x, l);
    rows[Z.LONG][i] = band(x.y, 60, 110) * (st ? (t.striker === 1 ? 2.2 : 1.4) : 1);
    const bf = band(x.y, 58, 104) * ((x.f & (F_WING | F_FB)) ? 1.2 : 0.7);
    rows[Z.FL][i] = bf * laneW(x.x, 0); rows[Z.FR][i] = bf * laneW(x.x, 2);
    rows[Z.COMBO][i] = band(x.y, 60, 104) * laneW(x.x, 1);
    rows[Z.THR][i] = band(x.y, 66, 110) * (st ? 1.5 : wing ? 1.1 : 0.5);
    rows[Z.BOX][i] = def ? 0 : band(x.y, 74, 110) * (st ? (t.striker === 1 ? 1.6 : 1.2) : 0.8);
    rows[Z.SET][i] = x.id === cornerTaker ? 0 : x.pos === 'CB' ? (t.routine === 1 ? 1.6 : 1) : st ? 1.2 : 0.5;
    rows[Z.CTR][i] = band(x.y, 45, 110) * (wing || st ? 1.3 : 0.7);
    rows[Z.HIGH][i] = band(x.y, 55, 110);
  });
  return rows;
}
// The defending side in the attacker's frame: its out-of-possession shape, or its in-possession shape for transitions.
function zonesD(D: Actor[], t: FullTactics): number[][] {
  const rows: number[][] = [];
  for (let k = 0; k < NZ; k++) rows.push(new Array(D.length).fill(0));
  const engage = [0.5, 0.85, 1.2][t.pressing] + (t.striker === 3 ? 0.1 : 0);
  D.forEach((d, i) => {
    if (d.f & F_GK) return;
    const my = 100 - d.oy, mx = 100 - d.ox, iy = 100 - d.y, ix = 100 - d.x;
    const def = d.f & F_DEF, fb = d.f & F_FB, wing = d.f & F_WING;
    rows[Z.B][i] = band(my, -10, 40) * engage;
    const bp = band(my, 30, 72);
    for (let l = 0; l < 3; l++) rows[Z.P0 + l][i] = bp * laneW(mx, l);
    rows[Z.LONG][i] = band(my, 60, 110) * (def ? 1.3 : 1);
    const bf = band(my, 58, 104) * (fb ? 1.3 : wing ? 0.8 : 0.6);
    rows[Z.FL][i] = bf * laneW(mx, 0); rows[Z.FR][i] = bf * laneW(mx, 2);
    rows[Z.COMBO][i] = band(my, 60, 104) * laneW(mx, 1);
    rows[Z.THR][i] = def ? band(my, 55, 105) : 0;
    rows[Z.BOX][i] = band(my, 72, 110) * (def ? 1.2 : 0.6);
    rows[Z.SET][i] = def ? 1.2 : d.pos === 'CDM' || d.pos === 'ST' ? 0.8 : 0.4;
    rows[Z.CTR][i] = band(iy, 50, 110) * (def ? 1.2 : 0.7);
    const bh = band(iy, 60, 110);
    rows[Z.HIGH][i] = bh * laneW(ix, 1) + 0.3 * bh;
  });
  return rows;
}

// ---------- one side's attack ----------

const ROLE_SHOT: Record<Position, number> = { GK: 0, CB: 0.15, LB: 0.25, RB: 0.25, CDM: 0.5, CM: 1, CAM: 2.2, LW: 2.4, RW: 2.4, ST: 3.4 };
const ROLE_LONG: Record<Position, number> = { GK: 0, CB: 0.2, LB: 0.4, RB: 0.4, CDM: 1.2, CM: 2, CAM: 2.2, LW: 1, RW: 1, ST: 0.7 };
const ROLE_ASSIST: Record<Position, number> = { GK: 0.02, CB: 0.3, LB: 1, RB: 1, CDM: 0.8, CM: 2, CAM: 3.2, LW: 2.8, RW: 2.8, ST: 1.4 };

export interface Pieces { penalties: string; freeKicks: string; corners: string }

function table(ids: string[], w: number[], conv: number[]): ShotTable {
  const tot = w.reduce((s, x) => s + x, 0) || 1;
  const ws = w.map((x) => x / tot);
  return { ids, w: ws, conv, mean: ws.reduce((s, x, i) => s + x * conv[i], 0) };
}

function attack(side: 0 | 1, A: Actor[], D: Actor[], ta: FullTactics, td: FullTactics, ia: SideInput, id: SideInput, pieces: Pieces): Attack {
  const bonusA = ia.cohesion - id.cohesion + (ia.talk === 1 ? 0.1 : ia.talk === 3 ? -0.05 : ia.talk === 2 ? -0.03 : 0) - (id.talk === 3 ? 0.1 : 0);
  const mark = id.mark;
  const tm = [1.25, 1, 0.8][ta.tempo] * (ta.waste ? 1.15 : 1);
  const pm = [1.12, 1, 0.86][ta.passing];
  // Defenders in the attacker's frame (mirrored): their OOP shape; their IP shape for transitions.
  const out = (x: Actor) => !(x.f & F_GK);
  const b = TUNE.base;
  const za = zonesA(A, ta, pieces.corners), zd = zonesD(D, td);

  // Build-up: our back line and holders against their press.
  const bShort = duel(A, za[Z.B], S.comp, D, zd[Z.B], S.press,
    b.B + bonusA + [0.55, 0, -0.4][td.pressing] + [0.2, 0, -0.2][ta.passing], mark);
  const bLong = clamp([0.08, 0.2, 0.45][ta.passing] + 0.35 * (1 - bShort.mean), 0, 0.8);
  const bLoss = [0.2, 0.3, 0.42][td.pressing];
  const fouls = (f: number) => f * [0.7, 1, 1.35][td.pressing] * (id.talk === 2 ? 0.7 : id.talk === 1 ? 1.25 : 1) * (id.foulK ?? 1); // gf-ref: foulK
  // Long ball: our target against their centre-backs; a high line invites the ball in behind.
  const inBehind = td.line === 2 ? 0.3 : td.line === 0 ? -0.2 : 0;
  const long = duel(A, za[Z.LONG], ta.striker === 1 ? S.airA : S.target, D, zd[Z.LONG], S.hold, b.LONG + bonusA + inBehind, mark, 0.5);

  // Progression lanes: midfield numbers and quality; a trap makes one lane a snare, the rest a little looser.
  const trapped = (l: number) => (td.pressing < 1 || !td.trap ? 0 : td.trap === 1 ? (l !== 1 ? 1 : -0.35) : td.trap === 2 ? (l === 1 ? 1 : -0.35) : 0.45);
  // Man-marking pulls the marker out of the defensive shape: a little more room in midfield and between the lines.
  const markHole = mark && A.some((x) => x.id === mark) ? 1 : 0;
  const P = [0, 1, 2].map((l) => duel(A, za[Z.P0 + l], S.prog, D, zd[Z.P0 + l], S.screen,
    b.P + bonusA + 0.12 * markHole - 0.4 * trapped(l) + (td.line === 0 ? 0.3 : td.line === 2 ? -0.15 : 0) + (td.pressing === 2 ? 0.12 : 0), mark));
  const presP = P.map((d) => d.na);
  const widthPref = [[0.6, 1.7, 0.6], [0.85, 1.3, 0.85], [1.2, 0.9, 1.2]][ta.width];
  const lanePick = (pres: number[], ds: Duel[]) => {
    const q = [0, 1, 2].map((l) => Math.pow(pres[l] + 0.2, 0.7) * Math.exp(1.8 * ds[l].mean) * widthPref[l]);
    const tot = q[0] + q[1] + q[2];
    return q.map((v) => v / tot);
  };
  const qP = lanePick(presP, P);
  const pLoss = [0, 1, 2].map((l) => clamp(0.42 + 0.06 * (ta.tempo - 1) + 0.03 * ta.mentality + (ta.counter ? 0.04 : 0) + 0.08 * Math.max(0, trapped(l)), 0.2, 0.7));

  // Final third: flanks are a one-on-one (plus overlaps), the middle is a crowd.
  const flank = [Z.FL, Z.FR].map((z) => duel(A, za[z], S.wingA, D, zd[z], S.wingD,
    b.FLANK + bonusA + (ta.mentality * 0.1) + [-0.1, 0, 0.12][ta.width], mark));
  const combo = duel(A, za[Z.COMBO], S.create, D, zd[Z.COMBO], S.block,
    b.COMBO + bonusA + 0.08 * markHole + 0.1 * ta.mentality + (ta.tempo === 2 ? 0.08 : 0) + [-0.4, 0, 0.15][ta.width], mark);
  const presF = [flank[0].na, combo.na, flank[1].na];
  const qF = lanePick(presF, [flank[0], combo, flank[1]]);
  // Through balls: runners against the back line, with space behind a high line (and the offside trap).
  const lineK = [0.5, 1, 1.45][td.line];
  const through = duel(A, za[Z.THR], S.run, D, zd[Z.THR], S.chase,
    b.THR + bonusA + [-0.65, 0, 0.55][td.line], mark);
  const paceEdge = through.a.reduce((s, a, i) => s + through.wa[i] * S.run(a.a), 0) - through.d.reduce((s, d, j) => s + through.wd[j] * S.chase(d.a), 0);
  const oT = clamp((0.05 + 0.15 * sig(paceEdge / 6)) * lineK * (ta.passing === 2 ? 1.2 : ta.passing === 0 ? 0.85 : 1), 0.03, 0.4);
  const midShoot = A.filter((x) => (x.f & F_MID)).reduce((s, x) => Math.max(s, x.a[1]), 50);
  const oL = clamp(0.11 * (1 + 0.28 * ta.mentality) * (0.7 + 0.3 * midShoot / 70) + (td.line === 0 ? 0.04 : 0), 0.03, 0.3);
  const offside = [0.2, 0.35, 0.55][td.line];
  // Crosses: our box presence in the air against theirs.
  const header = duel(A, za[Z.BOX], S.airA, D, zd[Z.BOX], S.airD, b.HEAD + bonusA, mark);
  const cross = clamp([0.84, 0.88, 0.9][ta.width] + (ta.striker === 1 ? 0.08 : 0) - (header.mean < 0.25 ? 0.08 : 0), 0.3, 0.85);
  // Corners and free-kick deliveries: the big men.
  const corner = duel(A, za[Z.SET], S.airA, D, zd[Z.SET], S.airD,
    b.CRN + bonusA + [0, 0.22, -0.45][ta.routine], mark, 0.3);
  const cShort = ta.routine === 2 ? 0.45 : 0.08;
  // Transitions: the other side's exposure when we win the ball, our runners against their rest defence.
  const restD = D.reduce((s, d) => s + (out(d) ? sig((42 - d.y) / 5) : 0), 0);
  const expD = (3.2 - restD) * 0.55 + [-0.25, 0, 0.35][td.line] + (td.routine === 1 ? 0.1 : 0);
  const cOpp = sig(-2.6 + expD + (ta.counter ? 0.8 : 0) + 0.25 * (ta.tempo - 1));
  const counter = duel(A, za[Z.CTR], S.brk, D, zd[Z.CTR], S.recover,
    b.CTR + bonusA + (td.line === 2 ? 0.3 : 0), mark, 1.3);
  const high = duel(A, za[Z.HIGH], S.create, D, zd[Z.HIGH], S.block, b.HIGH + bonusA, mark);
  const restA = A.reduce((s, x) => s + (out(x) ? sig((42 - x.y) / 5) : 0), 0);
  const exposure = (3.2 - restA) * 0.55 + [-0.25, 0, 0.35][ta.line];

  const fP = fouls(0.047), fF = fouls(0.05), fB = fouls(0.035);
  const pen = 0.04;
  const T = TUNE.time, dd = TUNE.dead;
  const F = (l: number) => (l === 0 ? N.F0 : l === 1 ? N.F1 : N.F2);
  const nodes: Node[] = new Array(NODES);
  nodes[N.B] = { t: T.B * tm * pm, alt: [{ p: bLong, to: N.LONG }, { p: fB, to: N.PCH, ev: EV.FOUL, dt: dd.FOUL }], duel: bShort,
    win: [{ p: 1, to: N.PCH }], lose: [{ p: bLoss, to: END + 2 }, { p: 1 - bLoss, to: N.B }] };
  nodes[N.LONG] = { t: T.LONG, alt: [{ p: [0.02, 0.04, 0.08][td.line], to: END, ev: EV.OFFSIDE, dt: dd.OFF }], duel: long, win: [{ p: 0.55, to: N.FCH }, { p: 0.45, to: N.PCH }], lose: [{ p: 0.35, to: END + 1 }, { p: 0.65, to: END }] };
  nodes[N.PCH] = { t: 0, alt: [0, 1, 2].map((l) => ({ p: qP[l], to: N.P0 + l })) };
  for (const l of [0, 1, 2]) {
    nodes[N.P0 + l] = { t: T.P * tm * pm, alt: [{ p: fP, to: N.FCH, ev: EV.FOUL, dt: dd.FOUL }], duel: P[l],
      win: [{ p: 0.7, to: F(l) }, { p: 0.3, to: N.FCH }],
      lose: [{ p: pLoss[l], to: END + 1 }, { p: (1 - pLoss[l]) * 0.45, to: N.B }, { p: (1 - pLoss[l]) * 0.55, to: N.PCH }] };
  }
  nodes[N.FCH] = { t: 0, alt: [0, 1, 2].map((l) => ({ p: qF[l], to: F(l) })) };
  for (const [k, l] of [[0, 0], [1, 2]] as const) {
    nodes[F(l)] = { t: T.F * tm, alt: [{ p: fF, to: N.FK, ev: EV.FOUL, dt: dd.FOUL }], duel: flank[k],
      win: [{ p: cross, to: N.CRS }, { p: 1 - cross, to: N.SHOT + 1 }],
      lose: [{ p: 0.35, to: END }, { p: 0.26, to: END + 1 }, { p: 0.07, to: N.CRN, ev: EV.CORNER, dt: dd.CORNER }, { p: 0.32, to: N.PCH }] };
  }
  nodes[N.F1] = { t: T.F * tm, alt: [{ p: fF, to: N.FK, ev: EV.FOUL, dt: dd.FOUL }, { p: oT, to: N.THR }, { p: oL, to: N.SHOT + 6 }], duel: combo,
    win: [{ p: 1, to: N.SHOT }], lose: [{ p: 0.42, to: END }, { p: 0.3, to: END + 1 }, { p: 0.28, to: N.PCH }] };
  nodes[N.THR] = { t: T.THR, alt: [{ p: offside * (1 - through.mean), to: END, ev: EV.OFFSIDE, dt: dd.OFF }], duel: through,
    win: [{ p: 1, to: N.SHOT + 3 }], lose: [{ p: 0.6, to: END }, { p: 0.4, to: END + 1 }] };
  nodes[N.CRS] = { t: T.CRS, alt: [], duel: header, win: [{ p: 1, to: N.SHOT + 2 }],
    lose: [{ p: 0.17, to: N.CRN, ev: EV.CORNER, dt: dd.CORNER }, { p: 0.32, to: END + 1 }, { p: 0.33, to: END }, { p: 0.18, to: N.FCH }] };
  nodes[N.FK] = { t: 0, alt: [{ p: pen, to: N.SHOT + 10, ev: EV.PENFOUL, dt: dd.PEN }, { p: (1 - pen) * 0.2, to: N.SHOT + 9 }, { p: (1 - pen) * 0.8, to: N.SETH }] };
  nodes[N.SETH] = { t: T.SETH, alt: [], duel: corner, win: [{ p: 1, to: N.SHOT + 8 }], lose: [{ p: 0.35, to: END + 1 }, { p: 0.45, to: END }, { p: 0.2, to: N.FCH }] };
  const cExp = clamp(0.22 + (ta.routine === 1 ? 0.12 : ta.routine === 2 ? -0.1 : 0), 0.05, 0.5);
  nodes[N.CRN] = { t: T.CRN, alt: [{ p: cShort, to: N.F1 }], duel: corner, win: [{ p: 1, to: N.SHOT + 7 }],
    lose: [{ p: cExp, to: END + 1 }, { p: 0.85 - cExp, to: END }, { p: 0.15, to: N.FCH }] };
  const fC = fouls(0.1);
  nodes[N.CTR] = { t: T.CTR * (ta.tempo === 2 ? 0.85 : 1), alt: [{ p: fC, to: N.FK, ev: EV.TFOUL, dt: dd.FOUL }], duel: counter,
    win: [{ p: 1, to: N.SHOT + 4 }], lose: [{ p: 0.55, to: END }, { p: 0.45, to: END + 1 }] };
  nodes[N.RMID] = { t: T.RMID, alt: [{ p: cOpp, to: N.CTR }, { p: (1 - cOpp) * 0.5, to: N.PCH }, { p: (1 - cOpp) * 0.5, to: N.B }] };
  nodes[N.RHIGH] = { t: T.RHIGH, alt: [], duel: high, win: [{ p: 1, to: N.SHOT + 5 }], lose: [{ p: 0.5, to: N.FCH }, { p: 0.5, to: END }] };

  // Shots: who takes them, how good the chance is, and the keeper.
  const gk = D.find((d) => d.pos === 'GK') ?? [...D].sort((p, q) => q.a[6] - p.a[6])[0];
  const gkv = gk ? gk.a[6] : 20;
  const keeperF = clamp(1 - 0.02 * (gkv - 67), 0.55, 1.5);
  const fin = (v: number) => clamp(1 + 0.022 * (v - 66), 0.55, 1.6);
  const outs = A.filter(out);
  const xg = XG0.map((v, i) => v * (i === 2 ? clamp(1 + 0.3 * (header.mean - 0.32), 0.85, 1.2) : 1) * (i === 7 || i === 8 ? clamp(1 + 0.3 * (corner.mean - 0.3), 0.85, 1.2) : 1));
  // Who shoots, per family of chance (computed once, shared by the chance types of a family).
  const ids = outs.map((x) => x.id);
  const ix = outs.map((x) => A.indexOf(x));
  const wOpen: number[] = [], wRun: number[] = [], wAir: number[] = [], wSet: number[] = [], wLong: number[] = [], finF: number[] = [], finH: number[] = [];
  for (let k = 0; k < outs.length; k++) {
    const x = outs[k], sh = pw15(x.a[1] / 70), air = (S.airA(x.a) / 70) ** 2;
    const open = ROLE_SHOT[x.pos] * (0.4 + band(x.y, 58, 110)) * sh * (x.id === mark ? 0.7 : 1);
    wOpen.push(open); wRun.push(open * pw15(x.a[0] / 70));
    wAir.push(za[Z.BOX][ix[k]] * air); wSet.push(za[Z.SET][ix[k]] * air);
    wLong.push(ROLE_LONG[x.pos] * (x.a[1] / 70) ** 2);
    finF.push(fin(x.a[1])); finH.push(fin(0.5 * x.a[1] + 0.5 * x.a[5]));
  }
  const taker = (id: string) => outs.find((x) => x.id === id) ?? outs.reduce<Actor | undefined>((b, x) => (!b || x.a[1] > b.a[1] ? x : b), undefined);
  const shooters: ShotTable[] = SHOTS.map((type, i) => {
    if (!outs.length) return table([''], [1], [0]);
    if (type === 'pen' || type === 'fk') {
      const who = taker(type === 'pen' ? pieces.penalties : pieces.freeKicks)!;
      const c = type === 'pen' ? clamp(0.76 + (who.a[1] - 70) * 0.004 - (gkv - 70) * 0.003, 0.55, 0.92) : clamp(xg[i] * fin(who.a[1]) * keeperF, 0.005, 0.95);
      return table([who.id], [1], [c]);
    }
    const air = type === 'header' || type === 'corner' || type === 'set';
    const w = type === 'header' ? wAir : type === 'corner' || type === 'set' ? wSet : type === 'long' ? wLong : type === 'through' || type === 'counter' ? wRun : wOpen;
    const fn = air ? finH : finF;
    return table(ids, w, fn.map((f) => clamp(xg[i] * f * keeperF, 0.005, 0.95)));
  });
  for (let i = 0; i < SHOTS.length; i++) {
    nodes[N.SHOT + i] = { t: T.SHOT, alt: shotEdges(i, shooters[i].mean), shot: i };
  }
  return {
    side, nodes, xg, shooters, keeper: gk?.id ?? '', exposure,
    creators: { ids: outs.map((x) => x.id), w: outs.map((x) => ROLE_ASSIST[x.pos] * (x.a[2] / 70)) },
    foulCard: 0.13 * (id.talk === 2 ? 0.7 : 1),
  };
}

// What can happen to a shot of type i scored with probability g.
export function shotEdges(i: number, g: number): Edge[] {
  const d = TUNE.dead;
  const rest = 1 - g, bl = rest * BLOCK[i], sv = (rest - bl) * ONT[i], ms = rest - bl - sv;
  return [
    { p: g, to: END, ev: EV.GOAL, dt: d.GOAL },
    { p: bl * 0.28, to: N.CRN, ev: EV.BLOCK, dt: d.CORNER }, { p: bl * 0.3, to: N.FCH, ev: EV.BLOCK }, { p: bl * 0.42, to: END + 1, ev: EV.BLOCK },
    { p: sv * 0.2, to: N.CRN, ev: EV.SAVE, dt: d.CORNER }, { p: sv * 0.8, to: END, ev: EV.SAVE, dt: d.HELD },
    { p: ms, to: END, ev: EV.MISS, dt: d.MISS },
  ];
}

export function buildModel(inp: [SideInput, SideInput], pieces: [Pieces, Pieces]): Model {
  const actors: [Actor[], Actor[]] = [actorsOf(inp[0]), actorsOf(inp[1])];
  const t = [fullTactics(inp[0].tactics), fullTactics(inp[1].tactics)];
  return {
    actors,
    att: [attack(0, actors[0], actors[1], t[0], t[1], inp[0], inp[1], pieces[0]), attack(1, actors[1], actors[0], t[1], t[0], inp[1], inp[0], pieces[1])],
  };
}

// ---------- closed form ----------

// Expected values per possession from each start, found by solving the absorbing chain once.
export interface Solved {
  // [start][quantity]: time (all), inplay, shots, xg, goals, corners, fouls-against-us, then per start: absorbed into END+s
  v: number[][];
  xgBy: number[][]; // [start][shot type]
}
const Q = { TIME: 0, PLAY: 1, SHOTS: 2, XG: 3, GOALS: 4, CORNERS: 5, FOULS: 6, END0: 7 } as const;
const NQ = 10;

function edgesOf(n: Node): Edge[] {
  if (!n.duel) return n.alt;
  const pa = n.alt.reduce((s, e) => s + e.p, 0), rest = 1 - pa, m = n.duel.mean;
  return [...n.alt, ...n.win!.map((e) => ({ ...e, p: e.p * rest * m })), ...n.lose!.map((e) => ({ ...e, p: e.p * rest * (1 - m) }))];
}

export function solve(at: Attack): Solved {
  const n = NODES, K = NQ + SHOTS.length;
  // (I − Q) X = R, one row per node.
  const A: number[][] = [], R: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0); row[i] = 1;
    const r = new Array(K).fill(0);
    const node = at.nodes[i];
    r[Q.TIME] += node.t; r[Q.PLAY] += node.t;
    if (node.shot !== undefined) { r[Q.SHOTS] += 1; r[Q.XG] += at.xg[node.shot]; r[NQ + node.shot] += at.xg[node.shot]; }
    for (const e of edgesOf(node)) {
      if (e.dt) r[Q.TIME] += e.p * e.dt;
      if (e.ev === EV.GOAL) r[Q.GOALS] += e.p;
      if (e.ev === EV.CORNER || (e.to === N.CRN && e.ev !== undefined)) r[Q.CORNERS] += e.p;
      if (e.ev === EV.FOUL || e.ev === EV.TFOUL || e.ev === EV.PENFOUL) r[Q.FOULS] += e.p;
      if (e.to >= END) r[Q.END0 + e.to - END] += e.p;
      else row[e.to] -= e.p;
    }
    A.push(row); R.push(r);
  }
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[piv][c])) piv = i;
    if (piv !== c) { [A[c], A[piv]] = [A[piv], A[c]]; [R[c], R[piv]] = [R[piv], R[c]]; }
    const d = A[c][c] || 1e-12;
    for (let i = 0; i < n; i++) {
      if (i === c || A[i][c] === 0) continue;
      const f = A[i][c] / d;
      for (let j = c; j < n; j++) A[i][j] -= f * A[c][j];
      for (let k = 0; k < K; k++) R[i][k] -= f * R[c][k];
    }
  }
  const X = R.map((r, i) => r.map((v) => v / (A[i][i] || 1e-12)));
  return { v: START.map((s) => X[s].slice(0, NQ)), xgBy: START.map((s) => X[s].slice(NQ)) };
}

// Long-run rates for both sides: goals, xG, shots per 90 minutes, possession share, and xG by kind of chance.
export interface Rates { goals: [number, number]; xg: [number, number]; shots: [number, number]; poss: number; xgBy: [number[], number[]]; corners: [number, number]; fouls: [number, number] }
export function rates(model: Model): Rates {
  const S = [solve(model.att[0]), solve(model.att[1])];
  // Possession starts alternate between the sides: a 6-state chain (side, start) whose stationary mix we find by iteration.
  let pi = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  for (let it = 0; it < 40; it++) {
    const nx = [0, 0, 0, 0, 0, 0];
    for (let side = 0; side < 2; side++) for (let s = 0; s < 3; s++) {
      const m = pi[side * 3 + s];
      if (!m) continue;
      const v = S[side].v[s];
      const tot = v[Q.END0] + v[Q.END0 + 1] + v[Q.END0 + 2] || 1;
      for (let s2 = 0; s2 < 3; s2++) nx[(1 - side) * 3 + s2] += m * v[Q.END0 + s2] / tot;
    }
    pi = nx;
  }
  const agg = (side: number, q: number) => [0, 1, 2].reduce((s, st) => s + pi[side * 3 + st] * S[side].v[st][q], 0);
  const T = agg(0, Q.TIME) + agg(1, Q.TIME);
  const per90 = 5400 / (T || 1);
  const by = (side: number) => SHOTS.map((_, k) => [0, 1, 2].reduce((s, st) => s + pi[side * 3 + st] * S[side].xgBy[st][k], 0) * per90);
  const p0 = agg(0, Q.PLAY), p1 = agg(1, Q.PLAY);
  return {
    goals: [agg(0, Q.GOALS) * per90, agg(1, Q.GOALS) * per90],
    xg: [agg(0, Q.XG) * per90, agg(1, Q.XG) * per90],
    shots: [agg(0, Q.SHOTS) * per90, agg(1, Q.SHOTS) * per90],
    corners: [agg(0, Q.CORNERS) * per90, agg(1, Q.CORNERS) * per90],
    fouls: [agg(1, Q.FOULS) * per90, agg(0, Q.FOULS) * per90], // fouls committed by each side
    poss: p0 / (p0 + p1 || 1),
    xgBy: [by(0), by(1)],
  };
}

// FAST play: a like-for-like substitution patches the model in place (the new man takes the slot, his attributes and
// the shot tables); the odds are refreshed at the next scheduled rebuild. FULL play rebuilds every minute instead.
export function patchSub(model: Model, side: 0 | 1, outId: string, p: Player, fit: number, bonus: number) {
  const a = model.actors[side].find((x) => x.id === outId);
  if (!a) return;
  const f = fit / 100, phys = 0.72 + 0.28 * f, tech = 0.9 + 0.1 * f;
  const b = bonus + (p.morale - 60) / 20 - fitPenalty(p.position, a.pos) * 0.8;
  a.id = p.id;
  a.a = p.attrs.map((v, i) => (i === 0 || i === 5 ? v * phys : v * tech) + b);
  const at = model.att[side];
  for (const t of at.shooters) t.ids = t.ids.map((id) => (id === outId ? p.id : id));
  at.creators.ids = at.creators.ids.map((id) => (id === outId ? p.id : id));
  const other = model.att[1 - side];
  if (other.keeper === outId) other.keeper = p.id;
}
