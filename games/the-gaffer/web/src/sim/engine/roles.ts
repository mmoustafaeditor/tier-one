// Engine v2 — ROLES: what each player is asked to do in each phase, and what that changes in the engine.
//
// A role is not a label. Every role is a small vector of engine parameters (RoleFx) that the decision layer
// (model.ts, via phases.ts) reads when it builds the match:
//   • where the player stands in that phase (dx / dy: added to his slot after the team instructions),
//   • how much he is involved in each contest zone (z*: for an in-possession role, the zones of our attack; for an
//     out-of-possession role, the same zones of THEIR attack that he defends; zk on an out-of-possession role is his
//     part in OUR counter-attacks once the ball is won),
//   • how often he shoots and creates (shot / create), whether he crosses or cuts inside (cross),
//   • how often he fouls (foul: feeds the referee hook, see foulPropensity) and how fast he tires (load),
//   • which attributes make him good at it (w: suitability; a poor fit blunts the role and costs a little quality).
//
// Rules of the schema (tests: sim-tests/roles.ts):
//   • each role belongs to ONE phase, lists the positions it is valid for, and each position has exactly one
//     default role per phase: the neutral one, which plays exactly as the engine did before roles existed;
//   • within a position and phase no two roles have the same effect (no duplicates, no inert roles);
//   • an invalid role for a position is never played: it falls back to the default (sanitised on read).
import type { Player, Position } from '../../model/types';

export type Phase = 'ip' | 'oop';
export const IP_ROLES = ['keeper', 'distributor', 'defender', 'ball_player', 'fullback', 'wingback', 'inverted_fullback', 'holder', 'playmaker',
  'midfielder', 'box_to_box', 'attacking_mid', 'shadow_striker', 'winger', 'inside_forward', 'advanced_forward', 'target_man', 'false_nine'] as const;
export const OOP_ROLES = ['line_keeper', 'sweeper_keeper', 'hold_line', 'step_out', 'screen', 'ball_winner', 'hold_shape', 'track_back',
  'press_forward', 'outlet'] as const;
export type IpRole = typeof IP_ROLES[number];
export type OopRole = typeof OOP_ROLES[number];
export type RoleId = IpRole | OopRole;

// What a role changes. Multipliers default to 1, offsets to 0. Zones (see model.ts Z): b build-up, p progression lanes,
// l long ball / target, f flank duels, c central final third (combinations), t runs in behind, x the box, k counters.
// In possession they scale our attack's zones; out of possession the zones of the opponent's attack he defends
// (zb there = how hard he presses their build-up), except zk: his part in our counter-attacks.
export interface RoleFx {
  dx?: number;      // lateral move in pitch units, positive = towards his own touchline (negative = infield)
  toX?: number;     // or an absolute lateral spot on his side of the pitch (7 = on the touchline, 36 = half-space)
  dy?: number;      // vertical move in this phase (positive = up the pitch)
  zb?: number; zp?: number; zl?: number; zf?: number; zc?: number; zt?: number; zx?: number; zk?: number;
  shot?: number;    // share of the team's open-play shots
  create?: number;  // share of the team's key passes / assists
  cross?: number;   // after winning a flank duel: cross (1) or cut inside for a cut-back / shot (lower)
  air?: boolean;    // long balls are aimed at his head (the long-ball contest uses heading, not hold-up)
  foul?: number;    // how readily he fouls when he is the one contesting (referee hook)
  load?: number;    // running load (fatigue per minute)
  hole?: number;    // logit: space he leaves behind him when he steps out (the opponent's combinations)
  lob?: number;     // added to the opponent's long-shot rate (a keeper off his line)
  sweep?: number;   // a keeper's part in the chase for balls in behind and long balls (0 = stays on his line)
  // Contest edges (logits, summed over the side, capped at ±0.3). In possession: our build-up (bld), progression (prg)
  // and final-third combinations (cmb); lose = extra chance a failed progression is lost in a dangerous place.
  // Out of possession (negative = harder for them): their build-up (opb), progression (opp), combinations (opc).
  bld?: number; prg?: number; cmb?: number; lose?: number; opb?: number; opp?: number; opc?: number;
  outlet?: number;  // logit added to the side's counter-attack chance when the ball is won
  w?: number[];     // suitability: attribute weights [pace, shooting, passing, dribbling, defending, physical, goalkeeping]
}
export interface RoleDef { id: RoleId; phase: Phase; pos: Position[]; fx: RoleFx; def?: Position[] }

const R = (id: RoleId, phase: Phase, pos: Position[], fx: RoleFx, def: Position[] = []): RoleDef => ({ id, phase, pos, fx, def });
const FB: Position[] = ['LB', 'RB'], W: Position[] = ['LW', 'RW'];

