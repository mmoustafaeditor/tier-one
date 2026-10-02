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
import { timeBeats, upcoming, type Timed } from './director';
import { shownOf, squeeze, type HlMode } from '../../sim/highlights';
import { bodiesOf, decideMs, move, reactMs, type Body } from './body';
import { assignMarks, blockSpot, inBox, keeperSpot, markSpot, slideY, wideInThird } from './defend';
import { attackSpots, defendSpots, rushFor, wallSize, wallSpots, type SetPiece } from './setpieces';
import { moveOfficials, newOfficials, officialTargets, type Officials } from './officials';
import { ARC, L, THROUGH_LEAD, TRANSITION_MS, W, arcHeight, buildUp, deliveryOf, lineDepth, passKind, pressShape, pressSpot, runFor, shooterSpot, shotTarget, speedsOf, wideOf, type LineState, type PassKind, type PressPlan, type Pt, type Transition } from './move';

// Measurement hook (ui-tests): set by the page with ?pitchdebug, or by a Node test.
let PITCH_DEBUG = false;
export const setPitchDebug = (on: boolean) => { PITCH_DEBUG = on; };

type Beat = Timed & (
  | { kind: 'pass'; side: 0 | 1; to: number; pt?: Pt; z?: number; type?: PassKind; from?: number } // from: the engine's passer
  | { kind: 'turnover'; side: 0 | 1; to?: number; pt?: Pt; z?: number; vs?: number } // vs: the man he takes it off (a tackle)
  | { kind: 'duel'; side: 0 | 1; who: number; vs?: number; won: boolean; z?: number } // a contest on the ball: `side` keeps it (won: he goes past his man; else forced back)
  | { kind: 'shot'; side: 0 | 1; shooter: number; result: 'goal' | 'save' | 'miss' | 'block'; z?: number; how?: string }
  | { kind: 'kickoff'; side: 0 | 1 }
  | { kind: 'corner'; side: 0 | 1; taker?: number; by?: number } // by: the defender (or keeper) who put it behind
  | { kind: 'offside'; side: 0 | 1 }
  | { kind: 'foul'; side: 0 | 1; to: number; pt: Pt; pen?: boolean; by?: number } // pen: given as a penalty (no wall, the kick is staged next); by: the man who fouled (the other side)
  | { kind: 'pen'; side: 0 | 1; taker: number }                       // a penalty: everyone out of the box, the taker at the spot
  | { kind: 'out'; side: 0 | 1; how: 'ti' | 'gk'; pt: Pt; last?: number } // the ball went out of play: `side` restarts (engine flow ti / gk); last: who put it out (the other side)
  | { kind: 'hold' });

