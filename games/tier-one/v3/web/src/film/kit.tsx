// The film kit: the Tier One paper-and-ink world as frame-driven pieces, shared by every scene.
// Everything is a pure function of the frame (no timers, no CSS animation), so the game player and Remotion's renderer
// draw identical frames. Imports only from the shim (swapped for `remotion` in the film project) and React.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from './remotion-shim';

// ---------- the look (HYBRID.md §2 tokens, copied so the film project needs no game CSS)
export const C = {
  desk: '#17140F', desk2: '#211D17', desk3: '#2C271F', night: '#0B0A08',
  paper: '#F4EFE4', paper2: '#E9E2D3', paper3: '#DCD5C5', ink: '#15130F', ink2: '#4A443A', ink3: '#7E7769',
  red: '#FF5A36', redDeep: '#C9381A', gold: '#F7B928', goldDeep: '#B8830B', done: '#2FBF71', lamp: '#FFC873',
};
export const SRC_C: Record<string, string> = { kitman: '#2FBF71', barber: '#FF9A1F', agent: '#F7B928', spotter: '#35C3E6', physio: '#FF5A7A' };
export const SOURCES = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
export const F = {
  display: '"Newsreader", "Noto Naskh Arabic", Georgia, serif',
  text: '"Schibsted Grotesk", "IBM Plex Sans Arabic", "Helvetica Neue", Arial, sans-serif',
  cond: '"Archivo", "IBM Plex Sans Arabic", "Arial Narrow", sans-serif',
  mono: '"IBM Plex Mono", "IBM Plex Sans Arabic", ui-monospace, monospace',
};
// 24px line icons (same paths as ui/game.tsx, copied so scenes don't pull the game's save/sound modules).
export const ICON: Record<string, string> = {
  kitman: 'M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',
  barber: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9L20 20M8.1 16.1L20 4',
  agent: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8V5h6v3M4 13h16',
  spotter: 'M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4l8 2z',
  physio: 'M3 12h4l2-5 4 10 2-5h6',
  reply: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z',
  repost: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  heart: 'M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.2 0 5.5 3 4.4 6.2C19.5 15.4 12 20 12 20z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
};
export function Glyph({ n, size = 48, color = 'currentColor', w = 2 }: { n: string; size?: number; color?: string; w?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[n] || ICON.phone} /></svg>;
}

// ---------- timing helpers
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const EASE = { out: Easing.bezier(0.16, 1, 0.3, 1), inOut: Easing.bezier(0.65, 0, 0.35, 1), in: Easing.bezier(0.7, 0, 0.84, 0) };
/** 0→1 between frames a and b (clamped, eased). */
export const k01 = (f: number, a: number, b: number, e = EASE.out) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });
/** A stamp or a slapped sheet: overshooting spring that starts at frame `at`. */
export const slam = (f: number, fps: number, at: number, cfg = { damping: 11, stiffness: 240, mass: 0.8 }) => spring({ frame: f - at, fps, config: cfg });
/** Smooth deterministic noise in [-1, 1] (lamp flicker, handheld drift). */
export function noise(x: number, seed = 0) {
  const h = (n: number) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const i = Math.floor(x), t = x - i, u = t * t * (3 - 2 * t);
  return h(i) * (1 - u) + h(i + 1) * u;
}
/** Camera shake: each hit kicks, then decays over ~8 frames. */
export function shake(f: number, hits: number[], amp = 14) {
  let x = 0, y = 0, r = 0;
  for (const h of hits) {
    const d = f - h; if (d < 0 || d > 14) continue;
    const e = Math.exp(-d / 3.2) * amp;
    x += Math.sin(d * 2.7 + h) * e; y += Math.cos(d * 3.1 + h * 0.7) * e; r += Math.sin(d * 2.2 + h) * e * 0.04;
  }
  return { x, y, r };
}

