// Live 2D pitch. Players move continuously (every animation frame) towards positions that follow their role and
// whether their team has the ball; the ball is passed between players, won back by the other side, and shot at goal
// for the chances the engine produced in that minute (goals go in, saves end with the keeper, misses go wide).
// Everything is seeded by the match minute, so the same match always looks the same.
import { useEffect, useRef } from 'react';
import type { LiveMatch, MatchEvent } from '../sim/match';
import { rngFor } from '../sim/match';
import { FORMATIONS, type Tactics } from '../sim/tactics';
import type { Position } from '../model/types';
import type { World } from '../sim/world';

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
  | { kind: 'pass'; side: 0 | 1; to: number }
  | { kind: 'turnover'; side: 0 | 1 }
  | { kind: 'shot'; side: 0 | 1; shooter: number; result: 'goal' | 'save' | 'miss' }
  | { kind: 'kickoff'; side: 0 | 1 };

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
  minute: number;
  time: number;
}

const L = 105, W = 68;
const LINE: Record<Position, 'gk' | 'def' | 'mid' | 'fwd'> = {
  GK: 'gk', CB: 'def', LB: 'def', RB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'fwd', RW: 'fwd', ST: 'fwd',
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const toX = (side: 0 | 1, depth: number) => (side === 0 ? depth : L - depth);
const depthOf = (side: 0 | 1, x: number) => (side === 0 ? x : L - x);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// Where a player wants to be right now.
function target(m: LiveMatch, a: Anim, side: 0 | 1, k: number): Pt {
  const s = m.sides[side];
  const slot = FORMATIONS[s.tactics.formation].slots[k];
  const t: Tactics = s.tactics;
  const pos = slot.pos, line = LINE[pos];
  const has = a.poss === side;
  const ballDepth = depthOf(side, a.ball.x);          // how far up the pitch the ball is, from this side's goal
  const sy = side === 0 ? slot.x : 100 - slot.x;      // this side's left is the top of the screen when attacking right
  let y = 3 + sy * 0.62;
  let d = 4 + slot.y * 0.5;
  if (line === 'gk') d = has ? 7 : 4;
  else if (has) {
    // The whole team moves up with the ball; forwards lead, defenders hold a line behind.
    d += clamp((ballDepth - 35) * 0.6, 0, 30) + { def: 6, mid: 12, fwd: 18, gk: 0 }[line];
    y += (a.ball.y - y) * 0.12;
    if ((pos === 'LB' || pos === 'RB') && t.fullback === 1) { d += 12; y = y < W / 2 ? 5 : W - 5; }
    if ((pos === 'LB' || pos === 'RB') && t.fullback === 2) { d += 4; y += (W / 2 - y) * 0.45; }
    if (pos === 'LW' || pos === 'RW') y += ((y < W / 2 ? 4 : W - 4) - y) * 0.7;
    if (pos === 'ST' && t.striker === 2) d -= 14;
    if (pos === 'ST' && t.striker === 1) d += 4;
  } else {
    // Out of possession: a compact block that follows the ball, higher or deeper with the pressing.
    const press = t.pressing === 2 ? 8 : t.pressing === 0 ? -8 : 0;
    d += (ballDepth - 52) * 0.35 + press - (line === 'def' ? 2 : 6);
    y += (a.ball.y - y) * 0.28;
    y += (W / 2 - y) * 0.2;
    if (pos === 'ST' && t.striker === 3) { d += 10; y += (a.ball.y - y) * 0.5; }
  }
  // The player about to shoot makes his run into the box.
  if (a.shooter && a.shooter.side === side && a.shooter.slot === k) { d = 88; y = W / 2 + (sy - 50) * 0.12; }
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

// Plan the passes, turnovers and shots of one match minute.
function plan(a: Anim, m: LiveMatch, msPerMinute: number) {
  const r = rngFor(`${m.key}:anim`, m.minute);
  const beats: Beat[] = [];
  const shots = m.events.filter((e: MatchEvent) => e.min === m.minute && (e.kind === 'goal' || e.kind === 'save' || e.kind === 'miss'));
  let poss = a.poss;
  if (a.inNet) { const side = (1 - a.poss) as 0 | 1; beats.push({ kind: 'kickoff', side }); poss = side; }
  const share = (m.stats[0][0] || 50) / 100;
  const want: 0 | 1 = r() < share ? 0 : 1;
  if (want !== poss) { beats.push({ kind: 'turnover', side: want }); poss = want; }
  const n = Math.max(1, Math.round(msPerMinute / 450));
  const shot = shots[0];
  const passes = Math.max(0, n - (shot ? 2 : 0));
  for (let i = 0; i < passes; i++) {
    if (i > 0 && r() < 0.12) { poss = (1 - poss) as 0 | 1; beats.push({ kind: 'turnover', side: poss }); continue; }
    const ks = onPitch(m, poss);
    beats.push({ kind: 'pass', side: poss, to: ks[Math.floor(r() * ks.length)] });
  }
  if (shot) {
    // A save event belongs to the keeper's side: the shot comes from the other one.
    const side = (shot.kind === 'save' ? 1 - shot.side : shot.side) as 0 | 1;
    const found = shot.kind !== 'save' ? slotOf(m, shot.playerId) : null;
    const shooter = found && found.side === side ? found.slot : forwardSlot(m, side);
    if (side !== poss) beats.push({ kind: 'turnover', side });
    beats.push({ kind: 'pass', side, to: shooter });
    beats.push({ kind: 'shot', side, shooter, result: shot.kind === 'goal' ? 'goal' : shot.kind === 'save' ? 'save' : 'miss' });
    a.shooter = { side, slot: shooter };
  } else a.shooter = null;
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
  if (b.kind === 'kickoff') {
    a.inNet = false;
    a.ball = { x: L / 2, y: W / 2 };
    a.poss = b.side;
    a.carrier = forwardSlot(m, b.side);
    return;
  }
  if (b.kind === 'turnover') {
    // The nearest player of the other side steps in and wins it.
    const ks = onPitch(m, b.side);
    const k = ks.sort((x, y) => dist(a.pos[b.side][x], a.ball) - dist(a.pos[b.side][y], a.ball))[0];
    if (k === undefined) return;
    a.carrier = -1;
    fly(a, a.pos[b.side][k], travel * 0.6, () => { a.poss = b.side; a.carrier = k; });
    return;
  }
  if (b.kind === 'pass') {
    if (b.side !== a.poss || b.to === a.carrier) return;
    const to = a.pos[b.side][b.to];
    a.carrier = -1;
    fly(a, { x: to.x + (b.side === 0 ? 1 : -1), y: to.y }, travel, () => { a.carrier = b.to; });
    return;
  }
  // Shot.
  const goalX = b.side === 0 ? L + 0.8 : -0.8;
  const r = rngFor(`${m.key}:shot`, m.minute);
  a.carrier = -1;
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
function markings(pr: Proj): { pitch: string; stripes: string; lines: string } {
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
  return { pitch: rect(-4, -3, L + 8, W + 6), stripes, lines };
}

export function Pitch2D({ m, world, msPerMinute, running, goalWord = 'GOAL', camera = 0 }: { m: LiveMatch; world: World; msPerMinute: number; running: boolean; goalWord?: string; camera?: Camera }) {
  const mRef = useRef(m);
  mRef.current = m;
  const cfg = useRef({ msPerMinute, running, camera });
  cfg.current = { msPerMinute, running, camera };
  const pitchRef = useRef<SVGPathElement | null>(null);
  const stripeRef = useRef<SVGPathElement | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const layer = useRef<SVGGElement | null>(null);
  const camX = useRef(L / 2);
  const lastMarks = useRef('');
  const dots = useRef<(SVGGElement | null)[][]>([[], []]);
  const ballRef = useRef<SVGGElement | null>(null);
  const netRef = useRef<SVGTextElement | null>(null);
  const anim = useRef<Anim | null>(null);

  const colors = m.sides.map((s) => world.clubs.find((c) => c.id === s.clubId)!.colors);
  const kit = [colors[0][0], awayKit(colors[0][0], colors[1] as [string, string])];
  const numbers = m.sides.map((s) => s.onPitch.map((id) => (id ? world.players.find((p) => p.id === id)?.shirtNumber ?? '' : '')));

  // Start: everyone in position, home side kicks off.
  if (!anim.current) {
    const a: Anim = {
      pos: [[], []], ball: { x: L / 2, y: W / 2 }, poss: 0, carrier: forwardSlot(m, 0), flight: null, beats: [], beat: 0, clock: 0,
      beatLen: 400, inNet: false, shooter: null, minute: -1, time: 0,
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
      if (a.minute !== mm.minute) plan(a, mm, ms);
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
      // Players glide towards where they want to be; the nearest defenders press the ball.
      const ease = 1 - Math.exp(-dt / Math.max(120, ms * 0.9));
      for (const side of [0, 1] as const) {
        const ks = onPitch(mm, side);
        const pressers = a.poss === side ? [] : [...ks].filter((k) => LINE[FORMATIONS[mm.sides[side].tactics.formation].slots[k].pos] !== 'gk')
          .sort((x, y) => dist(a.pos[side][x], a.ball) - dist(a.pos[side][y], a.ball)).slice(0, mm.sides[side].tactics.pressing === 2 ? 2 : 1);
        for (const k of ks) {
          let t = target(mm, a, side, k);
          if (pressers.includes(k)) t = { x: a.ball.x + (side === 0 ? -2.2 : 2.2), y: a.ball.y };
          if (a.poss === side && k === a.carrier) t = { x: t.x * 0.3 + a.pos[side][k].x * 0.7 + (side === 0 ? 0.4 : -0.4), y: t.y * 0.3 + a.pos[side][k].y * 0.7 };
          const wob = Math.sin(a.time / 700 + k * 1.7 + side * 3) * 0.5;
          const p = a.pos[side][k] ?? t;
          a.pos[side][k] = { x: p.x + (t.x - p.x) * ease, y: p.y + (t.y + wob - p.y) * ease };
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
        lastMarks.current = key;
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
    <svg className={`g-pitch2d cam${camera}`} viewBox={`-2 0 ${L + 4} ${vh}`} role="img" aria-label="pitch">
      <rect x="-2" y="0" width={L + 4} height={vh} fill={camera ? '#0b2e1a' : '#14532d'} />
      <path ref={pitchRef} fill="#14532d" />
      <path ref={stripeRef} fill="#166534" />
      <path ref={lineRef} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".4" strokeLinejoin="round" />
      <g ref={layer}>
        {([0, 1] as const).map((side) => m.sides[side].onPitch.map((_, k) => (
          <g key={`${side}-${k}`} ref={(el) => { dots.current[side][k] = el; }} className="g-dot2">
            <circle r="2.3" fill={kit[side]} stroke="#fff" strokeWidth=".45" />
            <text className="g-dot-n" y=".85" textAnchor="middle" fill={ink(kit[side])}>{numbers[side][k]}</text>
          </g>
        )))}
        <g ref={ballRef}><circle r="1.05" fill="#fff" stroke="#111" strokeWidth=".3" /></g>
      </g>
      <text ref={netRef} className="g-goal" x={L / 2} y={vh / 2 + 4} textAnchor="middle" opacity="0">{goalWord}</text>
    </svg>
  );
}
