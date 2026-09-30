// The world kit for "the newsroom after dark" (GOTY.md §10): objects, places, paper, ink, light, type and weather.
// Never a person, a hand, a silhouette or a face. Every piece here is a pure function of its props, so the same
// drawing serves the ambient loop (CSS-animated, `live`), the pick-up beat and the call film (frame-driven).
// World units: 1600×900, the floor at y 780, the action inside x 400–1200 so a phone's portrait crop keeps it.
import { createContext, useContext, type ReactNode } from 'react';
import { EASE, k01, noise } from '../../kit';
import { spring } from '../../remotion-shim';

export type Col = { c1: string; c2: string };
export const INK = '#15130F', PAPER = '#F4EFE4', PAPER2 = '#E9E2D3', RED = '#FF5A36', GOLD = '#F7B928';
export const FLOOR = 780;
export const F_COND = '"Archivo","IBM Plex Sans Arabic","Arial Narrow",sans-serif';
export const F_MONO = '"IBM Plex Mono","IBM Plex Sans Arabic",ui-monospace,monospace';
export const F_DISPLAY = '"Newsreader","Noto Naskh Arabic",Georgia,serif';

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const cl = (x: number) => Math.max(0, Math.min(1, x));
/** 0→1 between frames a and b (eased in-out by default). */
export const k = (f: number, a: number, b: number, e = EASE.inOut) => k01(f, a, b, e);
/** A settle: an overshooting spring from frame `at` (0 before). */
export const settle = (f: number, at: number, cfg = { damping: 12, stiffness: 170, mass: 0.9 }) => (f < at ? 0 : spring({ frame: f - at, fps: 30, config: cfg }));
/** A pulse that decays after `at` (1 at the hit, 0 after ~`len` frames). */
export const hit = (f: number, at: number, len = 10) => (f < at ? 0 : Math.exp(-(f - at) / (len / 3)));
/** A throw along an arc from (x0,y0) to (x1,y1), height h, at t 0..1. */
export const arc = (t: number, x0: number, y0: number, x1: number, y1: number, h: number) => ({ x: lerp(x0, x1, t), y: lerp(y0, y1, t) - 4 * h * t * (1 - t) });
/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const rnd = (i: number, seed = 0) => { const s = Math.sin(i * 127.1 + seed * 311.7 + 1.3) * 43758.5453; return s - Math.floor(s); };
export { noise };

/** World mirror (−1 in RTL): type counter-flips so it stays readable. */
export const MirrorCtx = createContext(1);
/** Live (CSS-animated loop) vs frame-driven film: in a loop, animated parts carry a class instead of a frame transform. */
export const LiveCtx = createContext(false);
export const useLive = () => useContext(LiveCtx);
/** Class for a CSS-animated part in a loop; nothing in a film. */
export const live = (on: boolean, cls: string) => (on ? 'lp ' + cls : undefined);

/** Type that stays readable when the world is mirrored (RTL). */
export function MText({ x, y, children, size = 30, fill = PAPER, weight = 900, font = F_COND, anchor = 'middle', stretch = '72%', spacing, opacity }: { x: number; y: number; children: ReactNode; size?: number; fill?: string; weight?: number; font?: string; anchor?: 'start' | 'middle' | 'end'; stretch?: string; spacing?: string; opacity?: number }) {
  const m = useContext(MirrorCtx);
  return <g transform={`translate(${x} ${y}) scale(${m} 1)`} opacity={opacity}><text textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill} letterSpacing={spacing} style={{ fontFamily: font, fontStretch: stretch }}>{children}</text></g>;
}

