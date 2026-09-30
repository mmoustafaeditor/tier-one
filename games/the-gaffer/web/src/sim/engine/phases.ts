// Engine v2 — PHASES: the two shapes a side plays in, who stands where in each, and in which role.
//
//   tactics (formation IP + formation OOP + instructions + roles per phase)
//     → planOf():   each player's in-possession slot and role, and his out-of-possession slot and role
//     → spotOf():   where he stands in each phase (x, y in possession; ox, oy out of it) and his role's parameters
//     → model.ts:   the contests read those positions and parameters (zones, shots, crosses, fouls, counters)
//
// The tactics board's preview, the live pitch and the warnings all read these same functions (and the built model),
// so what the screen shows is what the engine plays. Nothing here is random.
import type { Player, Position } from '../../model/types';
import { FORMATIONS, fullTactics, type FormationId, type FullTactics, type Slot, type Tactics } from '../tactics';
import {
  LEGACY_FB, LEGACY_ST, NEUTRAL, POOR_FIT, ROLES, defaultRole, fitBonus, fitGain, roleFit, rolesFor, scaled, teamFoulFactor, validRole,
  type Fx, type IpRole, type OopRole, type Phase, type RoleId,
} from './roles';

// ---------- flags (what kind of player a slot asks for) ----------
export const F_GK = 1, F_DEF = 2, F_FB = 4, F_WING = 8, F_MID = 16, F_ST = 32;
export const flagsOf = (pos: Position) => (pos === 'GK' ? F_GK : pos === 'CB' ? F_DEF : pos === 'LB' || pos === 'RB' ? F_DEF | F_FB
  : pos === 'LW' || pos === 'RW' ? F_WING : pos === 'ST' ? F_ST : F_MID);

// ---------- in-possession slot → out-of-possession slot ----------

// Each player keeps his man: the keeper stays the keeper and the ten outfielders move to the out-of-possession slots
// with the least total (squared) distance: the exact assignment, found by dynamic programming over subsets.
const MAPS = new Map<string, number[]>();
export function phaseMap(ip: FormationId, oop: FormationId): number[] {
  const A = FORMATIONS[ip].slots, B = FORMATIONS[oop].slots;
  if (ip === oop) return A.map((_, i) => i);
  const key = `${ip}>${oop}`;
  const hit = MAPS.get(key);
  if (hit) return hit;
  const ga = A.findIndex((s) => s.pos === 'GK'), gb = B.findIndex((s) => s.pos === 'GK');
  const ai = A.map((_, i) => i).filter((i) => i !== ga), bi = B.map((_, i) => i).filter((i) => i !== gb);
  const n = ai.length, full = (1 << n) - 1;
  const cost = (i: number, j: number) => (A[ai[i]].x - B[bi[j]].x) ** 2 + (A[ai[i]].y - B[bi[j]].y) ** 2;
  const dp = new Array(full + 1).fill(Infinity), pick = new Array(full + 1).fill(-1);
  dp[0] = 0;
  for (let mask = 0; mask < full; mask++) {
    if (dp[mask] === Infinity) continue;
    let i = 0; for (let m = mask; m; m &= m - 1) i++; // the next outfielder to place
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) continue;
      const v = dp[mask] + cost(i, j), nm = mask | (1 << j);
      if (v < dp[nm]) { dp[nm] = v; pick[nm] = j; }
    }
  }
  const out = new Array(A.length).fill(0);
  out[ga] = gb;
  let mask = full;
  for (let i = n - 1; i >= 0; i--) { const j = pick[mask]; out[ai[i]] = bi[j]; mask &= ~(1 << j); }
  MAPS.set(key, out);
  return out;
}

// ---------- roles per phase ----------

export interface Plan {
  slots: Slot[];      // in-possession slots (the player's identity: the XI is kept in this order)
  oslots: Slot[];     // his out-of-possession slot, per in-possession slot
  ip: IpRole[]; oop: OopRole[];
}
const legacyIp = (pos: Position, t: FullTactics): IpRole =>
  pos === 'LB' || pos === 'RB' ? LEGACY_FB[t.fullback] : pos === 'ST' ? LEGACY_ST[t.striker] : defaultRole(pos, 'ip') as IpRole;
const legacyOop = (pos: Position, t: FullTactics): OopRole => (pos === 'ST' && t.striker === 3 ? 'press_forward' : defaultRole(pos, 'oop') as OopRole);

