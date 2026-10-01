// The game's tiny stand-in for the `remotion` package (write once, use twice).
// Scene files in ./scenes import ONLY from this module. In the game it is this file: a frame clock in React context,
// Remotion's interpolate() and spring() maths, <Sequence> and <AbsoluteFill>. In the Remotion project
// (games/tier-one/v3/film) the webpack override in remotion.config.ts swaps this module for the real `remotion`
// package, so the same scene files render to MP4. Keep the exported names and signatures identical to Remotion's.
import { createContext, createElement, useContext, type CSSProperties, type ReactNode } from 'react';

export type VideoConfig = { width: number; height: number; fps: number; durationInFrames: number; id: string; defaultProps: Record<string, unknown>; props: Record<string, unknown> };
type Clock = { frame: number; config: VideoConfig };
const ClockCtx = createContext<Clock>({ frame: 0, config: { width: 1080, height: 1920, fps: 30, durationInFrames: 1, id: 'scene', defaultProps: {}, props: {} } });

/** Game-only: drives useCurrentFrame()/useVideoConfig() below it. The ScenePlayer owns the rAF loop. */
export function FrameProvider({ frame, width, height, fps = 30, durationInFrames, children }: { frame: number; width: number; height: number; fps?: number; durationInFrames: number; children?: ReactNode }) {
  const config: VideoConfig = { width, height, fps, durationInFrames, id: 'scene', defaultProps: {}, props: {} };
  return createElement(ClockCtx.Provider, { value: { frame, config } }, children);
}
export const useCurrentFrame = () => useContext(ClockCtx).frame;
export const useVideoConfig = () => useContext(ClockCtx).config;

// ---------- Easing (the subset of Remotion's Easing the scenes use; same maths)
type EaseFn = (t: number) => number;
function bezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a, B = (a: number, b: number) => 3 * b - 6 * a, C = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  const forX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (calc(t, x1, x2) - x) / s; }
    if (t < 0 || t > 1 || Math.abs(calc(t, x1, x2) - x) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 24; i++) { const v = calc(t, x1, x2); if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
    return t;
  };
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x1 === y1 && x2 === y2 ? x : calc(forX(x), y1, y2));
}
export const Easing = {
  linear: (t: number) => t,
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  sin: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  exp: (t: number) => Math.pow(2, 10 * (t - 1)),
  circle: (t: number) => 1 - Math.sqrt(1 - t * t),
  back: (s = 1.70158) => (t: number) => t * t * ((s + 1) * t - s),
  bezier,
  in: (e: EaseFn) => e,
  out: (e: EaseFn) => (t: number) => 1 - e(1 - t),
  inOut: (e: EaseFn) => (t: number) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
};

// ---------- interpolate (Remotion semantics: monotonic input range, per-segment, extrapolate extend/clamp/identity)
type Extrapolate = 'extend' | 'clamp' | 'identity' | 'wrap';
export type InterpolateOptions = { easing?: EaseFn; extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate };
function seg(input: number, [i0, i1]: [number, number], [o0, o1]: [number, number], o: InterpolateOptions): number {
  let r = input;
  if (r < i0) { const e = o.extrapolateLeft || 'extend'; if (e === 'identity') return r; if (e === 'clamp') r = i0; else if (e === 'wrap') r = i0 + (((r - i0) % (i1 - i0)) + (i1 - i0)) % (i1 - i0); }
  if (r > i1) { const e = o.extrapolateRight || 'extend'; if (e === 'identity') return r; if (e === 'clamp') r = i1; else if (e === 'wrap') r = i0 + ((r - i0) % (i1 - i0)); }
  if (o0 === o1) return o0;
  r = i1 === i0 ? (r > i0 ? 1 : 0) : (r - i0) / (i1 - i0);
  r = (o.easing || Easing.linear)(r);
  return o0 + r * (o1 - o0);
}
export function interpolate(input: number, inputRange: readonly number[], outputRange: readonly number[], options: InterpolateOptions = {}): number {
  if (inputRange.length !== outputRange.length || inputRange.length < 2) throw new Error('interpolate: ranges must match and have 2+ values');
  let k = 1;
  for (; k < inputRange.length - 1; k++) if (inputRange[k] >= input) break;
  return seg(input, [inputRange[k - 1], inputRange[k]], [outputRange[k - 1], outputRange[k]], options);
}

