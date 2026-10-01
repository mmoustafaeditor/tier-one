// Live 2D pitch (light "pitchside glass" turf since v0.13). Players move continuously (every animation frame) towards positions that follow their role and
// whether their team has the ball. Since engine v2 the ball follows the engine's own path for the minute (m.flow): the
// zone each contest happened in, who won it, who shot. The zone the ball is in glows in the colour of the side on it.
// Presentation only: nothing here decides anything (the score and stats come from the event log).
import { useEffect, useRef } from 'react';
import type { LiveMatch, MatchEvent } from '../sim/match';
import { T } from './pitch/tuning';
import { bodiesOf, decideMs, move, reactMs, type Body } from './pitch/body';
import { assignMarks, blockSpot, inBox, keeperSpot, markSpot, slideY, wideInThird } from './pitch/defend';
import { attackSpots, defendSpots, rushFor, wallSize, wallSpots, type SetPiece } from './pitch/setpieces';
import { rngFor } from '../sim/match';
import { FORMATIONS, fullTactics } from '../sim/tactics';
import { planOf, spotOf, type Spot } from '../sim/engine/phases';
import type { Position } from '../model/types';
import type { World } from '../sim/world';
import { ARC, THROUGH_LEAD, TRANSITION_MS, arcHeight, buildUp, deliveryOf, lineDepth, passKind, pressShape, pressSpot, runFor, shooterSpot, shotTarget, speedsOf, wideOf, type LineState, type PassKind, type PressPlan, type Transition } from './pitch/move';

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
  | { kind: 'pass'; side: 0 | 1; to: number; pt?: Pt; z?: number; type?: PassKind }
  | { kind: 'turnover'; side: 0 | 1; to?: number; pt?: Pt; z?: number }
  | { kind: 'shot'; side: 0 | 1; shooter: number; result: 'goal' | 'save' | 'miss' | 'block'; z?: number; how?: string }
  | { kind: 'kickoff'; side: 0 | 1 }
  | { kind: 'corner'; side: 0 | 1; taker?: number }
  | { kind: 'offside'; side: 0 | 1 }
  | { kind: 'foul'; side: 0 | 1; to: number; pt: Pt }
  | { kind: 'hold' };

interface Anim {
  pos: Pt[][];            // [side][slot]
  ball: Pt;
  poss: 0 | 1;
  carrier: number;        // slot of the ball carrier in the possessing side (-1 = loose)
  flight: { from: Pt; to: Pt; t: number; dur: number; then: () => void; h: number; end: number } | null;
  bh: number;             // the ball's height in metres (lofted passes, crosses, shots over the bar)
  beats: Beat[];
  beat: number;
  clock: number;
  beatLen: number;        // one ordinary beat (ms); a set piece takes a few (WEIGHT), within the same minute
  starts: number[];       // when each beat starts (ms into the minute)
  msPM: number;           // real ms per match minute (the speed setting) when the minute was planned
  inNet: boolean;
  shooter: { side: 0 | 1; slot: number; how?: string } | null; // runs into the box (or to the edge of it) before a shot
  run: { side: 0 | 1; slot: number; pt: Pt } | null; // the carrier heads for the zone the engine says the play is in
  zone: number;           // zone of the ball (absolute), -1 none
  minute: string;         // the minute last planned ("min+plus": added time plays out too)
  time: number;
  spd: number[][];        // speed ratio per [side][slot] (pace and match fitness), refreshed every minute
  body: Body[][];         // phase 1: each player's body and reading of the game (ui2/pitch/body.ts), refreshed every minute
  ag: Agent[][];          // phase 1: each player's velocity, the target he has committed to, and his sprint tank
  eventAt: number;        // when the ball last changed (a pass, a turnover, a shot, a set piece): players react after it
  reacts: [number, number][]; // (reads, measured reaction in ms) for the measurement test, the last 400
  kin: { turn: number; acc: number }; // the largest turn and acceleration seen, as a share of the player's limit
  line: (LineState | undefined)[]; // each side's back-line depth out of possession
  back: [number, number]; // when each side last played the ball backwards (a time, for the back line's step-up)
  trans: Transition | null; // the last turnover: who lost it and when (counter-press, recovery runs, breaks)
  runsN: number;          // real runs off the ball this frame (for the measurement test)
  kinds: Record<string, number>; // passes, shots and set pieces shown, by type (for the measurement test)
  sp: SetPiece | null;    // a set piece being staged (corner, free kick, goal kick)
  flag: { x: number; until: number } | null; // the assistant's flag is up (offside), at this x on the near touchline
}