// planOf for a stored Tactics object, cached by identity (a match replaces the object on every change).
const PLANS = new WeakMap<object, Plan>();
export function planFor(t: Tactics): Plan {
  let p = PLANS.get(t);
  if (!p) { p = planOf(fullTactics(t)); PLANS.set(t, p); }
  return p;
}

// The roles the engine plays: the ones set (when valid for the position), else the position's default. Tactics from
// before roles existed (roles missing) take their full-backs and strikers from the old team knobs, so they play as before.
export function planOf(t: FullTactics): Plan {
  const slots = FORMATIONS[t.formation].slots, os = FORMATIONS[t.oop].slots;
  const map = phaseMap(t.formation, t.oop);
  const oslots = slots.map((_, k) => os[map[k]]);
  const ip = slots.map((s, k) => {
    const r = t.roles?.[k];
    return (t.roles ? (validRole(r, s.pos, 'ip') ? r : defaultRole(s.pos, 'ip')) : legacyIp(s.pos, t)) as IpRole;
  });
  const oop = oslots.map((s, k) => {
    const r = t.oopRoles?.[k];
    return (t.oopRoles ? (validRole(r, s.pos, 'oop') ? r : defaultRole(s.pos, 'oop')) : legacyOop(s.pos, t)) as OopRole;
  });
  return { slots, oslots, ip, oop };
}
// The role arrays as the tactics store them: explicit per slot (what planOf plays), for the screens to edit.
export function rolesArrays(t: FullTactics): { roles: string[]; oopRoles: string[] } {
  const p = planOf(t);
  return { roles: [...p.ip], oopRoles: [...p.oop] };
}

// A new in-possession shape keeps each role where the same position still exists (first come, first served), and the
// out-of-possession roles where the player's new out-of-possession position still allows them.
export function carryRoles(t: FullTactics, formation: FormationId, oop: FormationId = t.oop === t.formation ? formation : t.oop): { roles: string[]; oopRoles: string[] } {
  const was = planOf(t);
  const next = planOf({ ...t, formation, oop, roles: null, oopRoles: null, fullback: 0, striker: 0 });
  const used = new Set<number>();
  const roles = next.slots.map((s, k) => {
    const i = was.slots.findIndex((o, j) => !used.has(j) && o.pos === s.pos);
    if (i < 0) return next.ip[k];
    used.add(i);
    return was.ip[i];
  });
  const oused = new Set<number>();
  const oopRoles = next.oslots.map((s, k) => {
    const i = was.oslots.findIndex((o, j) => !oused.has(j) && o.pos === s.pos && validRole(was.oop[j], s.pos, 'oop'));
    if (i < 0) return next.oop[k];
    oused.add(i);
    return was.oop[i];
  });
  return { roles, oopRoles };
}

// ---------- where each player stands ----------

