// The live pitch's simulation (plan "محرك ماتش FM26", foundation step 1): everything that moves the players and the
// ball, taken out of the React component so it runs anywhere with a virtual clock (the browser's animation frames, or
// a Node test playing whole matches in seconds). Pitch2D.tsx only draws what this computes. Presentation only: nothing
// here decides anything (the score and stats come from the engine's event log).
import type { LiveMatch, MatchEvent } from '../../sim/match';
import { rngFor } from '../../sim/match';
import { FORMATIONS, fullTactics } from '../../sim/tactics';
import { planOf, spotOf, type Spot } from '../../sim/engine/phases';
import type { Position } from '../../model/types';
import type { World } from '../../sim/world';
import { T } from './tuning';
import { bodiesOf, decideMs, move, reactMs, type Body } from './body';
import { assignMarks, blockSpot, inBox, keeperSpot, markSpot, slideY, wideInThird } from './defend';
import { attackSpots, defendSpots, rushFor, wallSize, wallSpots, type SetPiece } from './setpieces';
import { ARC, L, THROUGH_LEAD, TRANSITION_MS, W, arcHeight, buildUp, deliveryOf, lineDepth, passKind, pressShape, pressSpot, runFor, shooterSpot, shotTarget, speedsOf, wideOf, type LineState, type PassKind, type PressPlan, type Pt, type Transition } from './move';

// Measurement hook (ui-tests): set by the page with ?pitchdebug, or by a Node test.
let PITCH_DEBUG = false;
export const setPitchDebug = (on: boolean) => { PITCH_DEBUG = on; };

type Beat =
  | { kind: 'pass'; side: 0 | 1; to: number; pt?: Pt; z?: number; type?: PassKind }
  | { kind: 'turnover'; side: 0 | 1; to?: number; pt?: Pt; z?: number }
  | { kind: 'shot'; side: 0 | 1; shooter: number; result: 'goal' | 'save' | 'miss' | 'block'; z?: number; how?: string }
  | { kind: 'kickoff'; side: 0 | 1 }
  | { kind: 'corner'; side: 0 | 1; taker?: number }
  | { kind: 'offside'; side: 0 | 1 }
  | { kind: 'foul'; side: 0 | 1; to: number; pt: Pt }
  | { kind: 'out'; side: 0 | 1; how: 'ti' | 'gk'; pt: Pt } // the ball went out of play: `side` restarts (engine flow ti / gk)
  | { kind: 'hold' };

export interface Anim {
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
  hurt: { side: 0 | 1; slot: number; until: number } | null; // a player down injured (foundation step 4): he stays down, the medic's cross shows
  hurtAt: { side: 0 | 1; slot: number; at: number }[]; // this minute's injuries, when they happen (ms into the minute)
  ids: string[][];        // who was in each slot when the minute was planned (an injured man's slot after he's gone)
}