// ---------- light
/** Gradient defs for the glows a set uses (one per colour; ids are colour-derived so duplicates are harmless). */
export const glowId = (col: string) => 'gw' + col.replace(/[^0-9a-z]/gi, '');
export function Glows({ cols }: { cols: string[] }) {
  const seen = new Set<string>();
  return <defs>{cols.filter((c) => !seen.has(c) && seen.add(c)).map((c) => <radialGradient key={c} id={glowId(c)} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={c} stopOpacity="1" /><stop offset="0.45" stopColor={c} stopOpacity="0.38" /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient>)}</defs>;
}
/** A bloom of light: an ellipse of the colour's glow gradient. Cheap (no filters). */
export function Glow({ x, y, r, ry, col, o = 1, className }: { x: number; y: number; r: number; ry?: number; col: string; o?: number; className?: string }) {
  if (o <= 0.005) return null;
  return <ellipse className={className} cx={x} cy={y} rx={r} ry={ry ?? r} fill={`url(#${glowId(col)})`} opacity={o} style={className ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined} />;
}
/** A cone of light from a lamp head to the floor. */
export function Cone({ x, y, w0, w1, h, col, o = 0.08 }: { x: number; y: number; w0: number; w1: number; h: number; col: string; o?: number }) {
  return <path d={`M${x - w0} ${y} L${x + w0} ${y} L${x + w1} ${y + h} L${x - w1} ${y + h} Z`} fill={col} opacity={o} />;
}
/** Dust in a beam: slow, deterministic; in a loop the group drifts by CSS. */
export function Motes({ f, x, y, w, h, n = 14, seed = 1, col = 'rgba(255,225,170,.55)' }: { f: number; x: number; y: number; w: number; h: number; n?: number; seed?: number; col?: string }) {
  const on = useLive();
  return <g className={live(on, 'lp-motes')}>{Array.from({ length: n }, (_, i) => {
    const bx = x + rnd(i, seed) * w, by = y + rnd(i, seed + 3) * h;
    const dx = on ? 0 : noise(f / 45 + i, seed) * 30, dy = on ? 0 : noise(f / 55 + i * 2, seed + 1) * 22 - (f * 0.35) % h;
    return <circle key={i} cx={bx + dx} cy={by + dy} r={1.6 + (i % 3)} fill={col} opacity={0.3 + 0.5 * rnd(i, seed + 9)} />;
  })}</g>;
}
/** Rain on glass: streaks in a clip. In a loop the group scrolls by CSS. */
export function Rain({ f, x, y, w, h, n = 26, seed = 2, col = 'rgba(200,220,255,.28)', slant = 8 }: { f: number; x: number; y: number; w: number; h: number; n?: number; seed?: number; col?: string; slant?: number }) {
  const on = useLive();
  return <g className={live(on, 'lp-rain')}>{Array.from({ length: n }, (_, i) => {
    const rx = x + rnd(i, seed) * w, len = 30 + rnd(i, seed + 1) * 70, sp = 14 + rnd(i, seed + 2) * 10;
    const ry = on ? y + rnd(i, seed + 3) * h : y + ((rnd(i, seed + 3) * h + f * sp) % (h + len)) - len;
    return <line key={i} x1={rx} y1={ry} x2={rx - slant * (len / 60)} y2={ry + len} stroke={col} strokeWidth={1.5 + (i % 2)} strokeLinecap="round" />;
  })}</g>;
}

// ---------- the city (the window out of every set)
/** A skyline band with lit windows. `lit` 0..1 is how many windows are on; `wave` (0..1) lights them in a sweep from the left. */
export function City({ x, y, w, h, seed = 5, lit = 0.35, wave = -1, cols = ['#0A1024', '#0E1630', '#12193A'], win = '#FFD58A', n = 11, f = 0 }: { x: number; y: number; w: number; h: number; seed?: number; lit?: number; wave?: number; cols?: string[]; win?: string; n?: number; f?: number }) {
  const on = useLive();
  const bw = w / n;
  return <g>
    {Array.from({ length: n }, (_, i) => {
      const bh = h * (0.35 + rnd(i, seed) * 0.65), bx = x + i * bw, by = y + h - bh;
      const cols3 = cols[i % cols.length];
      const rows = Math.max(1, Math.floor(bh / 22)), colsN = Math.max(1, Math.floor((bw - 10) / 16));
      return <g key={i}>
        <rect x={bx + 2} y={by} width={bw - 4} height={bh} fill={cols3} />
        {i % 3 === 0 && <rect x={bx + bw * 0.4} y={by - 18} width={4} height={18} fill={cols3} />}
        {Array.from({ length: Math.min(rows * colsN, 28) }, (_, j) => {
          const r = Math.floor(j / colsN), c = j % colsN;
          const wx = bx + 7 + c * 16, wy = by + 8 + r * 22;
          const p = rnd(j + i * 31, seed + 7);
          const isOn = wave >= 0 ? p < cl((wave * (w + 300) - (wx - x)) / 220) : p < lit;
          const flick = on ? 1 : 0.8 + 0.2 * (noise(f / 40 + j + i, seed) > 0.6 ? 0 : 1);
          return isOn ? <rect key={j} className={live(on && j % 5 === 0, 'lp-win')} x={wx} y={wy} width={8} height={11} fill={win} opacity={0.55 * flick + 0.25 * p} /> : null;
        })}
      </g>;
    })}
  </g>;
}
/** Venetian blinds over a window box; `open` 0..1 tilts the slats (1 = light pours through). */
export function Blinds({ x, y, w, h, open = 0.4, col = '#1C1813', n = 12 }: { x: number; y: number; w: number; h: number; open?: number; col?: string; n?: number }) {
  const gap = h / n, slat = gap * (1 - open * 0.8);
  return <g>{Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * gap} width={w} height={Math.max(2, slat)} fill={col} />)}</g>;
}