export interface Spot {
  x: number; y: number; ox: number; oy: number;
  f: number; of: number; opos: Position;
  ip: IpRole; oop: OopRole;
  ifx: Fx; ofx: Fx;          // role parameters after the fit
  fit: [number, number];     // suitability for each role (attribute points)
  bonus: number;             // rating points from the fit (added to every attribute)
}
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// `short`: players missing (red cards, injuries with no subs left). A side down to ten drops deeper and sends fewer
// runners: the block sits 3 units deeper and the attack 3 units less high for every missing man.
export function spotOf(p: Pick<Player, 'attrs' | 'position'> | null, k: number, t: FullTactics, plan: Plan, short = 0): Spot {
  const sl = plan.slots[k], os = plan.oslots[k];
  const ip = plan.ip[k], oop = plan.oop[k];
  const fi = ROLES[ip].fx, fo = ROLES[oop].fx;
  const fit: [number, number] = p ? [roleFit(p, ip, sl.pos), roleFit(p, oop, os.pos)] : [0, 0];
  const fl = flagsOf(sl.pos), of = flagsOf(os.pos);
  const gk = !!(fl & F_GK), def = !!(fl & F_DEF), st = !!(fl & F_ST), wing = !!(fl & F_WING), mid = !!(fl & F_MID), fb = !!(fl & F_FB);
  let x = sl.x, y = sl.y;
  if (!gk) {
    y += (fb ? 3 : def ? 2 : 4) * t.mentality;
    // The in-possession role: where he goes (the old full-back and striker knobs are roles now).
    if (fi.toX !== undefined) x = x < 50 ? fi.toX : 100 - fi.toX;
    if (fi.dx) x += x < 50 ? -fi.dx : fi.dx;
    y += fi.dy ?? 0;
    x = 50 + (x - 50) * [0.78, 1, 1.16][t.width];
    if (wing) x = 50 + (x - 50) * [0.85, 1, 1.06][t.width];
    if (def) y += [-4, 0, 6][t.line];
    if (t.counter && mid) y -= 3;
    if (t.passing === 2 && (st || wing)) y += 3;
    if (!def) y -= 3 * short;
  }
  // Out of possession: his out-of-possession slot, the line, the press, and his out-of-possession role.
  const ogk = !!(of & F_GK), odef = !!(of & F_DEF);
  let oy = ogk ? 5 : 8 + os.y * 0.78;
  let ox = ogk ? 50 : 50 + (os.x - 50) * 0.82;
  if (odef) oy += [-6, 0, 9][t.line];
  else if (!ogk) oy += [-9, 0, 9][t.pressing] + 2 * t.mentality - 3 * short;
  oy += fo.dy ?? 0;
  if (fo.dx) ox += ox < 50 ? -fo.dx : fo.dx;
  return {
    x: clamp(x, 2, 98), y: clamp(y, 2, 98), ox: clamp(ox, 2, 98), oy: clamp(oy, 2, 98), f: fl, of, opos: os.pos, ip, oop,
    ifx: fi.w ? scaled(fi, fitGain(fit[0])) : NEUTRAL, ofx: fo.w ? scaled(fo, fitGain(fit[1])) : NEUTRAL,
    fit, bonus: 0.5 * fitBonus(fit[0]) + 0.5 * fitBonus(fit[1]),
  };
}

// Running load of a slot (fatigue per minute), from its roles and position: wide forwards run a little more.
export const slotLoad = (pos: Position, ip: RoleId, oop: RoleId, t: { cpress: number }) =>
  (ROLES[ip].fx.load ?? 1) * (ROLES[oop].fx.load ?? 1) * (pos === 'LW' || pos === 'RW' ? 1.05 : 1) * [0.97, 1, 1.06][t.cpress];

// ---------- the AI's roles ----------

// Which roles suit a style (a small nudge; the players' attributes decide).
const LEAN: Record<string, Partial<Record<RoleId, number>>> = {
  possession: { playmaker: 2, ball_player: 2, inverted_fullback: 2, false_nine: 2, distributor: 2, screen: 1 },
  gegenpress: { press_forward: 3, ball_winner: 2, step_out: 1, sweeper_keeper: 2, box_to_box: 1 },
  counter: { outlet: 2, inside_forward: 1, screen: 2 },
  bus: { screen: 2, outlet: 2, target_man: 1 },
  wings: { wingback: 2, winger: 1, target_man: 1 },
  direct: { target_man: 3, box_to_box: 1, outlet: 1 },
  balanced: {},
};
// A role for every slot: the default unless another suits the player clearly better (fit + the style's lean ≥ 4 points
// above staying neutral). At most one outlet and two playmakers, so the side keeps a shape.
export function autoRoles(xi: (Pick<Player, 'attrs' | 'position'> | null)[], t: FullTactics): { roles: string[]; oopRoles: string[] } {
  const plan = planOf({ ...t, roles: null, oopRoles: null });
  const lean = LEAN[t.philosophy] ?? {};
  const count: Partial<Record<RoleId, number>> = {};
  const cap: Partial<Record<RoleId, number>> = { outlet: 1, playmaker: 2, ball_winner: 2, wingback: 2, press_forward: 2 };
  const pickFor = (p: Pick<Player, 'attrs' | 'position'> | null, pos: Position, phase: Phase, dflt: RoleId): RoleId => {
    if (!p) return dflt;
    let best = dflt, bv = 4;
    for (const r of rolesFor(pos, phase)) {
      if (r === dflt || (count[r] ?? 0) >= (cap[r] ?? 11)) continue;
      const v = roleFit(p, r, pos) + (lean[r] ?? 0);
      if (v > bv) { bv = v; best = r; }
    }
    count[best] = (count[best] ?? 0) + 1;
    return best;
  };
  const roles = plan.slots.map((s, k) => pickFor(xi[k] ?? null, s.pos, 'ip', plan.ip[k]));
  const oopRoles = plan.oslots.map((s, k) => pickFor(xi[k] ?? null, s.pos, 'oop', plan.oop[k]));
  return { roles, oopRoles };
}