interface Agent { vx: number; vy: number; tx: number; ty: number; at: number; tank: number; pend: boolean; spr: boolean }
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
    // Phase 3: full-backs and wing-backs push on with the ball, wide, so they can overlap the winger.
    const push = T.FB_PUSH[sp.ip];
    if (push) { d += clamp((ballDepth - 40) * push, 0, T.FB_MAX); y += ((y < W / 2 ? 4 : W - 4) - y) * clamp((ballDepth - 40) / 40, 0, 0.7); }
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
    if (f.k === 'ti' || f.k === 'gk') {
      const prev = all[all.length - 1];
      if (f.k === 'gk' && prev?.kind === 'shot' && prev.result === 'miss') continue; // the missed shot already stages its goal kick
      all.push({ kind: 'out', side: f.s, how: f.k, pt }); poss = f.s;
      continue;
    }
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
    if (b.kind === 'kickoff' || b.kind === 'corner' || b.kind === 'foul' || b.kind === 'out') has = b.side;
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
  // Injuries this minute: hurt in a tackle goes down at that foul's whistle, otherwise he pulls up mid-minute. The
  // engine has already made the change: the slot is his replacement's now, or empty when no sub was left (he is shown
  // until he's helped off).
  a.hurtAt = [];
  for (const e of m.events) {
    if (e.kind !== 'injury' || !live(e)) continue;
    const slot = a.ids[e.side]?.indexOf(e.playerId) ?? -1;
    if (slot < 0 || !a.pos[e.side][slot]) continue;
    const fi = e.how === 'foul' ? beats.findIndex((b) => b.kind === 'foul' && b.side === e.side) : -1;
    a.hurtAt.push({ side: e.side, slot, at: fi >= 0 ? a.starts[fi] : msPerMinute * 0.5 });
  }
  a.ids = [[...m.sides[0].onPitch], [...m.sides[1].onPitch]];
  a.minute = minuteKey(m);
}
const weightOf = (b: Beat) => (b.kind === 'corner' ? 4 : b.kind === 'foul' ? (wallSize(depthOf(b.side, b.pt.x)) ? 4 : 1.5) : b.kind === 'offside' || b.kind === 'out' ? 1.5 : 1);
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
  if (b.kind === 'out') {
    // Out of play: the ball runs over the line, then the restart. A throw-in is taken where it went out by the nearest
    // outfield man; a goal kick by the keeper from the six-yard box.
    a.run = null; a.carrier = -1; a.zone = -1; a.shooter = null;
    const dur = a.beatLen * weightOf(b), top = b.pt.y < W / 2;
    if (b.how === 'ti') {
      const at = { x: clamp(b.pt.x, 4, L - 4), y: top ? 0.3 : W - 0.3 };
      const slots = FORMATIONS[m.sides[b.side].tactics.formation].slots;
      const k = onPitch(m, b.side).filter((j) => slots[j].pos !== 'GK' && a.pos[b.side][j]).sort((p, q) => dist(a.pos[b.side][p], at) - dist(a.pos[b.side][q], at))[0];
      if (k === undefined) return;
      a.sp = { kind: 'ti', side: b.side, at, until: a.time + dur, taker: k, rush: rushFor(a.msPM, dur) };
      a.kinds.throwin = (a.kinds.throwin ?? 0) + 1;
      fly(a, { x: at.x, y: top ? -1.5 : W + 1.5 }, travel * 0.5, () => { a.poss = b.side; a.carrier = k; });
    } else {
      const gk = gkSlot(m, b.side);
      a.sp = { kind: 'gk', side: b.side, at: { x: toX(b.side, 5.5), y: W / 2 + (top ? -9 : 9) }, until: a.time + dur, taker: gk, rush: 1 };
      a.kinds.goalkick = (a.kinds.goalkick ?? 0) + 1;
      fly(a, { x: toX(b.side, -1.5), y: clamp(b.pt.y, 10, W - 10) }, travel * 0.6, () => { a.poss = b.side; a.carrier = gk; });
    }
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
  if (sp.kind === 'gk' || sp.kind === 'ti') { if (side === sp.side && sp.taker >= 0) { tg[sp.taker] = sp.at; boost[sp.taker] = Math.max(boost[sp.taker] ?? 1, sp.rush); } return; }
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
    setMarks(a, m, side, field.filter((k) => !near.includes(k)), tg, boost, flank, 1);
    return;
  }
  setMarks(a, m, side, field, tg, boost, flank, 0);
}
// Defending a corner or a free kick: the set-piece marking instruction (step 5). The first men (best in the air) hold
// zones (zonal all of them, mixed three, man none); the rest each take an attacker in the box, goal-side, nearest goal first.
function setMarks(a: Anim, m: LiveMatch, side: 0 | 1, field: number[], tg: Pt[], boost: number[], flank: -1 | 1, skip: number) {
  const sp = a.sp!, att = (1 - side) as 0 | 1, ownGoal = { x: toX(side, 0), y: W / 2 };
  const nz = Math.min(field.length, T.SET_ZONAL[fullTactics(m.sides[side].tactics).setMark]);
  const zones = defendSpots(nz + skip, flank).slice(skip);
  field.slice(0, nz).forEach((k, i) => { tg[k] = { x: toX(side, zones[i].d), y: zones[i].y }; boost[k] = sp.rush; });
  const men = onPitch(m, att).filter((j) => j !== sp.taker && a.pos[att][j] && dist(a.pos[att][j], ownGoal) < 30)
    .sort((p, q) => dist(a.pos[att][p], ownGoal) - dist(a.pos[att][q], ownGoal));
  const rest = field.slice(nz);
  rest.forEach((k, i) => {
    const t = men[i] !== undefined ? a.pos[att][men[i]] : null;
    const q = t ? markSpot(t, ownGoal, sp.at) : (() => { const z = defendSpots(nz + skip + i + 1, flank)[nz + skip + i]; return { x: toX(side, z.d), y: z.y }; })();
    tg[k] = q; boost[k] = sp.rush;
  });
}