export const ROLES: Record<RoleId, RoleDef> = {
  // ---------- in possession ----------
  keeper: R('keeper', 'ip', ['GK'], {}, ['GK']),
  distributor: R('distributor', 'ip', ['GK'], { zb: 2.2, bld: 0.12, lose: 0.01, w: [0, 0, 0.6, 0, 0, 0, 0.4] }),
  defender: R('defender', 'ip', ['CB'], {}, ['CB']),
  ball_player: R('ball_player', 'ip', ['CB'], { dy: 4, zb: 1.35, zp: 1.6, create: 1.8, bld: 0.08, prg: 0.08, lose: 0.02, w: [0, 0, 0.55, 0.15, 0.2, 0.1, 0] }),
  fullback: R('fullback', 'ip', FB, {}, FB),
  wingback: R('wingback', 'ip', FB, { dy: 24, toX: 7, zf: 1.15, create: 1.3, load: 1.2, w: [0.4, 0, 0.2, 0.2, 0, 0.2, 0] }),
  inverted_fullback: R('inverted_fullback', 'ip', FB, { dy: 12, toX: 36, zp: 1.15, bld: 0.04, prg: 0.06, load: 1.05, w: [0, 0, 0.5, 0.2, 0.3, 0, 0] }),
  holder: R('holder', 'ip', ['CDM'], {}, ['CDM']),
  playmaker: R('playmaker', 'ip', ['CDM', 'CM', 'CAM'], { zp: 1.25, zc: 1.2, create: 1.8, shot: 0.8, prg: 0.12, cmb: 0.1, lose: 0.03, w: [0, 0.1, 0.6, 0.3, 0, 0, 0] }),
  midfielder: R('midfielder', 'ip', ['CM'], {}, ['CM']),
  box_to_box: R('box_to_box', 'ip', ['CM'], { dy: 10, zx: 1.4, shot: 1.5, load: 1.15, w: [0.25, 0.2, 0, 0, 0.2, 0.35, 0] }),
  attacking_mid: R('attacking_mid', 'ip', ['CAM'], {}, ['CAM']),
  shadow_striker: R('shadow_striker', 'ip', ['CAM'], { dy: 10, zt: 1.5, zx: 1.4, shot: 1.4, create: 0.7, w: [0.35, 0.4, 0, 0.25, 0, 0, 0] }),
  winger: R('winger', 'ip', W, {}, W),
  inside_forward: R('inside_forward', 'ip', W, { dy: 4, toX: 30, zf: 0.75, zc: 1.3, zx: 1.3, shot: 1.45, cross: 0.6, w: [0.25, 0.4, 0, 0.35, 0, 0, 0] }),
  advanced_forward: R('advanced_forward', 'ip', ['ST'], {}, ['ST']),
  target_man: R('target_man', 'ip', ['ST'], { dy: 3, zl: 1.57, zx: 1.33, air: true, w: [0, 0.35, 0, 0, 0, 0.65, 0] }),
  false_nine: R('false_nine', 'ip', ['ST'], { dy: -17, create: 1.3, prg: 0.04, cmb: 0.08, w: [0, 0.2, 0.45, 0.35, 0, 0, 0] }),
  // ---------- out of possession ----------
  line_keeper: R('line_keeper', 'oop', ['GK'], {}, ['GK']),
  sweeper_keeper: R('sweeper_keeper', 'oop', ['GK'], { dy: 10, sweep: 0.6, lob: 0.015, w: [0.5, 0, 0.2, 0, 0, 0, 0.3] }),
  hold_line: R('hold_line', 'oop', ['CB', ...FB], {}, ['CB', ...FB]),
  step_out: R('step_out', 'oop', ['CB', ...FB], { dy: 6, zp: 1.35, zf: 1.2, zt: 0.8, opp: -0.05, foul: 1.3, load: 1.05, w: [0.25, 0, 0, 0, 0.45, 0.3, 0] }),
  screen: R('screen', 'oop', ['CDM', 'CM'], { dy: -4, zb: 0.6, zp: 1.1, zc: 1.25, zx: 1.15, opc: -0.1, w: [0.1, 0, 0.2, 0, 0.5, 0.2, 0] }),
  ball_winner: R('ball_winner', 'oop', ['CDM', 'CM', 'CAM'], { dy: 5, zb: 1.3, zp: 1.4, zc: 0.8, opp: -0.1, foul: 1.6, load: 1.12, hole: 0.08, w: [0.3, 0, 0, 0, 0.45, 0.25, 0] }),
  hold_shape: R('hold_shape', 'oop', ['CDM', 'CM', 'CAM', 'ST'], {}, ['CDM', 'CM', 'CAM', 'ST']),
  track_back: R('track_back', 'oop', W, {}, W),
  press_forward: R('press_forward', 'oop', ['ST', 'CAM', ...W], { dy: 7, zb: 1.3, zp: 1.1, opb: -0.15, foul: 1.2, load: 1.25, w: [0.4, 0, 0, 0, 0.25, 0.35, 0] }),
  outlet: R('outlet', 'oop', ['ST', 'CAM', ...W], { dy: 12, zb: 0.6, zp: 0.6, zf: 0.5, zk: 1.4, outlet: 0.25, load: 0.9, w: [0.6, 0.2, 0, 0.2, 0, 0, 0] }),
};
export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export const rolesFor = (pos: Position, phase: Phase): RoleId[] => ROLE_IDS.filter((id) => ROLES[id].phase === phase && ROLES[id].pos.includes(pos));
export const defaultRole = (pos: Position, phase: Phase): RoleId => ROLE_IDS.find((id) => ROLES[id].phase === phase && ROLES[id].def!.includes(pos))!;
export const validRole = (id: string | null | undefined, pos: Position, phase: Phase): id is RoleId =>
  !!id && id in ROLES && ROLES[id as RoleId].phase === phase && ROLES[id as RoleId].pos.includes(pos);