export interface Anim {
  pos: Pt[][];            // [side][slot]
  ball: Pt;
  poss: 0 | 1;
  carrier: number;        // slot of the ball carrier in the possessing side (-1 = loose)
  flight: { from: Pt; to: Pt; t: number; dur: number; then: () => void; h: number; end: number; recv?: [0 | 1, number] } | null; // recv: aimed at this man (it bends to meet him)
  bh: number;             // the ball's height in metres (lofted passes, crosses, shots over the bar)
  beats: Beat[];
  beat: number;
  clock: number;
  beatLen: number;        // one ordinary beat (ms); a set piece takes a few (WEIGHT), within the same minute
  starts: number[];       // when each beat starts (ms into the minute)
  msPM: number;           // real ms per match minute (the speed setting) when the minute was planned
  secMs?: number;         // screen ms per second of play in this minute (a highlight: its passage at its own pace)
  lastPass?: { side: 0 | 1; to: number; at: number; type?: string; eng?: boolean }; // the last pass played (for the measurement tests)
  prev?: { all: Beat[]; sec: number[] }; // the minute before: its beats and their engine seconds (a move that carries over)
  prevTo?: number;        // where the minute before's highlight ended (-1: it had none)
  off: Officials;         // the referee, his assistants and an on-field review (ui2/pitch/officials.ts)
  downs: { side: 0 | 1; slot: number; until: number }[]; // men brought down by a foul (on the ground for a moment)
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
  snap?: boolean;         // highlights: a minute not shown — everyone goes straight to his place (the picture cuts)
  ids: string[][];        // who was in each slot when the minute was planned (an injured man's slot after he's gone)
  seen: Pt[][];           // where each player is seen by the men marking him: his position a moment ago (T.MARK_LAG)
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
// A ball's speed by kind of pass (m/s): a driven ground pass, a long ball, a cross, a ball in behind, a cutback.
const SPEED: Record<PassKind, number> = { short: 15, long: 21, cross: 19, through: 15, cutback: 16 };
const zoneCentre = (z: number): Pt => ({ x: (Math.floor(z / 5) + 0.5) * (L / 6), y: 3 + ((z % 5) * 20 + 10) * 0.62 });
const zonePt = (z: number, r: () => number): Pt => ({ x: (Math.floor(z / 5) + 0.25 + r() * 0.5) * (L / 6), y: 3 + ((z % 5) * 20 + 4 + r() * 12) * 0.62 });
const slotNear = (m: LiveMatch, a: Anim, side: 0 | 1, pt: Pt) => onPitch(m, side).sort((x, y) => dist(a.pos[side][x] ?? pt, pt) - dist(a.pos[side][y] ?? pt, pt))[0] ?? 0;

// Plan the minute from the engine's ball path: contests won and lost, fouls, shots. Slow speeds show more of it.
function plan(a: Anim, m: LiveMatch, msPerMinute: number, world: World, mode?: HlMode) {
  const r = rngFor(`${m.key}:anim`, m.minute);
  a.spd = speedsOf(m, world);
  a.body = bodiesOf(m, world);
  const all: Beat[] = [];
  let poss = a.poss;
  if (a.inNet) { const side = (1 - a.poss) as 0 | 1; all.push({ kind: 'kickoff', side }); poss = side; }
  // Since the engine records its passes (engine/passes.ts), the ball goes from man to man as it says; older paths
  // (a saved match from before) are still played the old way.
  const passes = (m.flow ?? []).some((f) => f.k === 'p');
  const slotIn = (id: string | undefined, side: 0 | 1) => { const x = id ? slotOf(m, id) : null; return x && x.side === side ? x.slot : undefined; };
  for (const f of m.flow ?? []) {
    const at = f.t;
    if (passes && f.k === 'p') {
      const from = slotIn(f.p, f.s), to = slotIn(f.q, f.s);
      if (to === undefined) continue;
      const type: PassKind | undefined = f.ty === 'l' ? 'long' : f.ty === 'x' ? 'cross' : f.ty === 't' ? 'through' : f.ty === 'c' ? 'cutback' : undefined;
      if (f.s !== poss) { all.push({ kind: 'turnover', side: f.s, to, at }); poss = f.s; } // (a restart the path didn't show)
      all.push({ kind: 'pass', side: f.s, to, from, type, at });
      continue;
    }
    if (passes && (f.k === 'w' || f.k === 'r' || f.k === 'l')) {
      const other = (1 - f.s) as 0 | 1;
      const who = slotIn(f.p, f.s);
      if (who === undefined) continue;
      if (f.k === 'l') { all.push({ kind: 'turnover', side: f.s, to: who, vs: slotIn(f.q, other), z: f.z, at }); poss = f.s; continue; }
      all.push({ kind: 'duel', side: f.s, who, vs: slotIn(f.q, other), won: f.k === 'w', z: f.z, at });
      continue;
    }
    const pt = zonePt(f.z, r);
    const found = f.p ? slotOf(m, f.p) : null;
    const slot = found && found.side === f.s ? found.slot : slotNear(m, a, f.s, pt);
    if (f.k === 'f') { all.push({ kind: 'foul', side: f.s, to: slot, pt, at, by: slotIn(f.q, (1 - f.s) as 0 | 1) }); poss = f.s; continue; }
    // Corners and offsides come in the engine's flow (since phase 4), at their own moment.
    if (f.k === 'c') { all.push({ kind: 'corner', side: f.s, taker: found && found.side === f.s ? found.slot : undefined, by: slotIn(f.q, (1 - f.s) as 0 | 1), at }); poss = f.s; continue; }
    if (f.k === 'o') { all.push({ kind: 'offside', side: f.s, at }); poss = (1 - f.s) as 0 | 1; continue; }
    if (f.k === 'ti' || f.k === 'gk') {
      const prev = all[all.length - 1];
      if (f.k === 'gk' && prev?.kind === 'shot' && prev.result === 'miss') continue; // the missed shot already stages its goal kick
      all.push({ kind: 'out', side: f.s, how: f.k, pt, at, last: slotIn(f.p, (1 - f.s) as 0 | 1) }); poss = f.s;
      continue;
    }
    if (f.k === 'w' || f.k === 'l') {
      if (f.s !== poss) { all.push({ kind: 'turnover', side: f.s, to: slot, pt, z: f.z, at }); poss = f.s; }
      else all.push({ kind: 'pass', side: f.s, to: slot, pt, z: f.z, at });
      continue;
    }
    // A shot: the ball to the shooter (the engine's own pass, when it records them), then the shot.
    if (passes) { all.push({ kind: 'shot', side: f.s, shooter: slot, result: f.k === 'g' ? 'goal' : f.k === 'v' ? 'save' : f.k === 'b' ? 'block' : 'miss', z: f.z, at }); poss = (1 - f.s) as 0 | 1; continue; }
    if (f.s !== poss) { all.push({ kind: 'turnover', side: f.s, to: slot, pt, z: f.z, at: at === undefined ? undefined : at - 2 }); poss = f.s; }
    else all.push({ kind: 'pass', side: f.s, to: slot, pt, z: f.z, at: at === undefined ? undefined : at - 2 });
    all.push({ kind: 'shot', side: f.s, shooter: slot, result: f.k === 'g' ? 'goal' : f.k === 'v' ? 'save' : f.k === 'b' ? 'block' : 'miss', z: f.z, at });
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
      if (b.how === 'pen') {
        // A penalty: the foul before it is given as one, and the kick is staged (not a pass to the taker).
        const pre = all[i - 1];
        if (pre && (pre.kind === 'pass' || pre.kind === 'turnover')) all[i - 1] = { kind: 'pen', side: b.side, taker: b.shooter, at: pre.at };
        else all.splice(i, 0, { kind: 'pen', side: b.side, taker: b.shooter });
        const f = all.slice(0, i).reverse().find((x) => x.kind === 'foul' && x.side === b.side) as Extract<Beat, { kind: 'foul' }> | undefined;
        if (f) f.pen = true;
        continue;
      }
      const pre = all[i - 1], dl = deliveryOf(b.how);
      if (!dl || pre?.kind !== 'pass' || pre.side !== b.side) continue;
      pre.type ??= dl;
      if (dl === 'through' || b.how === 'corner' || passes) continue; // (the engine's path already has the ball out wide)
      // The ball goes out wide first, to the flank the nearest wide player is on.
      const ks = onPitch(m, b.side).filter((k) => k !== b.shooter && FORMATIONS[m.sides[b.side].tactics.formation].slots[k].pos !== 'GK' && a.pos[b.side][k]);
      const wk = ks.sort((p, q) => Math.abs(a.pos[b.side][q].y - W / 2) - Math.abs(a.pos[b.side][p].y - W / 2))[0];
      if (wk === undefined) continue;
      const top = a.pos[b.side][wk].y < W / 2;
      all.splice(i - 1, 0, { kind: 'pass', side: b.side, to: wk, pt: { x: toX(b.side, dl === 'cutback' ? 99 : 82), y: top ? 6 : W - 6 } });
    }
  }
  const live = (e: MatchEvent) => e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0);
  // Keep who has the ball consistent after the staging: a pass by the side without it becomes a turnover, and back.
  let has: 0 | 1 = a.poss;
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    if (b.kind === 'kickoff' || b.kind === 'corner' || b.kind === 'foul' || b.kind === 'out' || b.kind === 'pen') has = b.side;
    else if (b.kind === 'offside') has = (1 - b.side) as 0 | 1;
    else if (b.kind === 'duel') { if (b.side !== has) all[i] = { kind: 'turnover', side: b.side, to: b.who, z: b.z, at: b.at }; has = b.side; }
    else if (b.kind === 'shot') has = (1 - b.side) as 0 | 1;
    else if (b.kind === 'pass' && b.side !== has) { all[i] = { kind: 'turnover', side: b.side, to: b.to, pt: b.pt, z: b.z, at: b.at }; has = b.side; }
    else if (b.kind === 'turnover') { if (b.side === has && b.to !== undefined) all[i] = { kind: 'pass', side: b.side, to: b.to, pt: b.pt, z: b.z, at: b.at }; has = b.side; }
  }
  // Highlights (sim/highlights.ts, like FM): only the passage shown, at the engine's own pace; between highlights the
  // ball is simply where the engine left it. Without a mode, the whole minute is shown compressed (the old way).
  let beats = all;
  const shown = mode === undefined ? undefined : shownOf(m, mode, a.prevTo ?? -1);
  if (shown) {
    const sec = timeBeats(all, all.map(weightOf), 60000, true).map((x) => x / 1000);
    const keep = all.map((_, i) => i).filter((i) => (sec[i] >= shown.from && sec[i] <= shown.to) || all[i].kind === 'kickoff');
    const span = Math.max(1, shown.to - shown.from);
    // Full match: dead time squeezed (highlights.ts squeeze), the same way the minute's length is.
    const sq = mode === 4 ? squeeze(m) : null;
    // A move that began in the minute before: its end (what this minute's passage starts with) is played first.
    const pre = !sq && shown.from < 0 && a.prev ? a.prev.all.map((b, i) => ({ b, s: a.prev!.sec[i] - 60 })).filter((x) => x.s >= shown.from && x.b.kind !== 'kickoff') : [];
    beats = [...pre.map((x) => ({ ...x.b, at: ((x.s - shown.from) / span) * 60 })),
      ...keep.map((i) => ({ ...all[i], at: sq ? (sq.at(sec[i]) / sq.len) * 60 : (Math.max(0, sec[i] - shown.from) / span) * 60 }))];
    if (pre.length) a.kinds.carried = (a.kinds.carried ?? 0) + 1;
  } else if (shown === null) {
    beats = [];
    const last = [...(m.flow ?? [])].reverse().find((f) => f.k === 'w' || f.k === 'l' || f.k === 'r' || f.k === 'p');
    const side = (m.ball?.s ?? a.poss) as 0 | 1;
    const lastMan = last && last.s === side ? slotIn(last.k === 'p' ? last.q : last.p, side) : undefined;
    if (lastMan !== undefined && a.pos[side][lastMan]) a.ball = { ...a.pos[side][lastMan] };
    else if (last) a.ball = zonePt(last.z, r);
    a.poss = side; a.carrier = lastMan !== undefined && a.pos[side][lastMan] ? lastMan : slotNear(m, a, side, a.ball); a.flight = null; a.sp = null; a.run = null; a.zone = -1; a.inNet = false;
    a.snap = true;
  }
  // As many beats as the speed allows; a shot and the move before it always make the cut.
  const n = Math.max(2, Math.round(msPerMinute / 130));
  if (mode === undefined && all.length > n) {
    const lastShot = all.map((b) => b.kind).lastIndexOf('shot');
    const end = lastShot >= 0 ? lastShot + 1 + (all[lastShot + 1]?.kind === 'corner' ? 1 : 0) : all.length; // a corner won by the shot stays too
    beats = [...(all[0].kind === 'kickoff' ? [all[0]] : []), ...all.slice(Math.max(all[0].kind === 'kickoff' ? 1 : 0, end - n), end)];
  }
  // A highlight starts mid-play: the picture cuts to the man the engine has on the ball at its first beat.
  if (shown && mode !== 4 && beats.length && passes) {
    const f0 = beats[0];
    const who = f0.kind === 'pass' ? f0.from : f0.kind === 'duel' ? f0.who : undefined;
    const sd = f0.kind === 'pass' || f0.kind === 'duel' ? f0.side : 0;
    if (who !== undefined && a.pos[sd][who]) { a.poss = sd; a.carrier = who; a.ball = { ...a.pos[sd][who] }; a.flight = null; a.sp = null; a.run = null; a.inNet = false; a.snap = true; }
  }
  const shot = beats.find((b) => b.kind === 'shot') as Extract<Beat, { kind: 'shot' }> | undefined;
  a.shooter = shot ? { side: shot.side, slot: shot.shooter, how: shot.how } : null;
  a.beats = beats;
  a.beat = 0;
  a.clock = 0;
  a.msPM = msPerMinute;
  a.secMs = msPerMinute / Math.max(1, mode === 4 ? squeeze(m).len : shown ? shown.to - shown.from : 60);
  // A set piece gets a longer share of the minute (players need time to take their spots); the minute stays as long.
  const wt = beats.map((b) => weightOf(b));
  a.beatLen = msPerMinute / Math.max(1, wt.reduce((t, x) => t + x, 0));
  a.starts = timeBeats(beats, wt, msPerMinute, shown ? true : T.ENGINE_CLOCK); // the director (director.ts): a highlight at the engine's own pace
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
  // VAR: an on-field review this minute (the engine's 'var' event, ':ofr'): the referee goes to the monitor a couple of
  // seconds after the incident it's about (the last shot, foul or penalty of the minute shown).
  a.off.review = null;
  if (m.events.some((e) => live(e) && e.kind === 'var' && (e.note ?? '').includes(':ofr'))) {
    const i = beats.map((b) => b.kind).reduce((x, k, j) => (k === 'shot' || k === 'foul' || k === 'pen' ? j : x), -1);
    if (i >= 0) { const from = a.starts[i] + 1.5 * (a.secMs ?? 40); a.off.review = { from, until: Math.min(msPerMinute * 0.98, from + Math.max(2600, 9 * (a.secMs ?? 40))) }; }
  }
  a.ids = [[...m.sides[0].onPitch], [...m.sides[1].onPitch]];
  a.minute = minuteKey(m);
  // For the next minute: this one's beats on the engine's clock, and where its highlight ended.
  a.prev = { all, sec: timeBeats(all, all.map(weightOf), 60000, true).map((x) => x / 1000) };
  a.prevTo = shown ? shown.to : -1;
}
const weightOf = (b: Beat) => (b.kind === 'corner' ? 4 : b.kind === 'pen' ? 4 : b.kind === 'foul' ? (wallSize(depthOf(b.side, b.pt.x), b.pt.y) ? 4 : 1.5) : b.kind === 'offside' || b.kind === 'out' ? 1.5 : 1);
const SHOT_EV = new Set(['goal', 'nogoal', 'save', 'block', 'miss']);
const minuteKey = (m: LiveMatch) => `${m.minute}+${m.plus ?? 0}`;