// ---------- objects
/** A club crest: a shield in the club's two colours. */
export function Shield({ x, y, s = 1, c, rot = 0, o = 1 }: { x: number; y: number; s?: number; c: Col; rot?: number; o?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <path d="M-30 -34 H30 V2 Q30 30 0 44 Q-30 30 -30 2 Z" fill={c.c1} stroke={c.c2} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-18 -10 L0 8 L18 -10" fill="none" stroke={c.c2} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
  </g>;
}
/**
 * The phone on the set: a slab lying on a surface, seen from above-ish. `lit` 0..1 lights the screen in `col`; a lit
 * phone also throws its light on the surface. `buzz` (frame) makes it shiver on the surface while it rings.
 */
export function Phone({ x, y, rot = 0, s = 1, lit = 0, col = '#9FD8FF', buzz = 0, className }: { x: number; y: number; rot?: number; s?: number; lit?: number; col?: string; buzz?: number; className?: string }) {
  const sh = buzz > 0 ? Math.sin(buzz * 3.1) * 2.2 * buzz : 0;
  return <g className={className} transform={`translate(${x + sh} ${y}) rotate(${rot + sh * 0.6}) scale(${s})`} style={className ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined}>
    {lit > 0.02 && <Glow x={0} y={0} r={140} ry={95} col={col} o={0.55 * lit} />}
    <rect x={-34} y={-66} width={68} height={132} rx={12} fill="#0A0A0C" />
    <rect x={-34} y={-66} width={68} height={132} rx={12} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={2} />
    <rect x={-29} y={-59} width={58} height={118} rx={7} fill={col} opacity={0.08 + 0.92 * lit} />
    {lit > 0.3 && <g opacity={lit}>
      <circle cx={0} cy={-18} r={13} fill="rgba(255,255,255,.85)" />
      <rect x={-20} y={4} width={40} height={6} rx={3} fill="rgba(255,255,255,.75)" />
      <rect x={-14} y={16} width={28} height={5} rx={2.5} fill="rgba(255,255,255,.45)" />
      <path d="M-9 44 a9 9 0 0 1 18 0" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} strokeLinecap="round" />
    </g>}
    <rect x={-10} y={-64} width={20} height={3} rx={1.5} fill="#1E1E24" />
  </g>;
}
/**
 * A wall calendar: red header with the month, a grid, one day ringed. `flip` 0..1 tears the page off (it lifts from
 * the bottom, folds up and flies away) and shows next month in red ink underneath. Months come from Intl (no strings).
 */
