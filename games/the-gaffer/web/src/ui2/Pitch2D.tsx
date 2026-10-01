// Live 2D pitch (light "pitchside glass" turf since v0.13). Players move continuously (every animation frame) towards positions that follow their role and
// whether their team has the ball. Since engine v2 the ball follows the engine's own path for the minute (m.flow): the
// zone each contest happened in, who won it, who shot. The zone the ball is in glows in the colour of the side on it.
// Presentation only: nothing here decides anything (the score and stats come from the event log).
import { useEffect, useRef } from 'react';
import type { LiveMatch } from '../sim/match';
import { rngFor } from '../sim/match';
import { FORMATIONS, fullTactics } from '../sim/tactics';
import { planOf, spotOf, type Spot } from '../sim/engine/phases';
import type { Position } from '../model/types';
import type { World } from '../sim/world';
import { lineDepth, pressShape, pressSpot, speedsOf, step, type LineState, type PressPlan } from './pitch/move';

type Pt = { x: number; y: number };

const rgb = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const near = (a: string, b: string) => { const [p, q] = [rgb(a), rgb(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 140; };
// Numbers in black or white, whichever reads better on the shirt.
const ink = (hex: string) => { const [r, g, b] = rgb(hex); return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#111' : '#fff'; };
// The away side changes shirt when both kits look alike (secondary colour, else white, else black).
export function awayKit(home: string, a: [string, string]): string {
  for (const c of [a[0], a[1], '#FFFFFF', '#111111']) if (!near(home, c)) return c;
  return a[1];
}
type Beat =
  | { kind: 'pass'; side: 0 | 1; to: number; pt?: Pt; z?: number }
  | { kind: 'turnover'; side: 0 | 1; to?: number; pt?: Pt; z?: number }
  | { kind: 'shot'; side: 0 | 1; shooter: number; result: 'goal' | 'save' | 'miss' | 'block'; z?: number }
  | { kind: 'kickoff'; side: 0 | 1 }
  | { kind: 'hold' };

interface Anim {
  pos: Pt[][];            // [side][slot]
  ball: Pt;
  poss: 0 | 1;
  carrier: number;        // slot of the ball carrier in the possessing side (-1 = loose)
  flight: { from: Pt; to: Pt; t: number; dur: number; then: () => void } | null;
  beats: Beat[];
  beat: number;
  clock: number;
  beatLen: number;
  inNet: boolean;
  shooter: { side: 0 | 1; slot: number } | null; // runs into the box before a shot
  run: { side: 0 | 1; slot: number; pt: Pt } | null; // the carrier heads for the zone the engine says the play is in
  zone: number;           // zone of the ball (absolute), -1 none
  minute: number;
  time: number;
  spd: number[][];        // speed ratio per [side][slot] (pace and match fitness), refreshed every minute
  line: (LineState | undefined)[]; // each side's back-line depth out of possession
  back: [number, number]; // when each side last played the ball backwards (a time, for the back line's step-up)
}

const L = 105, W = 68;
const LINE: Record<Position, 'gk' | 'def' | 'mid' | 'fwd'> = {
  GK: 'gk', CB: 'def', LB: 'def', RB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'fwd', RW: 'fwd', ST: 'fwd',
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const toX = (side: 0 | 1, depth: number) => (side === 0 ? depth : L - depth);
const depthOf = (side: 0 | 1, x: number) => (side === 0 ? x : L - x);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// Tactics v3: every player's spot in each phase comes from the engine (phases.ts spotOf: both shapes, instructions and
// roles), so the pitch shows what the model plays. Cached per side until the tactics or the line-up change.
const SPOTS = new WeakMap<LiveMatch, Record<string, Spot[]>>();
function spotsOf(m: LiveMatch, side: 0 | 1): Spot[] {
  const s = m.sides[side];
  const key = `${side}|${JSON.stringify(s.tactics)}|${s.onPitch.join()}`;
  let c = SPOTS.get(m);
  if (!c) { c = {}; SPOTS.set(m, c); }
  if (!c[key]) {
    const t = fullTactics(s.tactics), plan = planOf(t), short = s.onPitch.filter((id) => !id).length;
    c[key] = plan.slots.map((_, k) => spotOf(null, k, t, plan, short));
  }
  return c[key];
}

// Where a player wants to be right now.
function target(m: LiveMatch, a: Anim, side: 0 | 1, k: number): Pt {
  const slot = FORMATIONS[m.sides[side].tactics.formation].slots[k];
  const sp = spotsOf(m, side)[k];
  const has = a.poss === side;
  const pos = has ? slot.pos : sp.opos, line = LINE[pos];
  const ballDepth = depthOf(side, a.ball.x);          // how far up the pitch the ball is, from this side's goal
  const bx = has ? sp.x : sp.ox, by = has ? sp.y : sp.oy;
  const sy = side === 0 ? bx : 100 - bx;              // this side's left is the top of the screen when attacking right
  let y = 3 + sy * 0.62;
  let d = 4 + by * 0.5;
  if (line === 'gk') d = has ? 7 : 4 + (by - 5) * 0.5;
  else if (has) {
    // The whole team moves up with the ball; forwards lead, defenders hold a line behind.
    d += clamp((ballDepth - 35) * 0.6, 0, 30) + { def: 6, mid: 12, fwd: 18, gk: 0 }[line];
    y += (a.ball.y - y) * 0.12;
  } else {
    // Out of possession: the engine's block (its height already carries the press and the line) follows the ball.
    d += 6 + (ballDepth - 52) * 0.35 - (line === 'def' ? 2 : 6);
    y += (a.ball.y - y) * 0.28;
    y += (W / 2 - y) * 0.2;
    if (sp.oop === 'press_forward') y += (a.ball.y - y) * 0.5;
  }
  // The player about to shoot makes his run into the box; the carrier heads for the engine's zone.
  if (a.shooter && a.shooter.side === side && a.shooter.slot === k) { d = 88; y = W / 2 + (sy - 50) * 0.12; }
  else if (a.run && a.run.side === side && a.run.slot === k) return a.run.pt;
  return { x: toX(side, clamp(d, 2, 103)), y: clamp(y, 2, W - 2) };
}

const onPitch = (m: LiveMatch, side: 0 | 1) => m.sides[side].onPitch.map((id, k) => (id ? k : -1)).filter((k) => k >= 0);
const gkSlot = (m: LiveMatch, side: 0 | 1) => FORMATIONS[m.sides[side].tactics.formation].slots.findIndex((sl) => sl.pos === 'GK');
const slotOf = (m: LiveMatch, id: string): { side: 0 | 1; slot: number } | null => {
  for (const side of [0, 1] as const) { const k = m.sides[side].onPitch.indexOf(id); if (k >= 0) return { side, slot: k }; }
  return null;
};
function forwardSlot(m: LiveMatch, side: 0 | 1): number {
  const slots = FORMATIONS[m.sides[side].tactics.formation].slots;
  const ks = onPitch(m, side);
  return ks.sort((a, b) => slots[b].y - slots[a].y)[0] ?? 0;
}

// The centre of a zone (absolute: col from the home goal × 5 + row from the home side's left), with a little jitter.
const zonePt = (z: number, r: () => number): Pt => ({ x: (Math.floor(z / 5) + 0.25 + r() * 0.5) * (L / 6), y: 3 + ((z % 5) * 20 + 4 + r() * 12) * 0.62 });
const slotNear = (m: LiveMatch, a: Anim, side: 0 | 1, pt: Pt) => onPitch(m, side).sort((x, y) => dist(a.pos[side][x] ?? pt, pt) - dist(a.pos[side][y] ?? pt, pt))[0] ?? 0;

// Plan the minute from the engine's ball path: contests won and lost, fouls, shots. Slow speeds show more of it.
function plan(a: Anim, m: LiveMatch, msPerMinute: number, world: World) {
  const r = rngFor(`${m.key}:anim`, m.minute);
  a.spd = speedsOf(m, world);
  const all: Beat[] = [];
  let poss = a.poss;
  if (a.inNet) { const side = (1 - a.poss) as 0 | 1; all.push({ kind: 'kickoff', side }); poss = side; }
  for (const f of m.flow ?? []) {
    const pt = zonePt(f.z, r);
    const found = f.p ? slotOf(m, f.p) : null;
    const slot = found && found.side === f.s ? found.slot : slotNear(m, a, f.s, pt);
    if (f.k === 'f') { all.push({ kind: 'hold' }); continue; }
    if (f.k === 'w' || f.k === 'l') {
      if (f.s !== poss) { all.push({ kind: 'turnover', side: f.s, to: slot, pt, z: f.z }); poss = f.s; }
      else all.push({ kind: 'pass', side: f.s, to: slot, pt, z: f.z });
      continue;
    }
    // A shot: the ball to the shooter, then the shot.
    if (f.s !== poss) { all.push({ kind: 'turnover', side: f.s, to: slot, pt, z: f.z }); poss = f.s; }
    else all.push({ kind: 'pass', side: f.s, to: slot, pt, z: f.z });
    all.push({ kind: 'shot', side: f.s, shooter: slot, result: f.k === 'g' ? 'goal' : f.k === 'v' ? 'save' : f.k === 'b' ? 'block' : 'miss', z: f.z });
    poss = (1 - f.s) as 0 | 1;
  }
  if (!all.length || (all.length === 1 && all[0].kind === 'kickoff')) {
    // A quiet minute: keep it moving within the side on the ball.
    const side = m.ball?.s ?? poss;
    if (side !== poss) all.push({ kind: 'turnover', side });
    const ks = onPitch(m, side);
    all.push({ kind: 'pass', side, to: ks[Math.floor(r() * ks.length)] ?? 0 });
  }
  // As many beats as the speed allows; a shot and the move before it always make the cut.
  const n = Math.max(2, Math.round(msPerMinute / 130));
  let beats = all;
  if (all.length > n) {
    const lastShot = all.map((b) => b.kind).lastIndexOf('shot');
    const end = lastShot >= 0 ? lastShot + 1 : all.length;
    beats = [...(all[0].kind === 'kickoff' ? [all[0]] : []), ...all.slice(Math.max(all[0].kind === 'kickoff' ? 1 : 0, end - n), end)];
  }
  const shot = beats.find((b) => b.kind === 'shot') as Extract<Beat, { kind: 'shot' }> | undefined;
  a.shooter = shot ? { side: shot.side, slot: shot.shooter } : null;
  a.beats = beats;
  a.beat = 0;
  a.clock = 0;
  a.beatLen = msPerMinute / Math.max(1, beats.length);
  a.minute = m.minute;
}

function fly(a: Anim, to: Pt, dur: number, then: () => void) {
  a.flight = { from: { ...a.ball }, to, t: 0, dur: Math.max(60, dur), then };
}

function runBeat(a: Anim, m: LiveMatch, b: Beat) {
  const travel = Math.min(420, a.beatLen * 0.7);
  if (b.kind === 'hold') return;
  if (b.kind === 'kickoff') {
    a.inNet = false; a.zone = -1; a.run = null;
    a.ball = { x: L / 2, y: W / 2 };
    a.poss = b.side;
    a.carrier = forwardSlot(m, b.side);
    return;
  }
  if (b.kind === 'turnover') {
    // The player the engine names (or the nearest of the other side) steps in and wins it.
    const ks = onPitch(m, b.side);
    const k = b.to ?? ks.sort((x, y) => dist(a.pos[b.side][x], a.ball) - dist(a.pos[b.side][y], a.ball))[0];
    if (k === undefined || !a.pos[b.side][k]) return;
    a.carrier = -1;
    if (b.z !== undefined) a.zone = b.z;
    if (b.pt) a.run = { side: b.side, slot: k, pt: b.pt };
    fly(a, a.pos[b.side][k], travel * 0.6, () => { a.poss = b.side; a.carrier = k; });
    return;
  }
  if (b.kind === 'pass') {
    if (b.side !== a.poss || !a.pos[b.side][b.to]) return;
    if (b.z !== undefined) a.zone = b.z;
    if (b.pt) a.run = { side: b.side, slot: b.to, pt: b.pt };
    if (b.to === a.carrier) return;
    const to = b.pt ?? a.pos[b.side][b.to];
    if (depthOf(b.side, to.x) < depthOf(b.side, a.ball.x) - 3) a.back[b.side] = a.time; // a backward pass: the other side's line steps up
    a.carrier = -1;
    fly(a, { x: to.x + (b.side === 0 ? 1 : -1), y: to.y }, travel, () => { a.carrier = b.to; });
    return;
  }
  // Shot.
  const goalX = b.side === 0 ? L + 0.8 : -0.8;
  const r = rngFor(`${m.key}:shot`, m.minute);
  a.carrier = -1; a.run = null;
  if (b.z !== undefined) a.zone = b.z;
  if (b.result === 'block') {
    const other = (1 - b.side) as 0 | 1;
    const k = onPitch(m, other).sort((x, y) => dist(a.pos[other][x], a.ball) - dist(a.pos[other][y], a.ball))[0];
    fly(a, k !== undefined ? a.pos[other][k] : a.ball, travel * 0.5, () => { a.shooter = null; a.poss = other; a.carrier = k ?? -1; });
    return;
  }
  if (b.result === 'goal') fly(a, { x: goalX, y: W / 2 + (r() - 0.5) * 5 }, travel * 0.8, () => { a.inNet = true; a.shooter = null; });
  else if (b.result === 'miss') fly(a, { x: goalX + (b.side === 0 ? 2 : -2), y: W / 2 + (r() < 0.5 ? -1 : 1) * (5 + r() * 6) }, travel * 0.8, () => {
    const other = (1 - b.side) as 0 | 1; a.shooter = null; a.poss = other; a.carrier = gkSlot(m, other);
  });
  else {
    const other = (1 - b.side) as 0 | 1;
    const gk = gkSlot(m, other);
    fly(a, a.pos[other][gk] ?? { x: goalX, y: W / 2 }, travel * 0.8, () => { a.shooter = null; a.poss = other; a.carrier = gk; });
  }
}

// ---------- cameras ----------
// 0 = 2D from above; 1 = 2.5D, a fixed camera high above the near touchline; 2 = 3D, a lower, closer broadcast camera
// that pans with the ball. Positions are projected here (not with a CSS tilt) so players stay round and upright.
export type Camera = 0 | 1 | 2;
type Proj = (x: number, y: number) => [number, number, number]; // screen x, screen y, size scale
const CAMS = [
  null,
  { D: 70, H: 82, f: 70, top: 2, height: 46 },
  { D: 45, H: 35, f: 72, top: 4, height: 42 },
] as const;
export const viewHeight = (cam: Camera) => CAMS[cam]?.height ?? W;

function projector(cam: Camera, cx: number): Proj {
  const c = CAMS[cam];
  if (!c) return (x, y) => [x, y, 1];
  const horizon = c.top - (c.f * c.H) / (c.D + W);
  const kMid = c.f / (c.D + W / 2);
  return (x, y) => {
    const k = c.f / (c.D + (W - y));
    return [L / 2 + (x - cx) * k, horizon + k * c.H, k / kMid];
  };
}

// Pitch markings as SVG path data for a projection (straight lines stay straight; circles are sampled).
function markings(pr: Proj): { pitch: string; stripes: string; lines: string; grid: string } {
  const poly = (pts: [number, number][], close = true) =>
    pts.map(([x, y], i) => { const [a, b] = pr(x, y); return `${i ? 'L' : 'M'}${a.toFixed(2)} ${b.toFixed(2)}`; }).join('') + (close ? 'Z' : '');
  const rect = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  const circle = (cx: number, cy: number, r: number) => poly(Array.from({ length: 36 }, (_, i) => [cx + r * Math.cos((i / 36) * Math.PI * 2), cy + r * Math.sin((i / 36) * Math.PI * 2)] as [number, number]));
  const stripes = [0, 1, 2, 3, 4, 5, 6].map((k) => rect(k * 15, 0, 7.5, W)).join('');
  const lines = [
    rect(0, 0.5, L, W - 1), poly([[L / 2, 0.5], [L / 2, W - 0.5]], false), circle(L / 2, W / 2, 9.15),
    rect(0, 13.85, 16.5, 40.3), rect(L - 16.5, 13.85, 16.5, 40.3), rect(0, 24.85, 5.5, 18.3), rect(L - 5.5, 24.85, 5.5, 18.3),
    rect(-1.8, 30.35, 1.8, 7.3), rect(L, 30.35, 1.8, 7.3),
  ].join('');
  // The engine's zones: six columns and five rows, drawn faintly.
  const grid = [1, 2, 3, 4, 5].map((k) => poly([[(k * L) / 6, 0.5], [(k * L) / 6, W - 0.5]], false)).join('')
    + [1, 2, 3, 4].map((k) => { const y = 3 + k * 20 * 0.62; return poly([[0, y], [L, y]], false); }).join('');
  return { pitch: rect(-4, -3, L + 8, W + 6), stripes, lines, grid };
}

export function Pitch2D({ m, world, msPerMinute, running, goalWord = 'GOAL', camera = 0 }: { m: LiveMatch; world: World; msPerMinute: number; running: boolean; goalWord?: string; camera?: Camera }) {
  const mRef = useRef(m);
  mRef.current = m;
  const worldRef = useRef(world);
  worldRef.current = world;
  const cfg = useRef({ msPerMinute, running, camera });
  cfg.current = { msPerMinute, running, camera };
  const pitchRef = useRef<SVGPathElement | null>(null);
  const stripeRef = useRef<SVGPathElement | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const gridRef = useRef<SVGPathElement | null>(null);
  const zoneRef = useRef<SVGPathElement | null>(null);
  const lastZone = useRef('');
  const layer = useRef<SVGGElement | null>(null);
  const camX = useRef(L / 2);
  const lastMarks = useRef('');
  const dots = useRef<(SVGGElement | null)[][]>([[], []]);
  const ballRef = useRef<SVGGElement | null>(null);
  const netRef = useRef<SVGTextElement | null>(null);
  const anim = useRef<Anim | null>(null);

  const colors = m.sides.map((s) => world.clubs.find((c) => c.id === s.clubId)!.colors);
  const kit = [colors[0][0], awayKit(colors[0][0], colors[1] as [string, string])];
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const numbers = m.sides.map((s) => s.onPitch.map((id) => (id ? world.players.find((p) => p.id === id)?.shirtNumber ?? '' : '')));

  // Start: everyone in position, home side kicks off.
  if (!anim.current) {
    const a: Anim = {
      pos: [[], []], ball: { x: L / 2, y: W / 2 }, poss: 0, carrier: forwardSlot(m, 0), flight: null, beats: [], beat: 0, clock: 0,
      beatLen: 400, inNet: false, shooter: null, run: null, zone: -1, minute: -1, time: 0,
      spd: speedsOf(m, world), line: [undefined, undefined], back: [-1e9, -1e9],
    };
    for (const side of [0, 1] as const) {
      const slots = FORMATIONS[m.sides[side].tactics.formation].slots;
      a.pos[side] = slots.map((_, k) => target(m, a, side, k));
    }
    anim.current = a;
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      const a = anim.current!;
      const mm = mRef.current;
      const { msPerMinute: ms, running: go, camera: cam } = cfg.current;
      a.time += dt;
      if (a.minute !== mm.minute) plan(a, mm, ms, worldRef.current);
      if (go) {
        a.clock += dt;
        while (a.beat < a.beats.length && a.clock >= a.beat * a.beatLen) runBeat(a, mm, a.beats[a.beat++]);
      }
      // Ball: in flight, or at the carrier's feet.
      if (a.flight) {
        const f = a.flight;
        f.t = Math.min(1, f.t + dt / f.dur);
        const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - (-2 * f.t + 2) ** 2 / 2;
        a.ball = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e };
        if (f.t >= 1) { a.flight = null; f.then(); }
      } else if (a.carrier >= 0 && a.pos[a.poss][a.carrier] && !a.inNet) {
        const p = a.pos[a.poss][a.carrier];
        a.ball = { x: p.x + (a.poss === 0 ? 1.1 : -1.1), y: p.y + 0.6 };
      }
      // Players move towards where they want to be at their own speed (pace, stamina); out of possession the back line
      // moves as one and the press comes with cover (ui2/pitch/move.ts).
      for (const side of [0, 1] as const) {
        const ks = onPitch(mm, side);
        const slots = FORMATIONS[mm.sides[side].tactics.formation].slots;
        const sps = spotsOf(mm, side);
        const has = a.poss === side;
        const ownGoal = { x: toX(side, 0), y: W / 2 };
        const tg: Pt[] = [];
        for (const k of ks) tg[k] = target(mm, a, side, k);
        let pp: PressPlan = { press: [], cover: -1, trigger: false };
        if (!has) {
          pp = pressShape(ks.filter((k) => LINE[slots[k].pos] !== 'gk'), a.pos[side], a.ball, depthOf(side, a.ball.x), mm.sides[side].tactics.pressing, (k) => sps[k]?.oop ?? '');
          const line = (k: number) => LINE[sps[k]?.opos ?? slots[k].pos];
          const free = (k: number) => !pp.press.includes(k) && k !== pp.cover;
          const defs = ks.filter((k) => line(k) === 'def' && free(k));
          // Step up after their backward pass; drop off when their carrier has time and space in our half.
          const other = (1 - side) as 0 | 1;
          const pressed = ks.some((k) => a.pos[side][k] && Math.hypot(a.pos[side][k].x - a.ball.x, a.pos[side][k].y - a.ball.y) < 6);
          const adjust = a.time - a.back[other] < 1500 ? 5 : !pressed && depthOf(side, a.ball.x) < 60 ? -4 : 0;
          const ln = lineDepth(defs.map((k) => depthOf(side, tg[k].x)), a.line[side], adjust, a.time);
          a.line[side] = ln;
          for (const k of ks) {
            if (!free(k)) continue;
            const d = depthOf(side, tg[k].x);
            if (line(k) === 'def') tg[k] = { x: toX(side, ln.depth), y: tg[k].y };
            else if (line(k) === 'mid') tg[k] = { x: toX(side, clamp(d, ln.depth + 8, ln.depth + 16)), y: tg[k].y };
            else if (line(k) === 'fwd') tg[k] = { x: toX(side, Math.min(d, ln.depth + 38)), y: tg[k].y };
          }
          for (const k of pp.press) tg[k] = pressSpot(a.ball, ownGoal, 1.8);
          if (pp.cover >= 0 && pp.press.length) tg[pp.cover] = pressSpot(a.ball, ownGoal, 7);
        } else a.line[side] = undefined;
        for (const k of ks) {
          let t = tg[k];
          if (has && k === a.carrier) t = { x: t.x * 0.3 + a.pos[side][k].x * 0.7 + (side === 0 ? 0.4 : -0.4), y: t.y * 0.3 + a.pos[side][k].y * 0.7 };
          const wob = Math.sin(a.time / 700 + k * 1.7 + side * 3) * 0.5;
          const p = a.pos[side][k] ?? t;
          const sprint = pp.press.includes(k) ? (pp.trigger ? 1.6 : 1.3) : 1;
          a.pos[side][k] = step(p, { x: t.x, y: t.y + wob }, dt, ms, (a.spd[side]?.[k] ?? 1) * sprint);
        }
      }
      // Draw. In Arabic the home side sits on the right of the score, so the picture is mirrored (the numbers are not).
      const flip = document.documentElement.dir === 'rtl';
      const fx = (x: number) => (flip ? L - x : x);
      // The 3D camera pans with the ball (smoothly, and never far past the boxes).
      const want = cam === 2 ? Math.min(L * 0.72, Math.max(L * 0.28, fx(a.ball.x))) : L / 2;
      camX.current += (want - camX.current) * Math.min(1, dt / 350);
      const pr = projector(cam, camX.current);
      const key = `${cam}:${cam === 2 ? camX.current.toFixed(1) : ''}`;
      if (key !== lastMarks.current) {
        const mk = markings(pr);
        pitchRef.current?.setAttribute('d', mk.pitch);
        stripeRef.current?.setAttribute('d', mk.stripes);
        lineRef.current?.setAttribute('d', mk.lines);
        gridRef.current?.setAttribute('d', mk.grid);
        lastMarks.current = key;
      }
      // The zone the play is in, in the colour of the side on the ball.
      const zk = `${a.zone}:${a.poss}:${key}:${flip}`;
      if (zk !== lastZone.current && zoneRef.current) {
        lastZone.current = zk;
        if (a.zone < 0) zoneRef.current.setAttribute('d', '');
        else {
          const c = Math.floor(a.zone / 5), rw = a.zone % 5;
          const x0 = (c * L) / 6, x1 = ((c + 1) * L) / 6, y0 = 3 + rw * 20 * 0.62, y1 = 3 + (rw + 1) * 20 * 0.62;
          const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y], i) => { const [px, py] = pr(fx(x), y); return `${i ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)}`; }).join('') + 'Z';
          zoneRef.current.setAttribute('d', pts);
          zoneRef.current.setAttribute('fill', kitRef.current[a.poss]);
        }
      }
      const order: [number, SVGGElement][] = [];
      for (const side of [0, 1] as const) {
        dots.current[side].forEach((g, k) => {
          if (!g) return;
          const on = !!mm.sides[side].onPitch[k];
          g.style.display = on ? '' : 'none';
          const p = a.pos[side][k];
          if (on && p) {
            const [sx, sy, sc] = pr(fx(p.x), p.y);
            g.setAttribute('transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)}) scale(${sc.toFixed(3)})`);
            order.push([p.y, g]);
          }
          g.classList.toggle('carrier', on && a.poss === side && a.carrier === k);
        });
      }
      // Far players are drawn first, so nearer ones overlap them.
      if (cam && layer.current && Math.floor(a.time / 150) !== Math.floor((a.time - dt) / 150)) {
        order.sort((x, y) => x[0] - y[0]).forEach(([, g]) => layer.current!.appendChild(g));
      }
      const [bx, by, bs] = pr(fx(a.ball.x), a.ball.y);
      ballRef.current?.setAttribute('transform', `translate(${bx.toFixed(2)} ${by.toFixed(2)}) scale(${bs.toFixed(3)})`);
      if (ballRef.current && layer.current && cam) layer.current.appendChild(ballRef.current);
      netRef.current?.setAttribute('opacity', a.inNet ? '1' : '0');
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const vh = viewHeight(camera);
  return (
    <svg className={`pitch2d cam${camera}`} viewBox={`-2 0 ${L + 4} ${vh}`} role="img" aria-label="pitch">
      <rect x="-2" y="0" width={L + 4} height={vh} style={{ fill: 'var(--pitch-b)' }} />
      <path ref={pitchRef} style={{ fill: 'var(--pitch-a)' }} />
      <path ref={stripeRef} style={{ fill: 'var(--pitch-b)' }} />
      <path ref={gridRef} fill="none" style={{ stroke: 'var(--pitch-line)' }} strokeOpacity=".45" strokeWidth=".3" strokeDasharray="1 1.4" />
      <path ref={zoneRef} className="g-zone" opacity=".2" />
      <path ref={lineRef} fill="none" style={{ stroke: 'var(--pitch-line)' }} strokeWidth=".4" strokeLinejoin="round" />
      <g ref={layer}>
        {([0, 1] as const).map((side) => m.sides[side].onPitch.map((_, k) => (
          <g key={`${side}-${k}`} ref={(el) => { dots.current[side][k] = el; }} className="g-dot2">
            <circle r="2.3" fill={kit[side]} stroke="#021311" strokeOpacity=".8" strokeWidth=".45" />
            <text className="g-dot-n" y=".85" textAnchor="middle" fill={ink(kit[side])}>{numbers[side][k]}</text>
          </g>
        )))}
        <g ref={ballRef}><circle r="1.05" fill="#fff" stroke="#111" strokeWidth=".3" /></g>
      </g>
      <text ref={netRef} className="g-goal" x={L / 2} y={vh / 2 + 4} textAnchor="middle" opacity="0">{goalWord}</text>
    </svg>
  );
}