interface Agent { vx: number; vy: number; tx: number; ty: number; at: number; tank: number; pend: boolean; spr: boolean }
const L = 105, W = 68;
// Measurement hook for ui-tests/pitch.mjs: only with ?pitchdebug in the address.
const PITCH_DEBUG = typeof location !== 'undefined' && /[?&]pitchdebug\b/.test(location.search);
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
  if (a.shooter && a.shooter.side === side && a.shooter.slot === k) ({ d, y } = shooterSpot(a.shooter.how, sy));
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
  a.body = bodiesOf(m, world);
  const all: Beat[] = [];
  let poss = a.poss;
  if (a.inNet) { const side = (1 - a.poss) as 0 | 1; all.push({ kind: 'kickoff', side }); poss = side; }
  for (const f of m.flow ?? []) {
    const pt = zonePt(f.z, r);
    const found = f.p ? slotOf(m, f.p) : null;
    const slot = found && found.side === f.s ? found.slot : slotNear(m, a, f.s, pt);
    if (f.k === 'f') { all.push({ kind: 'foul', side: f.s, to: slot, pt }); poss = f.s; continue; }
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
    // A quiet minute: the side on the ball builds up in its own style (move.ts buildUp).
    const side = m.ball?.s ?? poss;
    if (side !== poss) all.push({ kind: 'turnover', side });
    const slots = FORMATIONS[m.sides[side].tactics.formation].slots;
    const mates = onPitch(m, side).filter((k) => slots[k].pos !== 'GK' && a.pos[side][k]).map((k) => ({ k, line: LINE[slots[k].pos] as 'def' | 'mid' | 'fwd', y: a.pos[side][k].y }));
    const phil = fullTactics(m.sides[side].tactics).philosophy;
    const chain = buildUp(phil, mates, side === a.poss ? a.carrier : -1, r);
    for (const k of chain) all.push({ kind: 'pass', side, to: k });
    a.kinds[`chain:${phil}`] = (a.kinds[`chain:${phil}`] ?? 0) + 1;
    a.kinds[`chainLen:${phil}`] = (a.kinds[`chainLen:${phil}`] ?? 0) + chain.length;
  }
  // The engine's shot types (this minute's shot events, in the same order as the flow's shots): a header or a set
  // piece is set up by a cross from out wide, a cutback by a ball pulled back from the byline, a through shot by a
  // through ball; a long shot is hit from the edge of the box.
  const now = (e: MatchEvent) => e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0) && SHOT_EV.has(e.kind);
  const shotEv = m.events.filter(now);
  const shotIx = all.map((b, i) => (b.kind === 'shot' ? i : -1)).filter((i) => i >= 0);
  if (shotEv.length === shotIx.length) {
    for (let j = shotIx.length - 1; j >= 0; j--) {
      const i = shotIx[j], b = all[i] as Extract<Beat, { kind: 'shot' }>;
      b.how = shotEv[j].how;
      const pre = all[i - 1], dl = deliveryOf(b.how);
      if (!dl || pre?.kind !== 'pass' || pre.side !== b.side) continue;
      pre.type = dl;
      if (dl === 'through' || b.how === 'corner') continue;
      // The ball goes out wide first, to the flank the nearest wide player is on.
      const ks = onPitch(m, b.side).filter((k) => k !== b.shooter && FORMATIONS[m.sides[b.side].tactics.formation].slots[k].pos !== 'GK' && a.pos[b.side][k]);
      const wk = ks.sort((p, q) => Math.abs(a.pos[b.side][q].y - W / 2) - Math.abs(a.pos[b.side][p].y - W / 2))[0];
      if (wk === undefined) continue;
      const top = a.pos[b.side][wk].y < W / 2;
      all.splice(i - 1, 0, { kind: 'pass', side: b.side, to: wk, pt: { x: toX(b.side, dl === 'cutback' ? 99 : 82), y: top ? 6 : W - 6 } });
    }
  }
  // Corners and offsides go where the engine had them: after as many shots as came before them in the event log.
  const live = (e: MatchEvent) => e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0);
  let shotsSeen = 0;
  const place: { after: number; b: Beat }[] = [];
  for (const e of m.events) {
    if (!live(e)) continue;
    if (SHOT_EV.has(e.kind)) shotsSeen++;
    else if (e.kind === 'corner') { const f = e.playerId ? slotOf(m, e.playerId) : null; place.push({ after: shotsSeen, b: { kind: 'corner', side: e.side, taker: f && f.side === e.side ? f.slot : undefined } }); }
    else if (e.kind === 'offside') place.push({ after: shotsSeen, b: { kind: 'offside', side: e.side } });
  }
  for (const { after, b } of place.reverse()) {
    // After the n-th shot beat; a corner that leads to the next shot goes before that shot's delivery.
    let i = 0, seen = 0;
    while (i < all.length && seen < after) { if (all[i].kind === 'shot') seen++; i++; }
    if (b.kind === 'offside') {
      // The flag goes up just before the other side gets the ball.
      const j = all.findIndex((x, ix) => ix >= i && x.kind === 'turnover' && x.side !== b.side);
      if (j >= 0) all.splice(j, 0, b);
      continue;
    }
    while (i < all.length && all[i].kind === 'pass' && all[i + 1]?.kind !== 'shot') i++;
    all.splice(i, 0, b);
  }
  // Keep who has the ball consistent after the staging: a pass by the side without it becomes a turnover, and back.
  let has: 0 | 1 = a.poss;
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    if (b.kind === 'kickoff' || b.kind === 'corner' || b.kind === 'foul') has = b.side;
    else if (b.kind === 'offside') has = (1 - b.side) as 0 | 1;
    else if (b.kind === 'shot') has = (1 - b.side) as 0 | 1;
    else if (b.kind === 'pass' && b.side !== has) { all[i] = { kind: 'turnover', side: b.side, to: b.to, pt: b.pt, z: b.z }; has = b.side; }
    else if (b.kind === 'turnover') { if (b.side === has && b.to !== undefined) all[i] = { kind: 'pass', side: b.side, to: b.to, pt: b.pt, z: b.z }; has = b.side; }
  }
  // As many beats as the speed allows; a shot and the move before it always make the cut.
  const n = Math.max(2, Math.round(msPerMinute / 130));
  let beats = all;
  if (all.length > n) {
    const lastShot = all.map((b) => b.kind).lastIndexOf('shot');
    const end = lastShot >= 0 ? lastShot + 1 + (all[lastShot + 1]?.kind === 'corner' ? 1 : 0) : all.length; // a corner won by the shot stays too
    beats = [...(all[0].kind === 'kickoff' ? [all[0]] : []), ...all.slice(Math.max(all[0].kind === 'kickoff' ? 1 : 0, end - n), end)];
  }
  const shot = beats.find((b) => b.kind === 'shot') as Extract<Beat, { kind: 'shot' }> | undefined;
  a.shooter = shot ? { side: shot.side, slot: shot.shooter, how: shot.how } : null;
  a.beats = beats;
  a.beat = 0;
  a.clock = 0;
  a.msPM = msPerMinute;
  // A set piece gets a longer share of the minute (players need time to take their spots); the minute stays as long.
  const wt = beats.map((b) => weightOf(b));
  a.beatLen = msPerMinute / Math.max(1, wt.reduce((t, x) => t + x, 0));
  a.starts = wt.map((_, i) => wt.slice(0, i).reduce((t, x) => t + x, 0) * a.beatLen);
  a.minute = minuteKey(m);
}
const weightOf = (b: Beat) => (b.kind === 'corner' ? 4 : b.kind === 'foul' ? (wallSize(depthOf(b.side, b.pt.x)) ? 4 : 1.5) : b.kind === 'offside' ? 1.5 : 1);
const SHOT_EV = new Set(['goal', 'nogoal', 'save', 'block', 'miss']);
const minuteKey = (m: LiveMatch) => `${m.minute}+${m.plus ?? 0}`;