// ---------- spring (Remotion's physics: same integrator, same defaults)
export type SpringConfig = { damping: number; mass: number; stiffness: number; overshootClamping: boolean };
type Anim = { lastTimestamp: number; current: number; toValue: number; velocity: number };
const DEF: SpringConfig = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false };
function advance(a: Anim, now: number, c: SpringConfig): Anim {
  const dt = Math.min(now - a.lastTimestamp, 64), t = dt / 1000;
  const v0 = -a.velocity, x0 = a.toValue - a.current;
  const zeta = c.damping / (2 * Math.sqrt(c.stiffness * c.mass)), w0 = Math.sqrt(c.stiffness / c.mass), w1 = w0 * Math.sqrt(1 - zeta * zeta);
  if (zeta < 1) {
    const env = Math.exp(-zeta * w0 * t), sin = Math.sin(w1 * t), cos = Math.cos(w1 * t);
    const frag = env * (sin * ((v0 + zeta * w0 * x0) / w1) + x0 * cos);
    return { lastTimestamp: now, toValue: a.toValue, current: a.toValue - frag, velocity: zeta * w0 * frag - env * (cos * (v0 + zeta * w0 * x0) - w1 * x0 * sin) };
  }
  const env = Math.exp(-w0 * t);
  return { lastTimestamp: now, toValue: a.toValue, current: a.toValue - env * (x0 + (v0 + w0 * x0) * t), velocity: env * (v0 * (t * w0 - 1) + t * x0 * w0 * w0) };
}
function calc(frame: number, fps: number, c: SpringConfig): Anim {
  let a: Anim = { lastTimestamp: 0, current: 0, toValue: 1, velocity: 0 };
  const f = Math.max(0, frame), whole = Math.floor(f), rest = f % 1;
  for (let i = 0; i <= whole; i++) a = advance(a, ((i === whole ? i + rest : i) / fps) * 1000, c);
  return a;
}
export function measureSpring({ fps, config = {}, threshold = 0.005 }: { fps: number; config?: Partial<SpringConfig>; threshold?: number }): number {
  const c = { ...DEF, ...config };
  let frame = 0, done = 0, diff = Math.abs(calc(0, fps, c).current - 1);
  while (diff >= threshold && frame < 6000) { frame++; diff = Math.abs(calc(frame, fps, c).current - 1); }
  done = frame;
  for (let i = 0; i < 20; i++) { frame++; diff = Math.abs(calc(frame, fps, c).current - 1); if (diff >= threshold) { i = 0; done = frame + 1; } }
  return done;
}
export function spring({ frame, fps, config = {}, from = 0, to = 1, delay = 0, durationInFrames, reverse = false }: { frame: number; fps: number; config?: Partial<SpringConfig>; from?: number; to?: number; delay?: number; durationInFrames?: number; reverse?: boolean }): number {
  const c = { ...DEF, ...config };
  let f = frame - delay;
  if (durationInFrames != null) { const nat = measureSpring({ fps, config: c }); if (reverse) f = durationInFrames - f; f = (f / durationInFrames) * nat; }
  else if (reverse) f = -f;
  if (f < 0 && !reverse) return from;
  let v = calc(f, fps, c).current;
  if (c.overshootClamping) v = Math.min(v, 1);
  return from + v * (to - from);
}

// ---------- layout primitives
const FILL: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' };
export function AbsoluteFill({ style, className, children }: { style?: CSSProperties; className?: string; children?: ReactNode }) {
  return createElement('div', { className, style: { ...FILL, ...style } }, children);
}
/** Children see frame − from; nothing renders outside [from, from + durationInFrames). */
export function Sequence({ from = 0, durationInFrames = Infinity, layout = 'absolute-fill', style, children }: { from?: number; durationInFrames?: number; layout?: 'absolute-fill' | 'none'; style?: CSSProperties; name?: string; premountFor?: number; children?: ReactNode }) {
  const clock = useContext(ClockCtx);
  const local = clock.frame - from;
  if (local < 0 || local >= durationInFrames) return null;
  const inner = createElement(ClockCtx.Provider, { value: { frame: local, config: clock.config } }, children);
  return layout === 'none' ? inner : createElement('div', { style: { ...FILL, ...style } }, inner);
}
