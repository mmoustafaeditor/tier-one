// Live 2D pitch (light "pitchside glass" turf since v0.13). Players move continuously (every animation frame) towards positions that follow their role and
// whether their team has the ball. Since engine v2 the ball follows the engine's own path for the minute (m.flow): the
// zone each contest happened in, who won it, who shot. The zone the ball is in glows in the colour of the side on it.
// Presentation only: nothing here decides anything (the score and stats come from the event log).
import { useEffect, useRef } from 'react';
import type { LiveMatch } from '../sim/match';
import { FORMATIONS } from '../sim/tactics';
import type { World } from '../sim/world';
import { L, W } from './pitch/move';
import { downIn, newAnim, setPitchDebug, tick, type Anim } from './pitch/sim';
import type { HlMode } from '../sim/highlights';

const PITCH_DEBUG = typeof location !== 'undefined' && /[?&]pitchdebug\b/.test(location.search);
setPitchDebug(PITCH_DEBUG);

const rgb = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const near = (a: string, b: string) => { const [p, q] = [rgb(a), rgb(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 140; };
// Numbers in black or white, whichever reads better on the shirt.
const ink = (hex: string) => { const [r, g, b] = rgb(hex); return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#111' : '#fff'; };
// The away side changes shirt when both kits look alike (secondary colour, else white, else black).
export function awayKit(home: string, a: [string, string]): string {
  for (const c of [a[0], a[1], '#FFFFFF', '#111111']) if (!near(home, c)) return c;
  return a[1];
}
// Rain or snow falling over the pitch (the match's weather, engine/weather.ts). Fixed drops, moved by CSS.
const DROPS = Array.from({ length: 46 }, (_, i) => ({ x: ((i * 37) % 109) - 2, y: (i * 53) % 70, d: (i * 7) % 10 }));
function Weather({ kind, h }: { kind: number; h: number }) {
  // Heat: a faint warm haze over the pitch. Wind: long thin gusts drifting across it.
  if (kind === 4) return <rect className="g-wx heat" x="-2" y="0" width={L + 4} height={h} aria-hidden="true" />;
  if (kind === 3) return <g className="g-wx wind" aria-hidden="true">{DROPS.slice(0, 12).map((p, i) => <path key={i} d={`M${p.x} ${(p.y * h) / 70}h7`} style={{ animationDelay: `${-p.d * 0.35}s` }} />)}</g>;
  const snow = kind === 5, n = kind === 2 ? 46 : snow ? 30 : 26;
  return (
    <g className={`g-wx ${snow ? 'snow' : 'rain'}`} aria-hidden="true">
      {DROPS.slice(0, n).map((p, i) => snow
        ? <circle key={i} cx={p.x} cy={(p.y * h) / 70} r=".45" style={{ animationDelay: `${-p.d * 0.4}s` }} />
        : <path key={i} d={`M${p.x} ${(p.y * h) / 70}l-.8 2.4`} style={{ animationDelay: `${-p.d * 0.09}s` }} />)}
    </g>
  );
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

export function Pitch2D({ m, world, msPerMinute, running, goalWord = 'GOAL', camera = 0, mode, scale }: { m: LiveMatch; world: World; msPerMinute: number; running: boolean; goalWord?: string; camera?: Camera; mode?: HlMode; scale?: number }) {
  const mRef = useRef(m);
  mRef.current = m;
  const worldRef = useRef(world);
  worldRef.current = world;
  const cfg = useRef({ msPerMinute, running, camera, mode, scale });
  cfg.current = { msPerMinute, running, camera, mode, scale };
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
  const hurtRef = useRef<SVGGElement | null>(null);
  const netRef = useRef<SVGTextElement | null>(null);
  const anim = useRef<Anim | null>(null);

  const colors = m.sides.map((s) => world.clubs.find((c) => c.id === s.clubId)!.colors);
  const kit = [colors[0][0], awayKit(colors[0][0], colors[1] as [string, string])];
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const numbers = m.sides.map((s) => s.onPitch.map((id) => (id ? world.players.find((p) => p.id === id)?.shirtNumber ?? '' : '')));

  if (!anim.current) anim.current = newAnim(m, world);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      const a = anim.current!;
      const mm = mRef.current;
      if (PITCH_DEBUG) (window as unknown as { __gafferPitch?: unknown }).__gafferPitch = { a, slots: mm.sides.map((sd) => FORMATIONS[sd.tactics.formation].slots.map((x) => x.pos)), pressing: mm.sides.map((sd) => sd.tactics.pressing) };
      const { msPerMinute: ms, running: go, camera: cam, mode: md, scale: sc } = cfg.current;
      tick(a, mm, worldRef.current, dt, ms, go, md, sc ?? ms);
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
          const on = !!mm.sides[side].onPitch[k] || downIn(a, side, k);
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
      // A player down injured: the medic's cross over him.
      if (hurtRef.current) {
        const hp = a.hurt && a.time < a.hurt.until ? a.pos[a.hurt.side][a.hurt.slot] : null;
        hurtRef.current.setAttribute('opacity', hp ? '1' : '0');
        if (hp) { const [hx, hy, hs] = pr(fx(hp.x), hp.y); hurtRef.current.setAttribute('transform', `translate(${hx.toFixed(2)} ${(hy - 3.6 * hs).toFixed(2)}) scale(${hs.toFixed(3)})`); }
      }
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
      {!!m.wx && <Weather kind={m.wx} h={vh} />}
      <g ref={hurtRef} className="g-hurt" opacity="0"><rect x="-1.3" y="-1.3" width="2.6" height="2.6" rx=".5" fill="#fff" stroke="#c62828" strokeWidth=".25" /><path d="M-.35 -.95h.7v.6h.6v.7h-.6v.6h-.7v-.6h-.6v-.7h.6z" fill="#d32f2f" /></g>
      <g ref={flagRef} className="g-flag" opacity="0"><path d="M0 0V-4.2" stroke="#222" strokeWidth=".35" /><path d="M0 -4.2h2.6l-.5 1 .5 1H0z" fill="#ffd400" stroke="#7a6400" strokeWidth=".15" /></g>
      <text ref={netRef} className="g-goal" x={L / 2} y={vh / 2 + 4} textAnchor="middle" opacity="0">{goalWord}</text>
    </svg>
  );
}