function fly(a: Anim, to: Pt, dur: number, then: () => void, h = 0, end = 0) {
  a.flight = { from: { ...a.ball }, to, t: 0, dur: Math.max(60, dur), then, h, end };
}
const nearestOf = (m: LiveMatch, a: Anim, side: 0 | 1, pt: Pt) => onPitch(m, side).filter((k) => a.pos[side][k]).sort((x, y) => dist(a.pos[side][x], pt) - dist(a.pos[side][y], pt))[0];

// How long this beat has until the next one (the director times beats unevenly; a.beat is already past this one).
// (from now: a beat that ran late, after a shot waited for its pass, has only what's left until the next one)
const gapOf = (a: Anim) => Math.max(60, (a.starts[a.beat] ?? a.msPM) - Math.max(a.clock, a.starts[a.beat - 1] ?? 0));
function runBeat(a: Anim, m: LiveMatch, b: Beat) {
  const gap = gapOf(a);
  const travel = Math.min(420, gap * 0.7);
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
    a.sp = { kind: 'corner', side: b.side, at: flag, until: a.time + gap, taker: k, rush: rushFor(a.msPM, gap) };
    a.kinds.corner = (a.kinds.corner ?? 0) + 1;
    // Why it's a corner: the ball comes off the man who put it behind (a block, a header, the keeper's save) and goes
    // over his goal line on that side; then it's fetched to the flag.
    const other = (1 - b.side) as 0 | 1, by = b.by !== undefined ? a.pos[other][b.by] : undefined;
    const off = by && dist(by, a.ball) < 14 ? by : a.ball;
    const out = { x: toX(b.side, L + 1.8), y: clamp(off.y + (flag.y < W / 2 ? -6 : 6), 1, W - 1) };
    const sec = a.secMs ?? 40, toOff = off === a.ball ? 0 : (dist(a.ball, off) / SPEED.short) * sec;
    const behind = () => fly(a, out, Math.max(150, (dist(a.ball, out) / 14) * sec), () => fly(a, flag, Math.max(200, gap * 0.25), () => { a.poss = b.side; a.carrier = k; }), 0.8);
    if (toOff > 60) fly(a, off, toOff, behind); else behind();
    a.kinds.cornerCause = (a.kinds.cornerCause ?? 0) + (by ? 1 : 0);
    return;
  }
  if (b.kind === 'out') {
    // Out of play: the ball runs over the line, then the restart. A throw-in is taken where it went out by the nearest
    // outfield man; a goal kick by the keeper from the six-yard box.
    a.run = null; a.carrier = -1; a.zone = -1; a.shooter = null;
    // Out of play from where the ball is, over the nearer touchline (or the goal line behind the restarting side).
    const dur = gap, top = a.ball.y < W / 2;
    if (b.how === 'ti') {
      const fwd = b.side === 0 ? -1 : 1; // the side that put it out was going the other way
      const at = { x: clamp(a.ball.x + fwd * 3, 4, L - 4), y: top ? 0.3 : W - 0.3 };
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
      fly(a, { x: toX(b.side, -1.5), y: clamp(a.ball.y, 10, W - 10) }, travel * 0.6, () => { a.poss = b.side; a.carrier = gk; });
    }
    return;
  }
  if (b.kind === 'offside') {
    // The flag goes up on the line of the last defender; the free kick goes to the other side (the next beat).
    a.flag = { x: a.ball.x, until: a.time + Math.max(1400, a.beatLen * 1.5) };
    a.kinds.offside = (a.kinds.offside ?? 0) + 1;
    return;
  }
  if (b.kind === 'pen') {
    // A penalty: the ball on the spot, the taker behind it, everyone else out of the box; the keeper on his line.
    const k = a.pos[b.side][b.taker] ? b.taker : nearestOf(m, a, b.side, a.ball);
    if (k === undefined) return;
    const spot = { x: toX(b.side, 94), y: W / 2 };
    a.run = null; a.carrier = -1; a.zone = -1;
    a.sp = { kind: 'pen', side: b.side, at: spot, until: a.time + gap, taker: k, rush: rushFor(a.msPM, gap) };
    a.kinds.pen = (a.kinds.pen ?? 0) + 1;
    fly(a, spot, travel * 0.3, () => { a.poss = b.side; a.carrier = k; });
    return;
  }
  if (b.kind === 'foul') {
    // The challenge the engine says brought him down: where he was (in the box for a penalty), he goes down, the
    // referee whistles and runs to it, and shows the card the engine gave, if any.
    const v = a.pos[b.side][b.to];
    if (!v) return;
    const inBoxPt = (q: Pt) => ({ x: toX(b.side, Math.max(depthOf(b.side, q.x), 90)), y: clamp(q.y, W / 2 - 18, W / 2 + 18) });
    const at = b.pen ? inBoxPt(v) : { x: clamp(v.x, 1, L - 1), y: clamp(v.y, 1, W - 1) };
    a.run = null; a.carrier = -1;
    a.kinds.foul = (a.kinds.foul ?? 0) + 1;
    a.kinds.foulAtMan = (a.kinds.foulAtMan ?? 0) + (dist(v, at) < 4 ? 1 : 0);
    const sec = a.secMs ?? 40;
    a.downs.push({ side: b.side, slot: b.to, until: a.time + Math.max(900, 2.2 * sec) });
    a.off.whistle = { at, until: a.time + Math.max(1200, gap * 0.8) };
    const fouler = b.by !== undefined ? m.sides[(1 - b.side) as 0 | 1].onPitch[b.by] || a.ids[(1 - b.side) as 0 | 1]?.[b.by] : undefined;
    const card = fouler ? m.events.find((e) => (e.kind === 'yellow' || e.kind === 'red') && e.playerId === fouler && e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0)) : undefined;
    if (card) { a.off.card = { red: card.kind === 'red', from: a.time + Math.max(500, 1.2 * sec), until: a.time + Math.max(2400, 5 * sec) }; a.kinds.card = (a.kinds.card ?? 0) + 1; }
    if (b.pen) return; // given as a penalty: the ball goes to the spot with the next beat
    a.sp = { kind: 'fk', side: b.side, at, until: a.time + gap, taker: b.to, rush: rushFor(a.msPM, gap) };
    if (wallSize(depthOf(b.side, at.x), at.y)) a.kinds.wall = (a.kinds.wall ?? 0) + 1;
    fly(a, at, Math.max(60, (dist(a.ball, at) / SPEED.short) * sec), () => { a.poss = b.side; a.carrier = b.to; });
    return;
  }
  if (b.kind === 'duel') {
    // A contest on the ball: the carrier (the engine's man; the picture cuts to him if a highlight starts here) either
    // goes past the man who closed him and carries it on a few metres, or is forced back and keeps it.
    if (!a.pos[b.side][b.who]) return;
    // (a ball still on its way to him lands first: he takes it on from there)
    if (!a.flight && (a.carrier !== b.who || a.poss !== b.side)) {
      // Not his yet: at the start of a highlight the picture cuts to him; otherwise the ball is played to him (no jump).
      if (a.beat - 1 === 0) { a.poss = b.side; a.carrier = b.who; a.ball = { ...a.pos[b.side][b.who] }; }
      else {
        const to = a.pos[b.side][b.who];
        a.carrier = -1;
        fly(a, { x: to.x + (b.side === 0 ? 1 : -1), y: to.y }, Math.max(120, (dist(a.ball, to) / SPEED.short) * (a.secMs ?? 40)), () => { a.poss = b.side; a.carrier = b.who; });
        const fl = a.flight as Anim['flight']; // (set by fly just above)
        if (fl) fl.recv = [b.side, b.who];
      }
    }
    if (b.z !== undefined) a.zone = b.z;
    a.kinds[b.won ? 'duel:won' : 'duel:held'] = (a.kinds[b.won ? 'duel:won' : 'duel:held'] ?? 0) + 1;
    const p = a.pos[b.side][b.who], zc = b.z !== undefined ? zoneCentre(b.z) : p;
    const dx = zc.x - p.x, dy = zc.y - p.y, d = Math.hypot(dx, dy) || 1;
    const fwd = b.side === 0 ? 1 : -1;
    const step = b.won ? T.DUEL_CARRY : -T.DUEL_CARRY * 0.5;
    const ux = d > 3 ? dx / d : fwd, uy = d > 3 ? dy / d : 0;
    a.run = { side: b.side, slot: b.who, pt: { x: clamp(p.x + ux * step, 2, L - 2), y: clamp(p.y + uy * step, 2, W - 2) } };
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
    else if (a.run && a.run.side !== b.side) a.run = null;
    if (b.vs !== undefined) a.kinds.tackle = (a.kinds.tackle ?? 0) + 1;
    fly(a, a.pos[b.side][k], travel * (b.vs !== undefined ? 0.25 : 0.6), () => { a.poss = b.side; a.carrier = k; });
    return;
  }
  if (b.kind === 'pass') {
    if (b.side !== a.poss || !a.pos[b.side][b.to]) return;
    // The engine's passer: the picture cuts to him if the ball isn't his (the first beat of a highlight).
    if (b.from !== undefined && a.carrier !== b.from && a.pos[b.side][b.from] && !a.flight) { a.carrier = b.from; a.ball = { ...a.pos[b.side][b.from] }; }
    if (b.z !== undefined) a.zone = b.z;
    if (b.pt) a.run = { side: b.side, slot: b.to, pt: b.pt };
    else if (a.run?.side === b.side) a.run = null; // a new pass: whoever was carrying it on has let it go
    if (b.to === a.carrier) return; // he carries it on himself (the run above)
    // To the shooter: where he's running to (his spot in or at the edge of the box).
    const toShooter = a.shooter?.side === b.side && a.shooter.slot === b.to;
    // The engine's pass goes to the man, not to a spot: a little ahead of him on his way (he comes to meet it).
    const here = a.pos[b.side][b.to], going = target(m, a, b.side, b.to);
    const lead = Math.min(T.PASS_LEAD, dist(here, going));
    const ahead = dist(here, going) > 0.5 ? { x: here.x + ((going.x - here.x) / dist(here, going)) * lead, y: here.y + ((going.y - here.y) / dist(here, going)) * lead } : here;
    let to = toShooter ? going : b.pt ?? (b.from !== undefined ? ahead : here);
    const df = depthOf(b.side, a.ball.x), dt0 = depthOf(b.side, to.x);
    // The engine says what kind of ball it is (passes.ts): an ordinary one is short or long by its length, never a
    // through ball or a cutback the engine didn't play.
    const type = b.type ?? (b.from !== undefined ? (dist(a.ball, to) > 32 ? 'long' : 'short') : passKind(df, a.ball.y, dt0, to.y, dist(a.ball, to)));
    // A ball to a man on the move goes where he can be when it gets there: along his way, as far as he can run while
    // it travels (a cross to the runner into the box, a pass to a man coming short).
    if (b.from !== undefined && a.secMs && type !== 'through') {
      const flightS = dist(a.ball, going) / SPEED[type];
      const reach = Math.min(dist(here, going), T.RECV_RUN * flightS, type === 'short' ? T.PASS_LEAD : Infinity);
      to = dist(here, going) > 0.5 ? { x: here.x + ((going.x - here.x) / dist(here, going)) * reach, y: here.y + ((going.y - here.y) / dist(here, going)) * reach } : here;
    }
    // A through ball goes into space ahead of the runner.
    if (type === 'through') to = { x: toX(b.side, Math.min(dt0 + THROUGH_LEAD, 100)), y: to.y };
    if (dt0 < df - 3) a.back[b.side] = a.time; // a backward pass: the other side's line steps up
    a.kinds[type] = (a.kinds[type] ?? 0) + 1;
    a.carrier = -1;
    const arc = ARC[type];
    const land = { x: to.x + (b.side === 0 ? 1 : -1), y: to.y };
    // The engine's passes travel at a ball's real speed on this minute's clock (a long ball takes longer than a short one).
    const real = b.from !== undefined && a.secMs ? (dist(a.ball, land) / SPEED[type]) * a.secMs : 0;
    // He runs onto it: where the ball will land is where he goes while it travels.
    if (b.from !== undefined && !toShooter) a.run = { side: b.side, slot: b.to, pt: land };
    a.lastPass = { side: b.side, to: b.to, at: a.time, type, eng: b.from !== undefined };
    fly(a, land, real ? Math.max(120, real) : travel * arc.t, () => { a.carrier = b.to; if (a.run?.side === b.side && a.run.slot === b.to && b.from !== undefined) a.run = null; }, arc.h);
    if (b.from !== undefined && a.flight) a.flight.recv = [b.side, b.to];
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
    a.shooter = null; a.poss = other;
    const gk = gkSlot(m, other), spot = { x: toX(other, 5.5), y: W / 2 + (t.y < W / 2 ? -9 : 9) };
    a.sp = { kind: 'gk', side: other, at: spot, until: a.time + a.beatLen * 1.2, taker: gk, rush: 1 };
    a.kinds.goalkick = (a.kinds.goalkick ?? 0) + 1;
    // The ball is fetched and placed on the six-yard box, where the keeper takes it (no jump to his hands).
    fly(a, spot, travel * 0.8, () => { a.carrier = gk; });
  }, lift, t.h);
  else {
    const gk = gkSlot(m, other);
    const keeper = a.pos[other][gk] ?? { x: goalX, y: W / 2 };
    // Held or parried where the keeper is (he dives to it), not on the line away from him.
    const save = { x: clamp(keeper.x, Math.min(goalX, goalX - fwd * 6), Math.max(goalX, goalX - fwd * 6)), y: clamp(t.y, keeper.y - 3, keeper.y + 3) };
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
  if (sp.kind === 'pen') {
    // Everyone but the taker and the keepers to the edge of the box, spread along the arc.
    const goalD = 105, ks2 = ks.filter((k) => slots[k].pos !== 'GK' && !(side === sp.side && k === sp.taker));
    ks2.forEach((k, i) => { const y = W / 2 + (i - (ks2.length - 1) / 2) * 3.2; tg[k] = { x: toX(sp.side, goalD - 19 - (Math.abs(y - W / 2) < 9 ? 1 : 0)), y }; boost[k] = sp.rush; });
    if (side === sp.side && sp.taker >= 0) { tg[sp.taker] = { x: toX(sp.side, 92), y: W / 2 }; boost[sp.taker] = sp.rush; }
    return;
  }
  if (sp.kind === 'gk' || sp.kind === 'ti') { if (side === sp.side && sp.taker >= 0) { tg[sp.taker] = sp.at; boost[sp.taker] = Math.max(boost[sp.taker] ?? 1, sp.rush); } return; }
  const att = sp.side, flank: -1 | 1 = sp.at.y < W / 2 ? -1 : 1;
  const field = ks.filter((k) => slots[k].pos !== 'GK' && !(side === att && k === sp.taker)).sort((p, q) => AIR[slots[p].pos] - AIR[slots[q].pos]);
  const ballD = depthOf(att, sp.at.x);
  if (side === att) {
    if (sp.kind === 'fk' && !wallSize(ballD, sp.at.y)) return; // a free kick out of range is just played on
    attackSpots(field.length, flank).forEach((q, i) => { tg[field[i]] = { x: toX(side, q.d), y: q.y }; boost[field[i]] = sp.rush; });
    if (sp.taker >= 0) { tg[sp.taker] = { x: sp.at.x - (side === 0 ? 1.2 : -1.2), y: sp.at.y }; boost[sp.taker] = sp.rush; }
    return;
  }
  if (sp.kind === 'fk') {
    const n = wallSize(ballD, sp.at.y);
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
      spd: speedsOf(m, world), body: bodiesOf(m, world), ag: [[], []], eventAt: -1e9, reacts: [], kin: { turn: 0, acc: 0 }, line: [undefined, undefined], back: [-1e9, -1e9], trans: null, runsN: 0, kinds: {}, sp: null, flag: null, hurt: null, hurtAt: [], ids: [[...m.sides[0].onPitch], [...m.sides[1].onPitch]], seen: [[], []],
      off: newOfficials(), downs: [],
    };
    for (const side of [0, 1] as const) {
      const slots = FORMATIONS[m.sides[side].tactics.formation].slots;
      a.pos[side] = slots.map((_, k) => target(m, a, side, k));
    }
  return a;
}