export function Calendar({ x, y, s = 1, flip = 0, month, next, ring = 0.6, acc = '#C9381A', glow = 0 }: { x: number; y: number; s?: number; flip?: number; month: string; next: string; ring?: number; acc?: string; glow?: number }) {
  const W = 150, H = 176;
  const fold = cl(flip / 0.55), fly = cl((flip - 0.55) / 0.45);
  const page = (m: string, top: boolean) => <g>
    <rect x={0} y={0} width={W} height={H} fill={top ? PAPER : '#FFF3EC'} stroke="rgba(0,0,0,.25)" strokeWidth={1.5} />
    <rect x={0} y={0} width={W} height={34} fill={top ? acc : '#FF3B1E'} />
    <MText x={W / 2} y={25} size={22} fill={PAPER} spacing=".08em">{m.toUpperCase()}</MText>
    {Array.from({ length: 21 }, (_, i) => <rect key={i} x={12 + (i % 7) * 18.5} y={48 + Math.floor(i / 7) * 30} width={13} height={13} rx={1} fill={top ? '#CFC6B3' : '#F0C1B4'} opacity={0.8} />)}
    {[0, 1].map((r) => <rect key={r} x={12} y={140 + r * 14} width={W - 24} height={4} fill={top ? '#CFC6B3' : '#F0C1B4'} />)}
  </g>;
  const lifted = fold > 0 ? -Math.sin(fold * Math.PI / 2) * 14 : 0;
  return <g transform={`translate(${x - W / 2} ${y - H / 2}) scale(${s})`}>
    <rect x={-4} y={-6} width={W + 8} height={H + 8} fill="#2A231B" />
    <circle cx={W / 2} cy={-8} r={5} fill="#6E6A60" />
    {glow > 0 && <Glow x={W / 2} y={H / 2} r={190} ry={200} col="#FF6A48" o={glow * 0.8} />}
    {page(next, false)}
    {ring > 0 && flip > 0.5 && <circle cx={12 + 4 * 18.5 + 6.5} cy={48 + 30 + 6.5} r={16 * cl((flip - 0.6) / 0.3)} fill="none" stroke="#FF3B1E" strokeWidth={5} strokeDasharray={110} strokeDashoffset={110 * (1 - cl((flip - 0.6) / 0.4))} transform={`rotate(-90 ${12 + 4 * 18.5 + 6.5} ${48 + 30 + 6.5})`} />}
    {fly < 1 && <g transform={`translate(${fly * 90} ${-fly * 260 + lifted}) rotate(${-fold * 8 - fly * 70})`} opacity={1 - fly * 0.9}>
      <g transform={`translate(0 ${H * (1 - fold * 0.92) * 0}) scale(1 ${1 - fold * 0.92})`}>{page(month, true)}</g>
      {ring > 0 && flip < 0.5 && <circle cx={12 + 2 * 18.5 + 6.5} cy={48 + 6.5} r={14} fill="none" stroke={acc} strokeWidth={4} opacity={0.9} transform={`scale(1 ${1 - fold * 0.92})`} />}
    </g>}
  </g>;
}
/** A scarf in club colours: striped, with fringes; `drape` 0 flat, 1 hanging (over a chair or a rail). */
export function Scarf({ x, y, c, rot = 0, s = 1, drape = 0, o = 1 }: { x: number; y: number; c: Col; rot?: number; s?: number; drape?: number; o?: number }) {
  const bend = 26 * drape;
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <path d={`M-120 -14 Q0 ${-14 + bend} 120 -14 L120 14 Q0 ${14 + bend} -120 14 Z`} fill={c.c1} />
    {[-96, -64, -32, 0, 32, 64, 96].map((d, i) => i % 2 === 0 ? <path key={d} d={`M${d - 10} ${-14 + bend * (1 - (d / 120) ** 2)} h20 v28 h-20 z`} fill={c.c2} /> : null)}
    {[-118, -110, -102, 102, 110, 118].map((d) => <line key={d} x1={d} y1={14} x2={d + (d < 0 ? -4 : 4)} y2={36} stroke={c.c1} strokeWidth={3} strokeLinecap="round" />)}
  </g>;
}
/** A luggage/bag tag on a string: the club's crest on a card. `swing` degrees. */
export function Tag({ x, y, c, swing = 0, s = 1, len = 40, o = 1 }: { x: number; y: number; c: Col; swing?: number; s?: number; len?: number; o?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${swing}) scale(${s})`} opacity={o}>
    <line x1={0} y1={0} x2={0} y2={len} stroke="#C9C2B0" strokeWidth={2.5} />
    <path d={`M-30 ${len} L30 ${len} L30 ${len + 78} L-30 ${len + 78} Z`} fill={PAPER} stroke="rgba(0,0,0,.3)" strokeWidth={1.5} />
    <rect x={-30} y={len} width={60} height={10} fill={c.c1} /><rect x={-30} y={len + 10} width={60} height={5} fill={c.c2} />
    <Shield x={0} y={len + 46} s={0.55} c={c} />
  </g>;
}
/** A shirt on a hanger in club colours with a number. */
export function Shirt({ x, y, c, no, s = 1, rot = 0, className }: { x: number; y: number; c: Col; no?: string; s?: number; rot?: number; className?: string }) {
  return <g className={className} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} style={className ? { transformBox: 'fill-box', transformOrigin: '50% 0' } : undefined}>
    <path d="M0 0 V-14 Q0 -22 8 -22" fill="none" stroke="#B9AE98" strokeWidth={3} />
    <path d="M-46 22 L0 2 L46 22" fill="none" stroke="#8A7348" strokeWidth={5} />
    <path d="M-30 12 L-64 32 L-52 64 L-38 58 V150 H38 V58 L52 64 L64 32 L30 12 C24 24 12 28 0 28 S-24 24 -30 12 Z" fill={c.c1} />
    <path d="M-30 12 C-24 24 -12 28 0 28 S24 24 30 12" fill="none" stroke={c.c2} strokeWidth={4} />
    {no && <MText x={0} y={112} size={52} fill={c.c2}>{no}</MText>}
  </g>;
}
/** A kit bag on a bench (or a car seat). */
export function Bag({ x, y, s = 1, col = '#2C2F36', o = 1 }: { x: number; y: number; s?: number; col?: string; o?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <path d="M-50 -40 Q0 -90 50 -40" fill="none" stroke="#15130F" strokeWidth={9} />
    <rect x={-90} y={-44} width={180} height={80} rx={30} fill={col} />
    <rect x={-90} y={-12} width={180} height={8} fill="rgba(255,255,255,.12)" />
    <rect x={-40} y={-44} width={80} height={80} fill="rgba(0,0,0,.18)" />
  </g>;
}
/**
 * The rumour: a newspaper with the buying club's crest on the front. `crumple` 0..1 screws it into a ball (the crest
 * still shows at first, then it's just paper). Drawn flat (rot 0) or thrown (rot spins).
 */
export function Newspaper({ x, y, c, rot = 0, s = 1, crumple = 0, o = 1 }: { x: number; y: number; c: Col; rot?: number; s?: number; crumple?: number; o?: number }) {
  const W = 150, H = 110;
  if (crumple <= 0) return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={PAPER2} stroke="rgba(0,0,0,.28)" strokeWidth={1.5} />
    <rect x={-W / 2 + 10} y={-H / 2 + 10} width={W - 20} height={18} fill={INK} />
    <rect x={-W / 2 + 10} y={-H / 2 + 36} width={70} height={6} fill="#4A443A" /><rect x={-W / 2 + 10} y={-H / 2 + 48} width={70} height={6} fill="#4A443A" /><rect x={-W / 2 + 10} y={-H / 2 + 60} width={60} height={6} fill="#4A443A" /><rect x={-W / 2 + 10} y={-H / 2 + 72} width={66} height={6} fill="#4A443A" /><rect x={-W / 2 + 10} y={-H / 2 + 84} width={50} height={6} fill="#4A443A" />
    <Shield x={W / 2 - 38} y={12} s={0.72} c={c} />
  </g>;
  const r = lerp(70, 34, crumple), sq = 1 - crumple * 0.35;
  return <g transform={`translate(${x} ${y}) rotate(${rot + crumple * 60}) scale(${s})`} opacity={o}>
    {crumple < 0.55 && <g transform={`scale(${1 - crumple * 1.4} ${1 - crumple * 1.1})`} opacity={1 - crumple / 0.55}>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={PAPER2} /><rect x={-W / 2 + 10} y={-H / 2 + 10} width={W - 20} height={18} fill={INK} /><Shield x={W / 2 - 38} y={12} s={0.72} c={c} />
    </g>}
    <path d={`M${-r} ${-r * 0.3 * sq} L${-r * 0.5} ${-r} L${r * 0.3} ${-r * 0.8} L${r} ${-r * 0.2} L${r * 0.8} ${r * 0.6} L${r * 0.1} ${r} L${-r * 0.7} ${r * 0.7} Z`} fill="#D6CEBC" stroke="rgba(0,0,0,.25)" strokeWidth={2} opacity={cl(crumple * 2)} />
    <path d={`M${-r * 0.6} ${-r * 0.2} l${r * 0.5} ${r * 0.3} l${r * 0.4} ${-r * 0.5} M${-r * 0.2} ${r * 0.5} l${r * 0.6} ${-r * 0.2} M${-r * 0.4} ${-r * 0.6} l${r * 0.3} ${r * 0.4}`} stroke="rgba(0,0,0,.3)" strokeWidth={2} fill="none" opacity={crumple} />
    {crumple < 0.85 && <Shield x={r * 0.25} y={-r * 0.1} s={0.5 * (1 - crumple * 0.5)} c={c} o={1 - crumple} />}
  </g>;
}
/** A waste-paper bin; `hitAt` rattles it (a frame). */
export function Bin({ x, y = FLOOR, s = 1, f = 0, hitAt = -1, col = '#3A3F48' }: { x: number; y?: number; s?: number; f?: number; hitAt?: number; col?: string }) {
  const h = hitAt >= 0 ? hit(f, hitAt, 12) : 0;
  return <g transform={`translate(${x} ${y}) rotate(${Math.sin((f - hitAt) * 1.6) * 5 * h}) scale(${s})`}>
    <path d="M-40 -104 H40 L33 0 H-33 Z" fill={col} />
    <path d="M-44 -108 H44 V-98 H-44 Z" fill="#5E646E" />
    {[-20, 0, 20].map((d) => <line key={d} x1={d} y1={-96} x2={d * 0.85} y2={-8} stroke="rgba(0,0,0,.35)" strokeWidth={5} />)}
    <ellipse cx={0} cy={2} rx={44} ry={7} fill="rgba(0,0,0,.35)" />
  </g>;
}
/** A paper cup of coffee with steam (steam scrolls by CSS in a loop). */
export function Coffee({ x, y, s = 1, f = 0, col = PAPER2 }: { x: number; y: number; s?: number; f?: number; col?: string }) {
  const on = useLive();
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className={live(on, 'lp-steam')} opacity={0.5}>
      {[0, 1].map((i) => <path key={i} d={`M${-12 + i * 22} -6 q${on ? 8 : 9 * Math.sin(f / 7 + i)} -26 0 -50 q${on ? -8 : -9 * Math.sin(f / 8 + i)} -24 0 -48`} stroke={PAPER} strokeOpacity={0.35} strokeWidth={5} fill="none" strokeLinecap="round" />)}
    </g>
    <path d="M-26 0 H26 L20 60 H-20 Z" fill={col} /><rect x={-28} y={-6} width={56} height={10} rx={3} fill="#5A3A1E" /><rect x={-22} y={20} width={44} height={16} fill="#C9381A" opacity=".85" />
  </g>;
}
/** A desk lamp: an arm, a shade, a bulb; `on` 0..1 lights it (with its pool on the desk drawn by the set). */
export function Lamp({ x, y, on = 1, s = 1, flip = false, col = '#FFC873' }: { x: number; y: number; on?: number; s?: number; flip?: boolean; col?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <ellipse cx={0} cy={0} rx={44} ry={10} fill="#26211A" />
    <path d="M0 0 L-30 -150 L60 -230" stroke="#3A342A" strokeWidth={10} fill="none" strokeLinecap="round" />
    <path d="M30 -250 L120 -220 L96 -172 L14 -204 Z" fill="#3A342A" />
    <ellipse cx={104} cy={-196} rx={26} ry={9} fill={col} opacity={0.15 + 0.85 * on} transform="rotate(20 104 -196)" />
    {on > 0.02 && <Glow x={112} y={-190} r={90} col={col} o={0.6 * on} />}
  </g>;
}
/** A flap-board cell (departures board): letters flip in a loop by CSS; in a film `flip` 0..1 turns from a → b. */
export function Flap({ x, y, w = 34, h = 46, a, b, flip = 0, fill = '#1A1B20', ink = '#F4EFE4', className, size = 30 }: { x: number; y: number; w?: number; h?: number; a: string; b: string; flip?: number; fill?: string; ink?: string; className?: string; size?: number }) {
  const top = flip < 0.5, sy = top ? 1 - flip * 2 : (flip - 0.5) * 2;
  return <g transform={`translate(${x} ${y})`} className={className}>
    <rect x={0} y={0} width={w} height={h} rx={3} fill={fill} />
    <g transform={`translate(0 ${h / 2}) scale(1 ${Math.max(0.04, sy)}) translate(0 ${-h / 2})`}>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={3} fill="#24252B" />
      <MText x={w / 2} y={h * 0.72} size={size} fill={ink} font={F_MONO} stretch="100%" weight={700}>{top ? a : b}</MText>
    </g>
    <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#0A0A0C" strokeWidth={2} />
  </g>;
}
/** A pennant in club colours (pinned on a wall, hanging from a mirror). */
export function Pennant({ x, y, c, s = 1, rot = 0, o = 1 }: { x: number; y: number; c: Col; s?: number; rot?: number; o?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <path d="M-30 0 H30 L0 90 Z" fill={c.c1} stroke={c.c2} strokeWidth={4} strokeLinejoin="round" />
    <path d="M-16 14 H16" stroke={c.c2} strokeWidth={5} strokeLinecap="round" />
  </g>;
}
/** A contract: a sheet with a crest, lines and a signature line; `sign` 0..1 draws the signature in ink. */
export function Contract({ x, y, c, rot = 0, s = 1, sign = 0, o = 1, void_ = 0 }: { x: number; y: number; c: Col; rot?: number; s?: number; sign?: number; o?: number; void_?: number }) {
  const W = 150, H = 200;
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={PAPER} stroke="rgba(0,0,0,.3)" strokeWidth={1.5} />
    <Shield x={0} y={-H / 2 + 36} s={0.6} c={c} />
    {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={-W / 2 + 16} y={-H / 2 + 76 + i * 14} width={W - 32 - (i % 3) * 22} height={4} fill="#8A8272" />)}
    <line x1={-W / 2 + 16} y1={H / 2 - 24} x2={W / 2 - 16} y2={H / 2 - 24} stroke="#4A443A" strokeWidth={2} />
    {sign > 0 && <path d={`M${-W / 2 + 22} ${H / 2 - 30} q10 -22 18 0 t18 -6 t16 4 t18 -10 t14 6`} fill="none" stroke="#1B3A8A" strokeWidth={3.5} strokeLinecap="round" strokeDasharray={140} strokeDashoffset={140 * (1 - sign)} />}
    {void_ > 0 && <g opacity={cl(void_ * 3)} transform={`rotate(-14) scale(${lerp(1.8, 1, cl(void_))})`}><rect x={-58} y={-22} width={116} height={44} rx={6} fill="none" stroke="#FF3B1E" strokeWidth={6} /><line x1={-52} y1={0} x2={52} y2={0} stroke="#FF3B1E" strokeWidth={8} /></g>}
  </g>;
}
/** An envelope; `seal` 0..1 stamps the club's crest wax onto the flap. */
export function Envelope({ x, y, c, rot = 0, s = 1, seal = 0, o = 1, open = 0 }: { x: number; y: number; c?: Col; rot?: number; s?: number; seal?: number; o?: number; open?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
    <rect x={-90} y={-56} width={180} height={112} rx={4} fill="#D9B77A" />
    <path d="M-90 -56 L0 6 L90 -56" fill="none" stroke="#A8864A" strokeWidth={3} />
    <path d={`M-90 -56 L0 ${6 - open * 90} L90 -56`} fill="#E3C48C" stroke="#A8864A" strokeWidth={3} />
    {c && seal > 0 && <g transform={`scale(${lerp(1.6, 1, cl(seal))})`} opacity={cl(seal * 2)}><circle cx={0} cy={0} r={26} fill={c.c1} stroke={c.c2} strokeWidth={4} /><path d="M-12 -6 L0 6 L12 -6" fill="none" stroke={c.c2} strokeWidth={5} strokeLinecap="round" /></g>}
  </g>;
}
/** A camera flash / lightning: a white sheet that decays after `at`. */
export function Flash({ f, at, o = 0.7, col = '#fff' }: { f: number; at: number; o?: number; col?: string }) {
  const h = hit(f, at, 7);
  return h > 0.02 ? <rect x={-2000} y={-2000} width={6000} height={6000} fill={col} opacity={h * o} /> : null;
}