function fly(a: Anim, to: Pt, dur: number, then: () => void, h = 0, end = 0) {
  a.flight = { from: { ...a.ball }, to, t: 0, dur: Math.max(60, dur), then, h, end };
}
const nearestOf = (m: LiveMatch, a: Anim, side: 0 | 1, pt: Pt) => onPitch(m, side).filter((k) => a.pos[side][k]).sort((x, y) => dist(a.pos[side][x], pt) - dist(a.pos[side][y], pt))[0];

function runBeat(a: Anim, m: LiveMatch, b: Beat) {
  const travel = Math.min(420, a.beatLen * 0.7);
  if (b.kind === 'hold') return;
  // The ball changes: everyone not on it reacts after his own reaction time (phase 1).
  a.eventAt = a.time;
  for (const row of a.ag) for (const g of row) if (g) g.pend = true;
  if (b.kind === 'pass' || b.kind === 'turnover' || b.kind === 'shot' || b.kind === 'kickoff') a.sp = null; // the ball is live again
  if (b.kind === 'kickoff') {
    a.inNet = false; a.zone = -1; a.run = null;
    a.ball = { x: L / 2, y: W / 2 };
    a.poss = b.side;
    a.carrier = forwardSlot(m, b.side);
    return;
  }
  if (b.kind === 'corner') {
    // To the corner flag on the ball's side; the taker (the engine's, else the nearest) goes to it.
    const flag = { x: toX(b.side, 104.4), y: a.ball.y < W / 2 ? 0.8 : W - 0.8 };
    const k = b.taker ?? nearestOf(m, a, b.side, flag);
    if (k === undefined) return;
    a.run = null; a.carrier = -1; a.zone = -1;
    a.sp = { kind: 'corner', side: b.side, at: flag, until: a.time + a.beatLen * weightOf(b), taker: k, rush: rushFor(a.msPM, a.beatLen * weightOf(b)) };
    a.kinds.corner = (a.kinds.corner ?? 0) + 1;
    fly(a, flag, travel * 0.3, () => { a.poss = b.side; a.carrier = k; });
    return;
  }
  if (b.kind === 'offside') {
    // The flag goes up on the line of the last defender; the free kick goes to the other side (the next beat).
    a.flag = { x: a.ball.x, until: a.time + Math.max(1400, a.beatLen * 1.5) };
    a.kinds.offside = (a.kinds.offside ?? 0) + 1;
    return;
  }
  if (b.kind === 'foul') {
    // The whistle: a free kick where the foul was; within range of goal the other side builds a wall.
    if (!a.pos[b.side][b.to]) return;
    a.run = null; a.carrier = -1;
    a.sp = { kind: 'fk', side: b.side, at: b.pt, until: a.time + a.beatLen * weightOf(b), taker: b.to, rush: rushFor(a.msPM, a.beatLen * weightOf(b)) };
    a.kinds.foul = (a.kinds.foul ?? 0) + 1;
    if (wallSize(depthOf(b.side, b.pt.x))) a.kinds.wall = (a.kinds.wall ?? 0) + 1;
    fly(a, b.pt, travel * 0.3, () => { a.poss = b.side; a.carrier = b.to; });
    return;
  }
  if (b.kind === 'turnover') {
    // The player the engine names (or the nearest of the other side) steps in and wins it.
    const ks = onPitch(m, b.side);
    const k = b.to ?? ks.sort((x, y) => dist(a.pos[b.side][x], a.ball) - dist(a.pos[b.side][y], a.ball))[0];
    if (k === undefined || !a.pos[b.side][k]) return;
    a.carrier = -1;
    a.trans = { lost: (1 - b.side) as 0 | 1, at: a.time };
    if (b.z !== undefined) a.zone = b.z;
    if (b.pt) a.run = { side: b.side, slot: k, pt: b.pt };
    fly(a, a.pos[b.side][k], travel * 0.6, () => { a.poss = b.side; a.carrier = k; });
    return;
  }
  if (b.kind === 'pass') {
    if (b.side !== a.poss || !a.pos[b.side][b.to]) return;
    if (b.z !== undefined) a.zone = b.z;
    if (b.pt) a.run = { side: b.side, slot: b.to, pt: b.pt };
    if (b.to === a.carrier) return; // he carries it on himself (the run above)
    // To the shooter: where he's running to (his spot in or at the edge of the box).
    const toShooter = a.shooter?.side === b.side && a.shooter.slot === b.to;
    let to = toShooter ? target(m, a, b.side, b.to) : b.pt ?? a.pos[b.side][b.to];
    const df = depthOf(b.side, a.ball.x), dt0 = depthOf(b.side, to.x);
    const type = b.type ?? passKind(df, a.ball.y, dt0, to.y, dist(a.ball, to));
    // A through ball goes into space ahead of the runner.
    if (type === 'through') to = { x: toX(b.side, Math.min(dt0 + THROUGH_LEAD, 100)), y: to.y };
    if (dt0 < df - 3) a.back[b.side] = a.time; // a backward pass: the other side's line steps up
    a.kinds[type] = (a.kinds[type] ?? 0) + 1;
    a.carrier = -1;
    const arc = ARC[type];
    fly(a, { x: to.x + (b.side === 0 ? 1 : -1), y: to.y }, travel * arc.t, () => { a.carrier = b.to; }, arc.h);
    return;
  }
  // Shot: spread across the goal (or wide, or over the bar); a save can be parried out, a block deflects.
  const goalX = b.side === 0 ? L + 0.8 : -0.8;
  const r = rngFor(`${m.key}:shot`, m.minute);
  a.carrier = -1; a.run = null;
  if (b.z !== undefined) a.zone = b.z;
  a.kinds[`shot:${b.how ?? 'box'}`] = (a.kinds[`shot:${b.how ?? 'box'}`] ?? 0) + 1;
  const other = (1 - b.side) as 0 | 1;
  const lift = b.how === 'long' || b.how === 'fk' ? 1.6 : 0.5;
  const fwd = b.side === 0 ? 1 : -1;
  if (b.result === 'block') {
    const k = nearestOf(m, a, other, a.ball);
    const at = k !== undefined ? a.pos[other][k] : a.ball;
    // Off the blocker and a few metres away; the nearest defender picks it up.
    fly(a, at, travel * 0.35, () => {
      const loose = { x: clamp(at.x - fwd * (2 + r() * 4), 1, L - 1), y: clamp(at.y + (r() - 0.5) * 10, 1, W - 1) };
      fly(a, loose, travel * 0.4, () => { const n = nearestOf(m, a, other, loose); a.shooter = null; a.poss = other; a.carrier = n ?? -1; });
    });
    return;
  }
  const t = shotTarget(b.result, r);
  if (b.result === 'goal') fly(a, { x: goalX, y: t.y }, travel * 0.8, () => { a.inNet = true; a.shooter = null; }, lift, t.h);
  else if (b.result === 'miss') fly(a, { x: goalX + fwd * 2, y: t.y }, travel * 0.8, () => {
    // A goal kick: the keeper places it on the six-yard box.
    a.shooter = null; a.poss = other; a.carrier = gkSlot(m, other);
    a.sp = { kind: 'gk', side: other, at: { x: toX(other, 5.5), y: W / 2 + (t.y < W / 2 ? -9 : 9) }, until: a.time + a.beatLen * 1.2, taker: a.carrier, rush: 1 };
    a.kinds.goalkick = (a.kinds.goalkick ?? 0) + 1;
  }, lift, t.h);
  else {
    const gk = gkSlot(m, other);
    const keeper = a.pos[other][gk] ?? { x: goalX, y: W / 2 };
    const save = { x: goalX - fwd * 1.2, y: clamp(t.y, keeper.y - 3.5, keeper.y + 3.5) };
    fly(a, save, travel * 0.7, () => {
      a.shooter = null;
      // Parried out (a third of saves) to the side of the box, where the nearest defender clears it; otherwise held.
      if (r() < 0.35) {
        const out = { x: goalX - fwd * (6 + r() * 6), y: clamp(save.y + (save.y < W / 2 ? -1 : 1) * (6 + r() * 8), 3, W - 3) };
        fly(a, out, travel * 0.45, () => { a.poss = other; a.carrier = nearestOf(m, a, other, out) ?? gk; });
        a.kinds.parry = (a.kinds.parry ?? 0) + 1;
      } else { a.poss = other; a.carrier = gk; }
    }, lift, t.h);
  }
}