// ---------- warnings: risky or contradictory set-ups ----------

export type Warn =
  | { k: 'fit'; slot: number; role: RoleId; fit: number }   // a player badly suited to his role
  | { k: 'rest'; n: number }                                 // too few stay back when we attack
  | { k: 'pressAlone'; slot: number; role: RoleId }          // pressing roles in a side told to sit off
  | { k: 'trapOff' }                                         // a pressing trap needs a press
  | { k: 'slowLine'; slot: number }                          // a high line with a slow centre-back
  | { k: 'noBox' }                                           // crosses and long balls with nobody in the box
  | { k: 'outlets'; n: number };                             // several forwards stay up: the block is short
// `rest`: the engine's rest defence (outfielders behind their own 42: the same count its counters read).
export function warnings(t: FullTactics, xi: (Pick<Player, 'attrs' | 'position'> | null)[], rest?: number, box?: number): Warn[] {
  const plan = planOf(t);
  const out: Warn[] = [];
  plan.slots.forEach((s, k) => {
    const p = xi[k];
    if (!p) return;
    for (const [r, pos] of [[plan.ip[k], s.pos], [plan.oop[k], plan.oslots[k].pos]] as const) { const f = roleFit(p, r, pos); if (ROLES[r].fx.w && f <= POOR_FIT) out.push({ k: 'fit', slot: k, role: r, fit: Math.round(f) }); }
    if (t.line === 2 && s.pos === 'CB' && p.attrs[0] < 62) out.push({ k: 'slowLine', slot: k });
    if (t.pressing === 0 && (plan.oop[k] === 'press_forward' || plan.oop[k] === 'ball_winner')) out.push({ k: 'pressAlone', slot: k, role: plan.oop[k] });
  });
  if (t.trap && t.pressing === 0) out.push({ k: 'trapOff' });
  if (rest !== undefined && rest < 2.6) out.push({ k: 'rest', n: Math.round(rest * 10) / 10 });
  const crossers = plan.ip.filter((r) => r === 'winger' || r === 'wingback').length;
  if (box !== undefined && box < 1.3 && (crossers >= 2 || t.width === 2 || t.build === 2)) out.push({ k: 'noBox' });
  const outlets = plan.oop.filter((r) => r === 'outlet').length;
  if (outlets >= 2) out.push({ k: 'outlets', n: outlets });
  return out;
}

// ---------- hooks for the rules layer (the referee) ----------

// Everything the referee system may read about a side's play, from the built model (see model.ts Attack.foulProp).
export interface TeamHooks {
  onPitch: number;                               // players on the pitch (the model is rebuilt when it changes)
  foulRisk: { ip: number; oop: number };         // fouls committed per phase, relative to a normal side (1)
  pressIntensity: { ip: number; oop: number };   // oop: players engaging the opponent's build-up; ip: counter-press
  lineHeight: { ip: number; oop: number };       // mean height of the back line (0 own goal … 100 their goal)
  aggression: Record<string, number>;            // per player: his role's foul multiplier (1 = normal)
}
export function teamHooks(actors: { id: string; f: number; of: number; y: number; oy: number; ofx: Fx }[], t: FullTactics, oopFoulProp: number, pressN: number): TeamHooks {
  const back = actors.filter((a) => a.f & F_DEF), oback = actors.filter((a) => a.of & F_DEF);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
  return {
    onPitch: actors.length,
    foulRisk: { ip: [0.6, 0.8, 1.2][t.cpress] * teamFoulFactor({ pressing: 1, cpress: 1 }), oop: oopFoulProp },
    pressIntensity: { ip: [0.4, 0.7, 1.1][t.cpress], oop: Math.round(pressN * 100) / 100 },
    lineHeight: { ip: Math.round(mean(back.map((a) => a.y))), oop: Math.round(mean(oback.map((a) => a.oy))) },
    aggression: Object.fromEntries(actors.map((a) => [a.id, a.ofx.foul])),
  };
}

// Rest defence: outfielders behind their own 42 when we attack (the same soft count model.ts reads for counters).
export const restDefence = (xs: { f: number; y: number }[]) => xs.reduce((s, x) => s + (x.f & F_GK ? 0 : 1 / (1 + Math.exp(-(42 - x.y) / 5))), 0);