// One frame: `dt` ms of display time; `ms` = real ms per match minute (the speed setting); `go` = the match is running.
// `ms`: how long this match minute lasts on screen. `scale`: ms per match minute of PLAY for movement (how fast players
// run; in highlights a passage plays at real pace, so this stays fixed while `ms` swings between a highlight and the
// quick clock between them). Missing: the same as `ms` (the old compressed minute).
export function tick(a: Anim, mm: LiveMatch, world: World, dt: number, ms: number, go: boolean, mode?: HlMode, scale = ms) {
      if (PITCH_DEBUG) (a as unknown as { go?: boolean }).go = go; // the test skips a paused or finished match
      a.time += dt;
      if (a.minute !== minuteKey(mm)) plan(a, mm, ms, world, mode);
      // The minute's length on screen changed mid-minute (another highlight mode or speed): the rest of it keeps pace.
      else if (go && ms > 0 && a.msPM > 0 && Math.abs(ms - a.msPM) > 1) {
        const k = ms / a.msPM;
        a.starts = a.starts.map((x) => x * k); a.clock *= k; a.msPM = ms; a.beatLen *= k;
        if (a.secMs) a.secMs *= k;
        if (a.off.review) a.off.review = { from: a.off.review.from * k, until: a.off.review.until * k };
        a.hurtAt = a.hurtAt.map((x) => ({ ...x, at: x.at * k }));
      }
      if (go) {
        a.clock += dt;
        while (a.beat < a.beats.length && a.clock >= (a.starts[a.beat] ?? a.beat * a.beatLen)) {
          // A shot waits for the pass to reach the shooter (he strikes it when it gets to him), within the minute.
          const nb = a.beats[a.beat], f = a.flight;
          if (nb.kind === 'shot' && f?.recv && f.recv[0] === nb.side && f.recv[1] === nb.shooter && a.clock < a.msPM * 0.97) break;
          runBeat(a, mm, a.beats[a.beat++]);
        }
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
        // A pass aimed at a man on the move: its end bends towards where he really is (he adjusts, it's a moving target).
        if (f.recv && a.pos[f.recv[0]][f.recv[1]] && !f.end) {
          const q = a.pos[f.recv[0]][f.recv[1]], want = { x: q.x + (f.recv[0] === 0 ? 1.1 : -1.1), y: q.y + 0.6 };
          const g = dist(f.to, want), st = (T.BALL_HOME * dt) / (a.secMs ?? 40);
          if (g > 0.2) f.to = g <= st ? want : { x: f.to.x + ((want.x - f.to.x) / g) * st, y: f.to.y + ((want.y - f.to.y) / g) * st };
        }
        const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - (-2 * f.t + 2) ** 2 / 2;
        a.ball = { x: f.from.x + (f.to.x - f.from.x) * e, y: f.from.y + (f.to.y - f.from.y) * e };
        a.bh = arcHeight(f.h, f.t, f.end);
        if (f.t >= 1) { a.flight = null; if (!f.end) a.bh = 0; f.then(); }
      } else if (a.sp && a.time < a.sp.until && (a.sp.kind !== 'gk' || dist(a.ball, a.sp.at) < 1)) {
        a.ball = { ...a.sp.at }; a.bh = 0; // a dead ball sits on its spot until it's taken
      } else if (a.carrier >= 0 && a.pos[a.poss][a.carrier] && !a.inNet) {
        const p = a.pos[a.poss][a.carrier];
        a.bh = 0;
        // At his feet; a ball that isn't yet (it landed where he was going, or ran loose) rolls on to him at a ball's
        // pace while he goes to it: it never jumps.
        const want = { x: p.x + (a.poss === 0 ? 1.1 : -1.1), y: p.y + 0.6 };
        const gap = dist(a.ball, want), step = (T.BALL_ROLL * dt) / (a.secMs ?? 40);
        a.ball = gap <= step || gap < 0.3 ? want : { x: a.ball.x + ((want.x - a.ball.x) / gap) * step, y: a.ball.y + ((want.y - a.ball.y) / gap) * step };
      }
      // What markers see: each player's position a moment ago (it trails him; MARK_LAG at the normal pace).
      { const k = 1 - Math.exp(-dt / Math.max(1, (T.MARK_LAG * scale) / 2400));
        for (const sd of [0, 1] as const) a.pos[sd].forEach((q, j) => { if (!q) return; const s0 = a.seen[sd][j]; a.seen[sd][j] = s0 && !a.snap ? { x: s0.x + (q.x - s0.x) * k, y: s0.y + (q.y - s0.y) * k } : { ...q }; }); }
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
        const tg0 = (s2: 0 | 1, k: number) => target(mm, a, s2, k); // where a player is heading (the shooter: his run into the box)
        const ft = fullTactics(mm.sides[side].tactics);
        const tr = a.trans && a.time - a.trans.at < TRANSITION_MS(a.beatLen) ? a.trans : null;
        const boost: number[] = [];
        // Sprints (body.ts move, urgent): flat out until close, as a real sprint is — an overlap, a counter-press, a
        // recovery run, closing a shot. Everything else (holding shape, walking to a set piece) eases in.
        const rush = new Set<number>();
        const staging0 = !!a.sp && a.time < a.sp.until; // a set piece is being staged (nobody offers for a pass)
        if (has) {
          // Runs off the ball by role (at most 3 real runs at once), then the break after winning the ball.
          const other = (1 - side) as 0 | 1;
          const theirLine = a.line[other] ? L - a.line[other]!.depth : 80;
          const bd = depthOf(side, a.ball.x);
          const busy = (k: number) => k === a.carrier || (a.run?.side === side && a.run.slot === k) || (a.shooter?.side === side && a.shooter.slot === k);
          let runs = 0;
          a.runsN = 0;
          // Reading the play (phase 3): a ball about to go out wide in the last third starts the full-back's run now.
          const soon = upcoming(a.beats, a.starts, a.beat, a.clock, a.msPM * T.LOOK_FB).map((u) => u.b)
            .find((b) => (b.kind === 'pass' || b.kind === 'turnover') && b.side === side && b.pt && depthOf(side, b.pt.x) > 65 && Math.abs(b.pt.y - W / 2) > 15) as { pt: Pt } | undefined;
          const fbRole = (r: string) => r === 'fullback' || r === 'wingback' || r === 'inverted_fullback';
          for (const k of [...ks].sort((p, q) => Math.abs((a.pos[side][p]?.y ?? 0) - a.ball.y) - Math.abs((a.pos[side][q]?.y ?? 0) - a.ball.y))) {
            if (busy(k) || LINE[slots[k].pos] === 'gk') continue;
            const d = depthOf(side, tg[k].x);
            // The play as it is; a full-back with nothing to do there reads the next wide ball (it adds a run, never
            // takes one away from the full-back on the ball's side).
            const ip = sps[k]?.ip ?? '', ctx = { bd, by: a.ball.y, theirLine, d, y: tg[k].y, wide: wideOf(tg[k].y) };
            const r = runFor(ip, ctx) ?? (soon && fbRole(ip) && depthOf(side, soon.pt.x) > bd ? runFor(ip, { ...ctx, bd: depthOf(side, soon.pt.x), by: soon.pt.y }) : null);
            if (!r) continue;
            if (r.run) { if (runs >= 3) continue; runs++; a.runsN = runs; boost[k] = 1.25; if (fbRole(ip)) rush.add(k); }
            tg[k] = { x: toX(side, clamp(r.d, 2, 103)), y: clamp(r.y, 2, W - 2) };
          }
          // Timing runs against the offside line (phase 3): nobody goes beyond their second-last man before the pass. The
          // man the next ball is for (the director reads it a moment ahead) times his run to be onside when it's played
          // and goes as it is. Everyone else holds the line, level with it.
          const oDeps = onPitch(mm, other).map((j) => a.pos[other][j]).filter(Boolean).map((q) => depthOf(side, q.x)).sort((p, q) => q - p);
          const offLine = Math.max(oDeps[1] ?? L, bd, L / 2);
          const nextTo = upcoming(a.beats, a.starts, a.beat, a.clock, a.msPM * T.LOOK_RUN).map((u) => u.b).find((b) => (b.kind === 'pass' || b.kind === 'turnover') && b.side === side);
          const receiver = nextTo && 'to' in nextTo ? nextTo.to : -1;
          const goes = !!a.flight && a.poss === side; // the ball is on its way: the runner may be past the line now
          for (const k of ks) {
            if (k === a.carrier || !tg[k] || (goes && k === receiver)) continue;
            if (depthOf(side, tg[k].x) > offLine - T.ONSIDE) tg[k] = { x: toX(side, offLine - T.ONSIDE), y: tg[k].y };
          }
          // Support (phase 3): the nearest team-mates offer the carrier a pass. One whose lane is shadowed checks away
          // sharply (a sprint) to the nearest open spot at passing range around the carrier: short, wide, behind or ahead
          // of him, never offside. With the marker a moment behind (MARK_LAG), that sharp move opens the lane.
          // (in build-up and midfield: near their box attackers keep their runs and positions)
          if (a.carrier >= 0 && a.pos[side][a.carrier] && !a.flight && !staging0 && bd < T.SUPPORT_UPTO) {
            const cp = a.pos[side][a.carrier];
            const opp = onPitch(mm, other).map((j) => a.pos[other][j]).filter(Boolean);
            // (a man blocks it only in front of the ball along the pass: a presser beside the carrier doesn't)
            const open = (q: Pt) => opp.every((d) => { const vx = q.x - cp.x, vy = q.y - cp.y, l2 = vx * vx + vy * vy || 1; const raw = ((d.x - cp.x) * vx + (d.y - cp.y) * vy) / l2; if (raw * Math.sqrt(l2) < 0.5) return true; const t = Math.min(1, raw); return Math.hypot(cp.x + t * vx - d.x, cp.y + t * vy - d.y) > T.LANE; });
            const inRange = (q: Pt) => { const r = dist(q, cp); return r >= T.SUPPORT_D[0] && r <= T.SUPPORT_D[1]; };
            const spots: Pt[] = [];
            for (const r of [9, 13, 17, 21]) for (let i = 0; i < 12; i++) {
              const q = { x: cp.x + Math.cos((i * Math.PI) / 6) * r, y: cp.y + Math.sin((i * Math.PI) / 6) * r };
              if (q.x > 2 && q.x < L - 2 && q.y > 2 && q.y < W - 2 && depthOf(side, q.x) <= offLine - T.ONSIDE && open(q)) spots.push(q);
            }
            const mates = ks.filter((k) => k !== a.carrier && LINE[slots[k].pos] !== 'gk' && tg[k] && a.pos[side][k] && !(a.run?.side === side && a.run.slot === k) && !(a.shooter?.side === side && a.shooter.slot === k))
              .sort((p, q) => dist(a.pos[side][p], cp) - dist(a.pos[side][q], cp)).slice(0, T.SUPPORT);
            const taken: Pt[] = [];
            for (const k of mates) {
              const here = a.pos[side][k];
              if (inRange(here) && open(here)) { taken.push(here); continue; } // already free: stay
              const best = spots.filter((q) => taken.every((t) => dist(t, q) > 6)).sort((p, q) => dist(p, here) - dist(q, here))[0];
              if (best) { tg[k] = best; taken.push(best); rush.add(k); boost[k] = Math.max(boost[k] ?? 1, 1.3); }
            }
          }
          // The carrier's pace: he drives on into space and slows, shielding it, when a man is on him.
          // The man a pass is played to knew it was coming: he goes for it at once, and hard.
          const meets = a.flight && a.lastPass?.side === side && a.lastPass.eng ? a.lastPass.to : -1;
          if (meets >= 0 && a.pos[side][meets]) { rush.add(meets); boost[meets] = Math.max(boost[meets] ?? 1, 1.4); const g = a.ag[side]?.[meets]; if (g) g.pend = false; }
          // A penalty is coming: the man who'll be brought down is on his way into the box with it.
          const nf = a.beats[a.beat];
          if (nf?.kind === 'foul' && nf.pen && nf.side === side && nf.to === a.carrier && a.pos[side][a.carrier]) {
            const q = a.pos[side][a.carrier];
            tg[a.carrier] = { x: toX(side, Math.max(depthOf(side, q.x), 92)), y: clamp(q.y, W / 2 - 14, W / 2 + 14) }; boost[a.carrier] = 1.5; rush.add(a.carrier);
          }
          const loose = a.carrier >= 0 && a.pos[side][a.carrier] && dist(a.ball, a.pos[side][a.carrier]) > 2.5;
          if (loose) { tg[a.carrier] = { ...a.ball }; boost[a.carrier] = Math.max(boost[a.carrier] ?? 1, 1.3); rush.add(a.carrier); } // he goes to collect it
          else if (a.carrier >= 0 && a.pos[side][a.carrier] && tg[a.carrier]) { // (a carrier sent off or subbed has no target)
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
          // A carrier in our box: the nearest defender steps into the shooting lane at once. The director lets him read
          // a shot that is coming: he is in the lane from where it will be struck before it is.
          const shotSoon = upcoming(a.beats, a.starts, a.beat, a.clock, a.msPM * T.LOOK_SHOT).map((u) => u.b).find((b) => b.kind === 'shot' && b.side === other) as { shooter: number } | undefined;
          const from = shotSoon && a.pos[other][shotSoon.shooter] ? (a.shooter?.side === other && a.shooter.slot === shotSoon.shooter ? tg0(other, shotSoon.shooter) : a.pos[other][shotSoon.shooter]) : null;
          const ballIn = inBox(a.ball, ownGoal) && a.poss === other && a.carrier >= 0 && !a.flight;
          if (from || ballIn) {
            const spot = blockSpot(ballIn || !from ? a.ball : from, ownGoal); // once he has it in the box, the lane from the ball
            blockK = [...field].sort((p, q) => dist(a.pos[side][p], spot) - dist(a.pos[side][q], spot))[0] ?? -1;
            if (blockK >= 0) { tg[blockK] = spot; boost[blockK] = T.BLOCK_BOOST; }
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
            // He marks the man where he sees him: a moment behind, less so the better he reads the game.
            const now = a.pos[other][tk], was = a.seen[other][tk] ?? now, rd = (a.body[side]?.[mk]?.reads ?? 0.5) * T.MARK_READ;
            const t = { x: was.x + (now.x - was.x) * rd, y: was.y + (now.y - was.y) * rd };
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
                tg[k] = { ...a.ball }; boost[k] = 1.6; rush.add(k);
              }
            } else {
              const bdep = depthOf(side, a.ball.x);
              // The back line drops as one (to 5 m behind the ball at most); the others ahead of the ball race back.
              const lineTo = Math.min(ln.depth, bdep - 5);
              for (const k of field) {
                if (line(k) === 'def' && free(k)) { tg[k] = { x: toX(side, lineTo), y: tg[k].y }; if (depthOf(side, a.pos[side][k].x) > lineTo) boost[k] = 1.4; }
                else if (depthOf(side, a.pos[side][k].x) > bdep) { tg[k] = { x: toX(side, Math.min(depthOf(side, tg[k].x), bdep - 5)), y: tg[k].y }; boost[k] = 1.4; rush.add(k); }
                // Everyone stays tied to the dropped line: midfield within 16 m of it, forwards within 38 m.
                if (free(k) && line(k) !== 'def') tg[k] = { x: toX(side, Math.min(depthOf(side, tg[k].x), lineTo + (line(k) === 'mid' ? 16 : 38))), y: tg[k].y };
              }
            }
          }
          // The man in the next contest (the engine names him): he closes the carrier, or the man the ball is going to,
          // so the tackle or the dribble past him happens where the ball is.
          const nb = a.beats[a.beat];
          const vs = nb && ((nb.kind === 'duel' && nb.side === other) ? nb.vs : nb.kind === 'turnover' && nb.side === side && nb.vs !== undefined ? nb.to : nb.kind === 'foul' && nb.side === other ? nb.by : undefined);
          if (vs !== undefined && a.pos[side][vs] && LINE[slots[vs]?.pos] !== 'gk') {
            const toward = a.flight && a.poss === other ? a.flight.to : a.ball;
            tg[vs] = pressSpot(toward, ownGoal, T.DUEL_CLOSE); boost[vs] = Math.max(boost[vs] ?? 1, 1.5); rush.add(vs);
          }
        } else a.line[side] = undefined;
        // A set piece being staged: everyone takes his spot (ui2/pitch/setpieces.ts).
        if (a.sp && a.time < a.sp.until) stage(a, mm, side, ks, tg, boost);
        // Phase 1: each player moves with his own body (top speed, acceleration, turning), re-reads the play every
        // decision tick, reacts to a new ball after his own reaction time, and sprints only while his tank lasts.
        const staging = !!a.sp && a.time < a.sp.until;
        const tau = Math.max(120, scale * 0.9);
        // The back line moves as one: out of possession its defenders react on their best reader's call.
        const down = (k: number) => (!!a.hurt && a.time < a.hurt.until && a.hurt.side === side && a.hurt.slot === k) || a.downs.some((d) => d.side === side && d.slot === k && a.time < d.until); // injured or fouled: stays where he fell
        const isDef = (k: number) => !has && LINE[sps[k]?.opos ?? slots[k].pos] === 'def' && !pp.press.includes(k) && k !== pp.cover && k !== blockK && !down(k); // the blocker sprints to the lane, out of the line
        const lineReads = Math.max(0, ...ks.filter(isDef).map((k) => a.body[side]?.[k]?.reads ?? 0.5));
        // ... and holds its shape at its slowest defender's pace, so it doesn't break up while it steps or drops.
        const lineBodies = ks.filter(isDef).map((k) => a.body[side]?.[k]).filter(Boolean) as Body[];
        const lineTop = Math.min(...lineBodies.map((b) => b.top), 9), lineAcc = Math.min(...lineBodies.map((b) => b.acc), 9);
        for (const k of ks) {
          let t = tg[k];
          if (down(k)) t = a.pos[side][k] ?? t;
          else if (has && k === a.carrier && !staging) t = { x: t.x * T.CARRY_AIM + a.pos[side][k].x * (1 - T.CARRY_AIM) + (side === 0 ? 0.4 : -0.4), y: t.y * T.CARRY_AIM + a.pos[side][k].y * (1 - T.CARRY_AIM) };
          // A little life in everyone's feet, except a keeper set on the shooting angle (he stays on it); more while the
          // ball is dead (a set piece being set up, a stoppage): men jostle and drift, nobody stands like a statue.
          const deadBall = staging || a.beat >= a.beats.length || a.beats[a.beat - 1]?.kind === 'foul';
          // (a wall, and the man over the ball, stand still)
          const still = staging && !!a.sp && ((a.sp.side !== side && !!a.sp.wall?.includes(k)) || (a.sp.side === side && a.sp.taker === k));
          const amp = (!has && LINE[slots[k].pos] === 'gk') || still ? 0 : deadBall ? T.IDLE_DEAD : T.IDLE_LIVE;
          const wob = Math.sin(a.time / 700 + k * 1.7 + side * 3) * amp;
          const wobX = Math.sin(a.time / 1100 + k * 2.3 + side) * amp * (deadBall ? 0.8 : 0.5);
          const p = a.pos[side][k] ?? t;
          const B0 = a.body[side]?.[k] ?? { top: 1, acc: 1, turn: 1, reads: 0.5, tank: 0.7 };
          // In the line: the line's pace. Walking to a set piece: no turning limit (he's not running at speed).
          // The keeper side-steps across his goal (no running turn limit, quick feet).
          const B = staging || (!has && LINE[slots[k].pos] === 'gk') ? { ...B0, turn: B0.turn * 4, acc: B0.acc * 1.5 } : isDef(k) ? { ...B0, top: Math.min(B0.top, lineTop), acc: Math.min(B0.acc, lineAcc) } : B0;
          if (wobX) t = { x: t.x + wobX, y: t.y };
          const g = a.ag[side][k] ??= { vx: 0, vy: 0, tx: t.x, ty: t.y + wob, at: 0, tank: 1, pend: false, spr: false };
          // Between highlights the picture cuts: everyone is simply where he should be for the next scene.
          if (a.snap) { a.pos[side][k] = { x: t.x, y: t.y }; g.vx = 0; g.vy = 0; g.tx = t.x; g.ty = t.y; g.pend = false; continue; }
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
          const nk = move({ x: p.x, y: p.y, vx: g.vx, vy: g.vy }, g.tx, g.ty, dt, tau, B, sprint, !staging && ((!has && k === blockK) || rush.has(k))); // sprints are flat out
          // The line's depth is one decision for all its defenders (PR A): it moves together at the line's pace, and
          // only their sideways movement is left to each body.
          if (isDef(k) && !staging) { nk.x = p.x + (g.tx - p.x) * (1 - Math.exp((-dt * lineTop * sprint) / tau)); nk.vx = (nk.x - p.x) / Math.max(1, dt); }
          g.vx = nk.vx; g.vy = nk.vy;
          a.pos[side][k] = { x: nk.x, y: nk.y };
          const vmax = (T.VMAX * B.top * sprint) / tau, sp1 = Math.hypot(nk.vx, nk.vy);
          g.spr = !staging && !keeperOut && sprint > T.SPRINT && sp1 > 0.6 * vmax;
          g.tank = g.spr ? Math.max(0, g.tank - (T.DRAIN * dt) / scale / B.tank) : Math.min(1, g.tank + (T.REFILL * dt) / scale);
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
      // The officials (officials.ts): the referee on his diagonal, each assistant level with his half's offside line.
      {
        const lastDef = ([0, 1] as const).map((sd) => {
          const xs = onPitch(mm, sd).map((k) => a.pos[sd][k]?.x).filter((x): x is number => x !== undefined).sort((p, q) => (sd === 0 ? p - q : q - p));
          return xs[1] ?? (sd === 0 ? 0 : L);
        }) as [number, number];
        const rv = a.off.review, reviewing = !!rv && a.clock >= rv.from && a.clock < rv.until;
        a.downs = a.downs.filter((d) => a.time < d.until);
        const wh = a.off.whistle && a.time < a.off.whistle.until ? a.off.whistle.at : undefined;
        moveOfficials(a.off, officialTargets(a.ball, a.poss, lastDef, reviewing, wh), dt, a.secMs ?? scale / 60, !!a.snap);
      }
      a.snap = false; // a cut lasts one frame
}