// Set pieces: the attackers' and defenders' spots for a corner (and a free kick in range, with its wall), the keeper's
// spot for a goal kick. Outfield players only; the order follows who is best in the air (centre-backs and strikers first).
// The ball is dead: the walk to the spots is sped up (a real corner takes half a minute), so they're set before the kick
// at any match speed (SetPiece.rush).
const AIR: Record<string, number> = { CB: 0, ST: 1, CDM: 2, CM: 3, LB: 4, RB: 4, CAM: 5, LW: 6, RW: 6, GK: 9 };
function stage(a: Anim, m: LiveMatch, side: 0 | 1, ks: number[], tg: Pt[], boost: number[]) {
  const sp = a.sp!, slots = FORMATIONS[m.sides[side].tactics.formation].slots;
  if (sp.kind === 'gk') { if (side === sp.side && a.carrier >= 0) tg[a.carrier] = sp.at; return; }
  const att = sp.side, flank: -1 | 1 = sp.at.y < W / 2 ? -1 : 1;
  const field = ks.filter((k) => slots[k].pos !== 'GK' && !(side === att && k === sp.taker)).sort((p, q) => AIR[slots[p].pos] - AIR[slots[q].pos]);
  const ballD = depthOf(att, sp.at.x);
  if (side === att) {
    if (sp.kind === 'fk' && !wallSize(ballD)) return; // a free kick out of range is just played on
    attackSpots(field.length, flank).forEach((q, i) => { tg[field[i]] = { x: toX(side, q.d), y: q.y }; boost[field[i]] = sp.rush; });
    if (sp.taker >= 0) { tg[sp.taker] = { x: sp.at.x - (side === 0 ? 1.2 : -1.2), y: sp.at.y }; boost[sp.taker] = sp.rush; }
    return;
  }
  if (sp.kind === 'fk') {
    const n = wallSize(ballD);
    if (!n) return;
    const goal = { x: toX(side, 0), y: W / 2 };
    // The wall is picked once (the nearest men when the whistle goes), so nobody swaps in and out of it.
    const near = sp.wall ??= [...field].sort((p, q) => dist(a.pos[side][p], sp.at) - dist(a.pos[side][q], sp.at)).slice(0, n);
    wallSpots(sp.at, goal, n).forEach((q, i) => { tg[near[i]] = q; boost[near[i]] = sp.rush; });
    const rest = field.filter((k) => !near.includes(k));
    defendSpots(rest.length + 1, flank).slice(1).forEach((q, i) => { tg[rest[i]] = { x: toX(side, q.d), y: q.y }; boost[rest[i]] = sp.rush; });
    return;
  }
  defendSpots(field.length, flank).forEach((q, i) => { tg[field[i]] = { x: toX(side, q.d), y: q.y }; boost[field[i]] = sp.rush; });
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
  const shadowRef = useRef<SVGEllipseElement | null>(null);
  const flagRef = useRef<SVGGElement | null>(null);
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
      pos: [[], []], ball: { x: L / 2, y: W / 2 }, poss: 0, carrier: forwardSlot(m, 0), flight: null, beats: [], starts: [], msPM: 1000, beat: 0, clock: 0,
      beatLen: 400, inNet: false, shooter: null, run: null, zone: -1, minute: '', time: 0, bh: 0,
      spd: speedsOf(m, world), body: bodiesOf(m, world), ag: [[], []], eventAt: -1e9, reacts: [], kin: { turn: 0, acc: 0 }, line: [undefined, undefined], back: [-1e9, -1e9], trans: null, runsN: 0, kinds: {}, sp: null, flag: null,
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
      if (PITCH_DEBUG) (window as unknown as { __gafferPitch?: unknown }).__gafferPitch = { a, slots: mm.sides.map((sd) => FORMATIONS[sd.tactics.formation].slots.map((x) => x.pos)), pressing: mm.sides.map((sd) => sd.tactics.pressing) };
      const { msPerMinute: ms, running: go, camera: cam } = cfg.current;
      a.time += dt;
      if (a.minute !== minuteKey(mm)) plan(a, mm, ms, worldRef.current);
      if (go) {
        a.clock += dt;
        while (a.beat < a.beats.length && a.clock >= (a.starts[a.beat] ?? a.beat * a.beatLen)) runBeat(a, mm, a.beats[a.beat++]);
      }
      // Ball: in flight, or at the carrier's feet.
      if (a.flight) {
        const f = a.flight;
        f.t = Math.min(1, f.t + dt / f.dur);
        const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - (-2 * f.t + 2) ** 2 / 2;
        a.ball = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e };
        a.bh = arcHeight(f.h, f.t, f.end);
        if (f.t >= 1) { a.flight = null; if (!f.end) a.bh = 0; f.then(); }
      } else if (a.sp && a.sp.kind !== 'gk' && a.time < a.sp.until) {
        a.ball = { ...a.sp.at }; a.bh = 0; // a dead ball sits on its spot until it's taken
      } else if (a.carrier >= 0 && a.pos[a.poss][a.carrier] && !a.inNet) {
        const p = a.pos[a.poss][a.carrier];
        a.bh = 0;
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
        const ft = fullTactics(mm.sides[side].tactics);
        const tr = a.trans && a.time - a.trans.at < TRANSITION_MS(a.beatLen) ? a.trans : null;
        const boost: number[] = [];
        if (has) {
          // Runs off the ball by role (at most 3 real runs at once), then the break after winning the ball.
          const other = (1 - side) as 0 | 1;
          const theirLine = a.line[other] ? L - a.line[other]!.depth : 80;
          const bd = depthOf(side, a.ball.x);
          const busy = (k: number) => k === a.carrier || (a.run?.side === side && a.run.slot === k) || (a.shooter?.side === side && a.shooter.slot === k);
          let runs = 0;
          a.runsN = 0;
          for (const k of [...ks].sort((p, q) => Math.abs((a.pos[side][p]?.y ?? 0) - a.ball.y) - Math.abs((a.pos[side][q]?.y ?? 0) - a.ball.y))) {
            if (busy(k) || LINE[slots[k].pos] === 'gk') continue;
            const d = depthOf(side, tg[k].x);
            const r = runFor(sps[k]?.ip ?? '', { bd, by: a.ball.y, theirLine, d, y: tg[k].y, wide: wideOf(tg[k].y) });
            if (!r) continue;
            if (r.run) { if (runs >= 3) continue; runs++; a.runsN = runs; boost[k] = 1.25; }
            tg[k] = { x: toX(side, clamp(r.d, 2, 103)), y: clamp(r.y, 2, W - 2) };
          }
          if (tr && tr.lost !== side && ft.counter) for (const k of ks) {
            if (busy(k) || LINE[slots[k].pos] !== 'fwd') continue;
            tg[k] = { x: toX(side, Math.min(depthOf(side, tg[k].x) + 12, 96)), y: tg[k].y }; boost[k] = 1.4;
          }
        }
        let pp: PressPlan = { press: [], cover: -1, trigger: false };
        let blockK = -1; // phase 2: the defender stepping into the shooting lane (reacts at once)
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
          // Phase 2: the defence as a group (ui2/pitch/defend.ts). The line slides across towards the ball, compact.
          const lineKs = ks.filter((k) => line(k) === 'def' && free(k));
          const ys = slideY(lineKs.map((k) => tg[k].y), a.ball.y);
          lineKs.forEach((k, i) => { tg[k] = { x: tg[k].x, y: ys[i] }; });
          // A carrier wide in our third gets a second man.
          const field = ks.filter((k) => LINE[slots[k].pos] !== 'gk' && a.pos[side][k]);
          const nearBall = (xs: number[]) => [...xs].sort((p, q) => dist(a.pos[side][p], a.ball) - dist(a.pos[side][q], a.ball))[0];
          if (wideInThird(a.ball, ownGoal) && pp.press.length === 1) {
            const k2 = nearBall(field.filter((k) => !pp.press.includes(k)));
            if (k2 !== undefined) { pp.press.push(k2); tg[k2] = pressSpot(a.ball, ownGoal, 3); }
          }
          // A carrier in our box: the nearest defender steps into the shooting lane at once.
          if (inBox(a.ball, ownGoal) && a.poss === other && a.carrier >= 0) {
            const spot = blockSpot(a.ball, ownGoal);
            blockK = [...field].sort((p, q) => dist(a.pos[side][p], spot) - dist(a.pos[side][q], spot))[0] ?? -1;
            if (blockK >= 0) tg[blockK] = spot;
          }
          // Marking: every attacker near our goal gets a man, goal-side (zonal by default; the man-marking
          // instruction pairs its target first). Defenders keep the line unless their man is near goal or beyond it.
          const oSlots = FORMATIONS[mm.sides[other].tactics.formation].slots;
          const onBall = a.poss === other ? a.carrier : -1;
          const threats = onPitch(mm, other)
            .filter((j) => oSlots[j].pos !== 'GK' && a.pos[other][j] && j !== onBall && dist(a.pos[other][j], ownGoal) < T.THREAT)
            .map((j) => ({ k: j, p: a.pos[other][j] }))
            .sort((p, q) => dist(p.p, ownGoal) - dist(q.p, ownGoal));
          const markers = ks.filter((k) => free(k) && k !== blockK && !pp.press.includes(k) && (line(k) === 'def' || line(k) === 'mid') && a.pos[side][k]).map((k) => ({ k, p: a.pos[side][k] }));
          const manId = mm.sides[side].tactics.mark;
          const manK = manId ? mm.sides[other].onPitch.indexOf(manId) : -1;
          // A man in front of our line is a midfielder's job; one near goal or beyond the line, a defender's.
          const ahead = (t: { p: Pt }) => dist(t.p, ownGoal) >= 22 && depthOf(side, t.p.x) > ln.depth + 3;
          const marks = assignMarks(markers, threats, manK >= 0 ? { threat: manK, prefer: markers.map((x) => x.k) } : undefined,
            (m, t) => dist(m.p, t.p) + (ahead(t) ? (line(m.k) === 'def' ? T.MARK_ROLE : 0) : line(m.k) === 'mid' ? T.MARK_ROLE : 0));
          if (PITCH_DEBUG) (a as unknown as { mk?: number[] }).mk = [threats.length, marks.size, markers.length];
          for (const [mk, tk] of marks) {
            const t = a.pos[other][tk];
            const spot = markSpot(t, ownGoal, a.ball);
            // A defender keeps the line (and only shadows his man across) unless his man is near goal or beyond it.
            if (line(mk) === 'def' && dist(t, ownGoal) >= 22 && depthOf(side, t.x) >= ln.depth - 2) tg[mk] = { x: tg[mk].x, y: tg[mk].y * 0.4 + t.y * 0.6 };
            else tg[mk] = spot;
          }
          // The keeper: on the shooting angle.
          const gk = ks.find((k) => LINE[slots[k].pos] === 'gk');
          if (gk !== undefined) { tg[gk] = keeperSpot(a.ball, ownGoal); boost[gk] = T.GK_SHUFFLE; }
          if (PITCH_DEBUG && gk !== undefined) (a as unknown as { gkT?: unknown }).gkT = { ...tg[gk] }; // short quick steps across his goal
          // Just lost it: counter-press with the nearest three, or everyone ahead of the ball races back.
          if (tr && tr.lost === side) {
            const field = ks.filter((k) => LINE[slots[k].pos] !== 'gk' && a.pos[side][k]);
            if (ft.cpress === 2 || (ft.cpress !== 0 && ft.pressing === 2)) {
              for (const k of [...field].sort((p, q) => Math.hypot(a.pos[side][p].x - a.ball.x, a.pos[side][p].y - a.ball.y) - Math.hypot(a.pos[side][q].x - a.ball.x, a.pos[side][q].y - a.ball.y)).slice(0, 3)) {
                tg[k] = { ...a.ball }; boost[k] = 1.6;
              }
            } else {
              const bdep = depthOf(side, a.ball.x);
              // The back line drops as one (to 5 m behind the ball at most); the others ahead of the ball race back.
              const lineTo = Math.min(ln.depth, bdep - 5);
              for (const k of field) {
                if (line(k) === 'def' && free(k)) { tg[k] = { x: toX(side, lineTo), y: tg[k].y }; if (depthOf(side, a.pos[side][k].x) > lineTo) boost[k] = 1.4; }
                else if (depthOf(side, a.pos[side][k].x) > bdep) { tg[k] = { x: toX(side, Math.min(depthOf(side, tg[k].x), bdep - 5)), y: tg[k].y }; boost[k] = 1.4; }
                // Everyone stays tied to the dropped line: midfield within 16 m of it, forwards within 38 m.
                if (free(k) && line(k) !== 'def') tg[k] = { x: toX(side, Math.min(depthOf(side, tg[k].x), lineTo + (line(k) === 'mid' ? 16 : 38))), y: tg[k].y };
              }
            }
          }
        } else a.line[side] = undefined;
        // A set piece being staged: everyone takes his spot (ui2/pitch/setpieces.ts).
        if (a.sp && a.time < a.sp.until) stage(a, mm, side, ks, tg, boost);
        // Phase 1: each player moves with his own body (top speed, acceleration, turning), re-reads the play every
        // decision tick, reacts to a new ball after his own reaction time, and sprints only while his tank lasts.
        const staging = !!a.sp && a.time < a.sp.until;
        const tau = Math.max(120, ms * 0.9);
        // The back line moves as one: out of possession its defenders react on their best reader's call.
        const isDef = (k: number) => !has && LINE[sps[k]?.opos ?? slots[k].pos] === 'def' && !pp.press.includes(k) && k !== pp.cover;
        const lineReads = Math.max(0, ...ks.filter(isDef).map((k) => a.body[side]?.[k]?.reads ?? 0.5));
        // ... and holds its shape at its slowest defender's pace, so it doesn't break up while it steps or drops.
        const lineBodies = ks.filter(isDef).map((k) => a.body[side]?.[k]).filter(Boolean) as Body[];
        const lineTop = Math.min(...lineBodies.map((b) => b.top), 9), lineAcc = Math.min(...lineBodies.map((b) => b.acc), 9);
        for (const k of ks) {
          let t = tg[k];
          if (has && k === a.carrier && !staging) t = { x: t.x * 0.3 + a.pos[side][k].x * 0.7 + (side === 0 ? 0.4 : -0.4), y: t.y * 0.3 + a.pos[side][k].y * 0.7 };
          // A little life in everyone's feet, except a keeper set on the shooting angle (he stays on it).
          const wob = !has && LINE[slots[k].pos] === 'gk' ? 0 : Math.sin(a.time / 700 + k * 1.7 + side * 3) * 0.5;
          const p = a.pos[side][k] ?? t;
          const B0 = a.body[side]?.[k] ?? { top: 1, acc: 1, turn: 1, reads: 0.5, tank: 0.7 };
          // In the line: the line's pace. Walking to a set piece: no turning limit (he's not running at speed).
          // The keeper side-steps across his goal (no running turn limit, quick feet).
          const B = staging || (!has && LINE[slots[k].pos] === 'gk') ? { ...B0, turn: B0.turn * 4, acc: B0.acc * 1.5 } : isDef(k) ? { ...B0, top: Math.min(B0.top, lineTop), acc: Math.min(B0.acc, lineAcc) } : B0;
          const g = a.ag[side][k] ??= { vx: 0, vy: 0, tx: t.x, ty: t.y + wob, at: 0, tank: 1, pend: false, spr: false };
          // On the ball, about to receive or shoot, or walking to a set piece: no delay. Everyone else commits to
          // a new target at his decision ticks, and after a new ball only once he has reacted.
          // The keeper never takes his eyes off the ball: he follows it without a reaction delay.
          const onIt = (has && k === a.carrier) || (!has && (k === blockK || LINE[slots[k].pos] === 'gk')) || (a.run?.side === side && a.run.slot === k) || (a.shooter?.side === side && a.shooter.slot === k);
          if (onIt || staging) { g.tx = t.x; g.ty = t.y + wob; g.pend = false; }
          else if (a.time >= g.at) {
            const since = a.time - a.eventAt;
            if (!g.pend || since >= reactMs(isDef(k) ? lineReads : B.reads, a.beatLen)) {
              if (g.pend && !isDef(k)) { a.reacts.push([B.reads, since]); if (a.reacts.length > 400) a.reacts.shift(); g.pend = false; }
              g.pend = false;
              g.tx = t.x; g.ty = t.y + wob;
              // The line looks again together (same tick for all its defenders).
              g.at = isDef(k) ? a.time + decideMs(a.beatLen) - ((a.time + side * 37) % decideMs(a.beatLen)) : a.time + decideMs(a.beatLen);
            }
          }
          let sprint = Math.max(pp.press.includes(k) ? (pp.trigger ? 1.6 : 1.3) : 1, boost[k] ?? 1);
          // The sprint tank: an empty tank caps the boost; sprinting drains it (faster for a small tank), jogging refills.
          const keeperOut = !has && LINE[slots[k].pos] === 'gk'; // the keeper's side-steps aren't sprints
          if (!staging && !keeperOut && g.tank < T.EMPTY) sprint = Math.min(sprint, T.SPRINT);
          const vx0 = g.vx, vy0 = g.vy;
          const nk = move({ x: p.x, y: p.y, vx: g.vx, vy: g.vy }, g.tx, g.ty, dt, tau, B, sprint);
          // The line's depth is one decision for all its defenders (PR A): it moves together at the line's pace, and
          // only their sideways movement is left to each body.
          if (isDef(k) && !staging) { nk.x = p.x + (g.tx - p.x) * (1 - Math.exp((-dt * lineTop * sprint) / tau)); nk.vx = (nk.x - p.x) / Math.max(1, dt); }
          g.vx = nk.vx; g.vy = nk.vy;
          a.pos[side][k] = { x: nk.x, y: nk.y };
          const vmax = (T.VMAX * B.top * sprint) / tau, sp1 = Math.hypot(nk.vx, nk.vy);
          g.spr = !staging && !keeperOut && sprint > T.SPRINT && sp1 > 0.6 * vmax;
          g.tank = g.spr ? Math.max(0, g.tank - (T.DRAIN * dt) / ms / B.tank) : Math.min(1, g.tank + (T.REFILL * dt) / ms);
          // Measurement (ui-tests/pitch.mjs): how close to his turning and acceleration limits he came.
          if (PITCH_DEBUG && dt > 0 && !(isDef(k) && !staging)) { // (the line's depth is shared, measured by the line test)
            const sp0 = Math.hypot(vx0, vy0);
            a.kin.acc = Math.max(a.kin.acc, Math.hypot(nk.vx - vx0, nk.vy - vy0) / ((vmax / (T.ACC_TAU * tau)) * B.acc * dt));
            if (sp0 > T.TURN_SPEED * vmax && sp1 > 1e-9) {
              let da = Math.atan2(nk.vy, nk.vx) - Math.atan2(vy0, vx0);
              while (da > Math.PI) da -= 2 * Math.PI;
              while (da < -Math.PI) da += 2 * Math.PI;
              a.kin.turn = Math.max(a.kin.turn, Math.abs(da) / ((T.TURN * B.turn * dt) / tau));
            }
          }
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
      // The ball rises off its shadow when it's in the air (lofted passes, crosses, shots over the bar).
      const [bx, by, bs] = pr(fx(a.ball.x), a.ball.y);
      shadowRef.current?.setAttribute('transform', `translate(${bx.toFixed(2)} ${by.toFixed(2)}) scale(${bs.toFixed(3)})`);
      shadowRef.current?.setAttribute('opacity', a.bh > 0.2 ? '.35' : '0');
      ballRef.current?.setAttribute('transform', `translate(${bx.toFixed(2)} ${(by - a.bh * 0.55 * bs).toFixed(2)}) scale(${(bs * (1 + a.bh * 0.05)).toFixed(3)})`);
      if (ballRef.current && layer.current && cam) { if (shadowRef.current) layer.current.appendChild(shadowRef.current); layer.current.appendChild(ballRef.current); }
      netRef.current?.setAttribute('opacity', a.inNet ? '1' : '0');
      if (flagRef.current) {
        const up = !!a.flag && a.time < a.flag.until;
        flagRef.current.setAttribute('opacity', up ? '1' : '0');
        if (up) { const [fx0, fy0, fs] = pr(fx(a.flag!.x), W - 0.3); flagRef.current.setAttribute('transform', `translate(${fx0.toFixed(2)} ${fy0.toFixed(2)}) scale(${fs.toFixed(3)})`); }
      }
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
        <ellipse ref={shadowRef} rx="1.1" ry=".6" fill="#000" opacity="0" />
        <g ref={ballRef}><circle r="1.05" fill="#fff" stroke="#111" strokeWidth=".3" /></g>
      </g>
      <g ref={flagRef} className="g-flag" opacity="0"><path d="M0 0V-4.2" stroke="#222" strokeWidth=".35" /><path d="M0 -4.2h2.6l-.5 1 .5 1H0z" fill="#ffd400" stroke="#7a6400" strokeWidth=".15" /></g>
      <text ref={netRef} className="g-goal" x={L / 2} y={vh / 2 + 4} textAnchor="middle" opacity="0">{goalWord}</text>
    </svg>
  );
}