export const isDefault = (id: RoleId) => !!ROLES[id].def?.length;

// ---------- suitability ----------

// What each position normally asks of a player (the default role's profile), attribute order as ROLES' w.
const POS_W: Record<Position, number[]> = {
  GK: [0, 0, 0, 0, 0, 0, 1], CB: [0.2, 0, 0, 0, 0.5, 0.3, 0], LB: [0.35, 0, 0.15, 0, 0.35, 0.15, 0], RB: [0.35, 0, 0.15, 0, 0.35, 0.15, 0],
  CDM: [0, 0, 0.35, 0, 0.4, 0.25, 0], CM: [0, 0, 0.4, 0.2, 0.2, 0.2, 0], CAM: [0, 0.25, 0.4, 0.35, 0, 0, 0],
  LW: [0.4, 0, 0.2, 0.4, 0, 0, 0], RW: [0.4, 0, 0.2, 0.4, 0, 0, 0], ST: [0.25, 0.5, 0, 0, 0, 0.25, 0],
};
const mix = (a: number[], w: number[]) => { let s = 0, t = 0; for (let i = 0; i < 7; i++) { s += w[i] * a[i]; t += w[i]; } return s / (t || 1); };
// How well a player's attributes fit a role at a position, in attribute points against what that position normally
// asks: + means the role leans on what he is good at. Default (neutral) roles ask nothing special: 0.
export function roleFit(p: Pick<Player, 'attrs' | 'position'>, id: RoleId, pos?: Position): number {
  const w = ROLES[id].fx.w;
  if (!w) return 0;
  const at = pos ?? (ROLES[id].pos.includes(p.position) ? p.position : ROLES[id].pos[0]);
  return mix(p.attrs, w) - mix(p.attrs, POS_W[at]);
}
// A role's effect is scaled by the fit: a natural (+10) plays it at 1.3×, a square peg (−10) at 0.5×.
export const fitGain = (fit: number) => Math.max(0.5, Math.min(1.3, 1 + fit / 20));
// ...and a poor fit costs a little quality in every contest (rating points, like playing slightly out of position).
export const fitBonus = (fit: number) => Math.max(-1.5, Math.min(0.6, fit * 0.1));
// Below this the tactics screen warns.
export const POOR_FIT = -6;

// A role's multipliers after the fit: 1 + (m − 1) × gain. Offsets (where he stands) are not scaled: he goes there.
export function scaled(fx: RoleFx, gain: number): Required<Pick<RoleFx, 'zb' | 'zp' | 'zl' | 'zf' | 'zc' | 'zt' | 'zx' | 'zk' | 'shot' | 'create' | 'cross' | 'foul' | 'load' | 'hole' | 'lob' | 'outlet' | 'sweep' | 'bld' | 'prg' | 'cmb' | 'lose' | 'opb' | 'opp' | 'opc'>> {
  const s = (v: number | undefined) => 1 + ((v ?? 1) - 1) * gain;
  return {
    zb: s(fx.zb), zp: s(fx.zp), zl: s(fx.zl), zf: s(fx.zf), zc: s(fx.zc), zt: s(fx.zt), zx: s(fx.zx), zk: s(fx.zk),
    shot: s(fx.shot), create: s(fx.create), cross: s(fx.cross), foul: fx.foul ?? 1, load: fx.load ?? 1,
    hole: (fx.hole ?? 0) * gain, lob: (fx.lob ?? 0) * gain, outlet: (fx.outlet ?? 0) * gain, sweep: (fx.sweep ?? 0) * gain,
    bld: (fx.bld ?? 0) * gain, prg: (fx.prg ?? 0) * gain, cmb: (fx.cmb ?? 0) * gain, lose: (fx.lose ?? 0) * gain,
    opb: (fx.opb ?? 0) * gain, opp: (fx.opp ?? 0) * gain, opc: (fx.opc ?? 0) * gain,
  };
}
export type Fx = ReturnType<typeof scaled>;
export const NEUTRAL: Fx = scaled({}, 1);

// ---------- the referee hook: fouls ----------

// Team-level foul propensity from the out-of-possession instructions (1 = a normal side). The engine multiplies every
// foul chance in a contest by this and by the contesting defenders' role aggression (Fx.foul, weighted by who is in it).
export const teamFoulFactor = (t: { pressing: number; cpress: number }) => [0.7, 1, 1.35][t.pressing] * [0.95, 1, 1.15][t.cpress];

// Legacy team instructions → roles (saves and AI plans from before roles; presets still speak in these two knobs).
export const LEGACY_FB: IpRole[] = ['fullback', 'wingback', 'inverted_fullback'];
export const LEGACY_ST: IpRole[] = ['advanced_forward', 'target_man', 'false_nine', 'advanced_forward'];