// ---------- the stage
export function useStage() {
  const f = useCurrentFrame();
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  return { f, W, H, fps, dur: durationInFrames, P: H > W };
}
export type Key = { f: number; x: number; y: number; z: number };
/** Camera position at frame f from keyframes (eased between each pair). */
export function camAt(f: number, keys: Key[]): Key {
  let i = 0; while (i < keys.length - 2 && f >= keys[i + 1].f) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const t = b.f === a.f ? 1 : interpolate(f, [a.f, b.f], [0, 1], { ...clamp, easing: EASE.inOut });
  return { f, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
/** One parallax plane of the world. depth 1 = the desk; < 1 is further away (moves less), > 1 is foreground. */
export function Layer({ cam, depth = 1, style, children }: { cam: Key; depth?: number; style?: CSSProperties; children?: ReactNode }) {
  const { W, H } = useStage();
  const s = cam.z * (Math.min(W, H) / 1080) * (1 + (depth - 1) * 0.5);
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: `translate(${W / 2}px, ${H / 2}px) scale(${s}) translate(${-cam.x * depth}px, ${-cam.y * depth}px)`, ...style }}>{children}</div>;
}
/** Position a world object by its centre. */
export function At({ x, y, w, h, rot = 0, scale = 1, z, style, children }: { x: number; y: number; w: number; h: number; rot?: number; scale?: number; z?: number; style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg) scale(${scale})`, zIndex: z, ...style }}>{children}</div>;
}

// ---------- surfaces
/** The desk: dark wood grain, drawn with gradients (no images). */
export function DeskSurface({ x = -3000, y = -700, w = 6000, h = 4000 }: { x?: number; y?: number; w?: number; h?: number }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: `repeating-linear-gradient(92deg, rgba(255,255,255,.018) 0 3px, transparent 3px 22px, rgba(0,0,0,.14) 22px 24px, transparent 24px 61px), linear-gradient(180deg, ${C.desk3}, ${C.desk2} 30%, ${C.desk})`, boxShadow: '0 -30px 60px rgba(0,0,0,.6)' }} />;
}
/** A sheet of newsprint. `lift` 0 = resting on the desk, 1 = held high above it (bigger, softer shadow). */
export function Paper({ lift = 0, tone = C.paper, style, children }: { lift?: number; tone?: string; style?: CSSProperties; children?: ReactNode }) {
  const o = 6 + lift * 60, b = 10 + lift * 70;
  return <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.35), transparent 60%), repeating-linear-gradient(0deg, rgba(0,0,0,.018) 0 1px, transparent 1px 4px), ${tone}`, color: C.ink, boxShadow: `0 ${o}px ${b}px rgba(0,0,0,${0.55 - lift * 0.2}), 0 1px 0 rgba(255,255,255,.4) inset`, borderRadius: 3, overflow: 'hidden', ...style }}>{children}</div>;
}
/** A rubber stamp. Slams in at `at` (overshoot from big and faint to set, inky), in the stamp face of the game. */
export function Stamp({ text, color, at, size = 64, rot = -8, border = 0.09, style }: { text: string; color: string; at: number; size?: number; rot?: number; border?: number; style?: CSSProperties }) {
  const { f, fps } = useStage();
  if (f < at) return null;
  const s = slam(f, fps, at);
  return <div style={{ display: 'inline-block', padding: `${size * 0.12}px ${size * 0.3}px ${size * 0.06}px`, border: `${Math.max(3, size * border)}px solid ${color}`, borderRadius: size * 0.12, color, fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', transform: `rotate(${rot}deg) scale(${interpolate(s, [0, 1], [2.6, 1])})`, opacity: interpolate(s, [0, 0.5], [0, 1], clamp), WebkitMaskImage: GRAIN_MASK, maskImage: GRAIN_MASK, WebkitMaskSize: '180px', maskSize: '180px', ...style }}>{text}</div>;
}
const GRAIN_MASK = 'radial-gradient(circle at 20% 30%, #000 0 60%, rgba(0,0,0,.82) 61%), repeating-radial-gradient(circle at 70% 60%, #000 0 3px, rgba(0,0,0,.78) 4px 5px)';

/**
 * Typesetting: letters drop in one by one like metal sorts (Latin/Cyrillic), or the line is inked in by a wipe for
 * connected scripts (Arabic must never be split into letters), right to left. The text's script decides, not the UI
 * direction, so a Latin byline in the Arabic game still sets left to right. `cpf` = characters per frame.
 */
export function Typeset({ text, at, cpf = 0.6, style }: { text: string; at: number; cpf?: number; rtl?: boolean; style?: CSSProperties }) {
  const { f } = useStage();
  const chars = Array.from(text);
  const n = Math.max(0, (f - at) * cpf);
  if (f < at) return <span style={{ ...style, visibility: 'hidden' }}>{text}</span>;
  if (/[؀-ۿ]/.test(text)) {
    const p = Math.min(1, n / Math.max(1, chars.length));
    return <span style={{ display: 'inline-block', clipPath: `inset(-20% 0 -20% ${100 - p * 100}%)`, ...style }}>{text}</span>;
  }
  // Words stay whole (no line break inside a word); each letter is its own sort.
  // Letter sorts are inline-blocks, which bidi treats as neutral: isolate the Latin line LTR so an RTL page can't reverse it.
  let i = 0;
  return <span style={{ ...style, direction: 'ltr', unicodeBidi: 'isolate' }}>{text.split(/(\s+)/).map((w, wi) => {
    if (/^\s+$/.test(w)) { i += Array.from(w).length; return w; }
    return <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{Array.from(w).map((ch) => {
      const t = interpolate(n - i++, [0, 1.6], [0, 1], clamp);
      return <span key={i} style={{ display: 'inline-block', opacity: t > 0 ? 1 : 0, transform: `translateY(${(1 - t) * -0.35}em) scale(${1 + (1 - t) * 0.5})`, filter: t < 1 ? `blur(${(1 - t) * 3}px)` : undefined }}>{ch}</span>;
    })}</span>;
  })}</span>;
}

// ---------- the film look: grain, vignette, a light that breathes
let grainURL = '';
function grainTile() {
  if (grainURL || typeof document === 'undefined') return grainURL;
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 160;
    const x = cv.getContext('2d')!; const img = x.createImageData(160, 160);
    let s = 1234567; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 28; }
    x.putImageData(img, 0, 0); grainURL = cv.toDataURL();
  } catch { /* no canvas: no grain */ }
  return grainURL;
}
export function FilmLook({ vignette = 0.75, grain = true }: { vignette?: number; grain?: boolean }) {
  const { f } = useStage();
  const g = grain ? grainTile() : '';
  return <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50 }}>
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(0,0,0,${vignette}) 100%)` }} />
    {g && <AbsoluteFill style={{ backgroundImage: `url(${g})`, backgroundPosition: `${(f * 73) % 160}px ${(f * 37) % 160}px`, mixBlendMode: 'overlay', opacity: 0.9 }} />}
  </AbsoluteFill>;
}
/** Dust motes drifting through a light: a foreground layer, blurred, deterministic. */
export function Motes({ n = 18, w = 1600, h = 1400, seed = 1, color = 'rgba(255,220,160,.5)' }: { n?: number; w?: number; h?: number; seed?: number; color?: string }) {
  const { f } = useStage();
  return <>{Array.from({ length: n }, (_, i) => {
    const bx = (((i * 7919 + seed * 131) % 1000) / 1000 - 0.5) * w, by = (((i * 104729 + seed * 71) % 1000) / 1000 - 0.5) * h;
    const r = 3 + (i % 5) * 2;
    return <i key={i} style={{ position: 'absolute', left: bx + noise(f / 50 + i, seed) * 60, top: by + noise(f / 60 + i * 3, seed + 1) * 50 - f * 0.4, width: r, height: r, borderRadius: '50%', background: color, filter: `blur(${1 + (i % 3)}px)`, opacity: 0.35 + 0.35 * noise(f / 20 + i, 9) }} />;
  })}</>;
}