// A match's pitch at kick-off: everyone in position, the home side on the ball.
// The injured man in a slot left empty (no subs left) is drawn until he's helped off: from the start of the minute
// until his time down is over.
export const downIn = (a: Anim, side: 0 | 1, k: number) => (!!a.hurt && a.time < a.hurt.until && a.hurt.side === side && a.hurt.slot === k) || a.hurtAt.some((x) => x.side === side && x.slot === k);
export function newAnim(m: LiveMatch, world: World): Anim {
    const a: Anim = {
      pos: [[], []], ball: { x: L / 2, y: W / 2 }, poss: 0, carrier: forwardSlot(m, 0), flight: null, beats: [], starts: [], msPM: 1000, beat: 0, clock: 0,
      beatLen: 400, inNet: false, shooter: null, run: null, zone: -1, minute: '', time: 0, bh: 0,
      spd: speedsOf(m, world), body: bodiesOf(m, world), ag: [[], []], eventAt: -1e9, reacts: [], kin: { turn: 0, acc: 0 }, line: [undefined, undefined], back: [-1e9, -1e9], trans: null, runsN: 0, kinds: {}, sp: null, flag: null, hurt: null, hurtAt: [], ids: [[...m.sides[0].onPitch], [...m.sides[1].onPitch]],
    };
    for (const side of [0, 1] as const) {
      const slots = FORMATIONS[m.sides[side].tactics.formation].slots;
      a.pos[side] = slots.map((_, k) => target(m, a, side, k));
    }
  return a;
}

// One frame: `dt` ms of display time; `ms` = real ms per match minute (the speed setting); `go` = the match is running.
export function tick(a: Anim, mm: LiveMatch, world: World, dt: number, ms: number, go: boolean) {
      if (PITCH_DEBUG) (a as unknown as { go?: boolean }).go = go; // the test skips a paused or finished match
      a.time += dt;
      if (a.minute !== minuteKey(mm)) plan(a, mm, ms, world);
      if (go) {
        a.clock += dt;
        while (a.beat < a.beats.length && a.clock >= (a.starts[a.beat] ?? a.beat * a.beatLen)) runBeat(a, mm, a.beats[a.beat++]);
        const h = a.hurtAt.findIndex((x) => a.clock >= x.at);
        if (h >= 0) {
          const x = a.hurtAt.splice(h, 1)[0];
          a.hurt = { side: x.side, slot: x.slot, until: a.time + Math.max(1500, a.beatLen * 2.5) };
          a.kinds.injury = (a.kinds.injury ?? 0) + 1;
          if (a.poss === x.side && a.carrier === x.slot && !a.flight) a.carrier = -1; // the ball runs loose
        }
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
            if (PITCH_DEBUG) ((a as unknown as { rd?: unknown[] }).rd ??= []).push([side, k, sps[k]?.ip, Math.round(d), Math.round(r.d), r.run, runs]);
            if (r.run) { if (runs >= 3) continue; runs++; a.runsN = runs; boost[k] = 1.25; }
            tg[k] = { x: toX(side, clamp(r.d, 2, 103)), y: clamp(r.y, 2, W - 2) };
          }
          // The carrier's pace: he drives on into space and slows, shielding it, when a man is on him.
          if (a.carrier >= 0 && a.pos[side][a.carrier]) {
            const cp = a.pos[side][a.carrier];
            const dn = Math.min(99, ...onPitch(mm, other).map((j) => (a.pos[other][j] ? dist(a.pos[other][j], cp) : 99)));
            boost[a.carrier] = dn < T.CARRY_SPACE[0] ? T.CARRY_BOOST[0] : dn > T.CARRY_SPACE[1] ? T.CARRY_BOOST[2] : T.CARRY_BOOST[1];
            // He carries it towards where the engine has the play, a short step when pressed, a long one into space.
            const to = tg[a.carrier], gap = dist(to, cp);
            const step = dn < T.CARRY_SPACE[0] ? T.CARRY_STEP[0] : dn > T.CARRY_SPACE[1] ? T.CARRY_STEP[2] : T.CARRY_STEP[1];
            const fwd = { x: (side === 0 ? 1 : -1) * 0.5, y: 0 }; // nowhere to go: straight on
            const ux = gap > 0.5 ? (to.x - cp.x) / gap : fwd.x * 2, uy = gap > 0.5 ? (to.y - cp.y) / gap : 0;
            tg[a.carrier] = { x: clamp(cp.x + ux * step, 1, L - 1), y: clamp(cp.y + uy * step, 1, W - 1) };
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
          // Marking: every attacker near our goal gets a man, goal-side; the man-marking instruction pairs its target
          // first. Defenders keep the line unless their man is near goal or beyond it. The marking style (step 5):
          // zonal takes only men who come into a player's area and the line holds until the box; man-marking reaches
          // further, from further out, and a defender follows his man wherever he goes.
          const oSlots = FORMATIONS[mm.sides[other].tactics.formation].slots;
          const onBall = a.poss === other ? a.carrier : -1;
          const threats = onPitch(mm, other)
            .filter((j) => oSlots[j].pos !== 'GK' && a.pos[other][j] && j !== onBall && dist(a.pos[other][j], ownGoal) < T.THREAT * T.THREAT_K[ft.marking])
            .map((j) => ({ k: j, p: a.pos[other][j] }))
            .sort((p, q) => dist(p.p, ownGoal) - dist(q.p, ownGoal));
          const markers = ks.filter((k) => free(k) && k !== blockK && !pp.press.includes(k) && (line(k) === 'def' || line(k) === 'mid') && a.pos[side][k]).map((k) => ({ k, p: a.pos[side][k] }));
          const manId = mm.sides[side].tactics.mark;
          const manK = manId ? mm.sides[other].onPitch.indexOf(manId) : -1;
          // A man in front of our line is a midfielder's job; one near goal or beyond the line, a defender's.
          const ahead = (t: { p: Pt }) => dist(t.p, ownGoal) >= 22 && depthOf(side, t.p.x) > ln.depth + 3;
          // Zonal: the cost is from where the player should stand (his zone), not where he is.
          const home = (m: { k: number; p: Pt }) => (ft.marking === 0 ? tg[m.k] ?? m.p : m.p);
          const marks = assignMarks(markers, threats, manK >= 0 ? { threat: manK, prefer: markers.map((x) => x.k) } : undefined,
            (m, t) => dist(home(m), t.p) + (ahead(t) ? (line(m.k) === 'def' ? T.MARK_ROLE : 0) : line(m.k) === 'mid' ? T.MARK_ROLE : 0), T.MARK_REACH * T.MARK_REACH_K[ft.marking]);
          if (PITCH_DEBUG) (a as unknown as { mk?: number[] }).mk = [threats.length, marks.size, markers.length];
          for (const [mk, tk] of marks) {
            const t = a.pos[other][tk];
            const spot = markSpot(t, ownGoal, a.ball);
            // A defender keeps the line (and only shadows his man across) unless his man is near goal or beyond it.
            const holds = ft.marking === 0 ? dist(t, ownGoal) >= T.ZONE_BOX : ft.marking === 1 && dist(t, ownGoal) >= 22 && depthOf(side, t.x) >= ln.depth - 2;
            if (line(mk) === 'def' && holds) tg[mk] = { x: tg[mk].x, y: tg[mk].y * 0.4 + t.y * 0.6 };
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
        const down = (k: number) => !!a.hurt && a.time < a.hurt.until && a.hurt.side === side && a.hurt.slot === k; // injured: stays where he fell
        const isDef = (k: number) => !has && LINE[sps[k]?.opos ?? slots[k].pos] === 'def' && !pp.press.includes(k) && k !== pp.cover && !down(k);
        const lineReads = Math.max(0, ...ks.filter(isDef).map((k) => a.body[side]?.[k]?.reads ?? 0.5));
        // ... and holds its shape at its slowest defender's pace, so it doesn't break up while it steps or drops.
        const lineBodies = ks.filter(isDef).map((k) => a.body[side]?.[k]).filter(Boolean) as Body[];
        const lineTop = Math.min(...lineBodies.map((b) => b.top), 9), lineAcc = Math.min(...lineBodies.map((b) => b.acc), 9);
        for (const k of ks) {
          let t = tg[k];
          if (down(k)) t = a.pos[side][k] ?? t;
          else if (has && k === a.carrier && !staging) t = { x: t.x * 0.3 + a.pos[side][k].x * 0.7 + (side === 0 ? 0.4 : -0.4), y: t.y * 0.3 + a.pos[side][k].y * 0.7 };
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
          if (down(k)) { g.tx = t.x; g.ty = t.y; g.pend = false; }
          else if (onIt || staging) { g.tx = t.x; g.ty = t.y + wob; g.pend = false; }
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
          // (a boost under 1 slows him: a carrier shielding the ball under pressure)
          let sprint = (boost[k] ?? 1) < 1 ? boost[k] : Math.max(pp.press.includes(k) ? (pp.trigger ? 1.6 : 1.3) : 1, boost[k] ?? 1);
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
}
