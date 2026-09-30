// The world the motion pieces are built from (GOTY.md §10.1, "the newsroom after dark"): objects, places, paper, ink,
// light, type and weather. Never a person, a hand or a face. Every drawing is a pure function of its props (the frame
// comes in from useStage), drawn with CSS and SVG so the game and the Remotion project draw identical frames.
// Motion rules: only transform and opacity animate on big surfaces (gradients and masks stay static strings), so a
// mid-range phone holds 60 fps. World units: 1 unit = 1 px at camera z = 1 on a 1080-wide stage (kit.tsx Layer).
import type { CSSProperties, ReactNode } from 'react';
import { interpolate, spring } from './remotion-shim';
import { C, F, At, Paper, Stamp, Typeset, clamp, k01, noise, useStage, EASE } from './kit';

// ---------- light
/** The desk lamp (its head at the top right of the box). `on` 0..1 lights the bulb and its glow. */
export function Lamp({ x = -430, y = -560, on = 1, flip = false }: { x?: number; y?: number; on?: number; flip?: boolean }) {
  return <At x={x} y={y} w={420} h={520} style={{ pointerEvents: 'none', transform: flip ? 'scaleX(-1)' : undefined }}>
    <svg viewBox="0 0 420 520" width={420} height={520} style={{ overflow: 'visible' }} aria-hidden="true">
      <ellipse cx="110" cy="490" rx="100" ry="26" fill="#0B0A08" />
      <path d="M110 480 L150 250 L300 150" stroke="#3A342A" strokeWidth="18" fill="none" strokeLinecap="round" />
      <circle cx="150" cy="250" r="14" fill="#4A443A" />
      <path d="M250 90 L380 150 L330 250 L200 190 Z" fill="#2C271F" stroke="#4A443A" strokeWidth="4" />
      <ellipse cx="300" cy="225" rx="60" ry="22" transform="rotate(25 300 225)" fill="rgba(255,214,140,1)" opacity={0.15 + on * 0.85} />
      <ellipse cx="300" cy="225" rx="120" ry="60" transform="rotate(25 300 225)" fill="rgba(255,200,115,.55)" opacity={on} style={{ filter: 'blur(28px)' }} />
    </svg>
  </At>;
}
/** The dark, with one static hole where a light falls (the mask never changes: only `level` animates). */
export function Night({ x = -40, y = -140, r = 1150, level = 1, tint = 'rgba(6,5,4,.93)' }: { x?: number; y?: number; r?: number; level?: number; tint?: string }) {
  const m = `radial-gradient(circle ${r}px at ${x + 3000}px ${y + 3000}px, transparent 0, rgba(0,0,0,.25) 40%, #000 100%)`;
  return <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, pointerEvents: 'none', background: tint, WebkitMaskImage: m, maskImage: m, opacity: level }} />;
}
/** Total dark (the lamp is off). */
export const Black = ({ level }: { level: number }) => <div style={{ position: 'absolute', left: -3000, top: -3000, width: 6000, height: 6000, pointerEvents: 'none', background: '#050403', opacity: level }} />;
/** A pool of coloured light on a surface: static gradient, animated by opacity and scale. */
export function Glow({ x, y, r = 500, color = 'rgba(255,200,115,.3)', on = 1, blend = 'screen' }: { x: number; y: number; r?: number; color?: string; on?: number; blend?: CSSProperties['mixBlendMode'] }) {
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${color}, transparent 68%)`, mixBlendMode: blend, opacity: on, transform: `scale(${0.6 + on * 0.4})`, pointerEvents: 'none' }} />;
}
/** Headlights sweeping across a wall: a wedge of light that rotates around its source. */
export function Sweep({ x, y, angle, color = 'rgba(255,236,190,.5)', len = 2600, spread = 22, on = 1 }: { x: number; y: number; angle: number; color?: string; len?: number; spread?: number; on?: number }) {
  return <div style={{ position: 'absolute', left: x, top: y - len * 0.5, width: len, height: len, transformOrigin: '0 50%', transform: `rotate(${angle}deg)`, opacity: on, pointerEvents: 'none', background: `linear-gradient(90deg, ${color}, transparent 80%)`, clipPath: `polygon(0 50%, 100% ${50 - spread}%, 100% ${50 + spread}%)`, mixBlendMode: 'screen' }} />;
}
/** Rain on glass: two static layers of streaks sliding down (transform only). */
export function Rain({ w = 2400, h = 2000, speed = 26, opacity = 0.35 }: { w?: number; h?: number; speed?: number; opacity?: number }) {
  const { f } = useStage();
  return <>{[0, 1].map((k) => <div key={k} style={{ position: 'absolute', left: -w / 2, top: -h / 2 - 400, width: w, height: h + 800, opacity: opacity * (k ? 0.6 : 1), pointerEvents: 'none', backgroundImage: `repeating-linear-gradient(${k ? 78 : 82}deg, transparent 0 ${k ? 37 : 23}px, rgba(200,220,255,.35) ${k ? 37 : 23}px ${k ? 39 : 25}px, transparent ${k ? 39 : 25}px ${k ? 90 : 61}px)`, backgroundSize: `${k ? 90 : 61}px ${k ? 190 : 140}px`, transform: `translateY(${((f * speed * (k ? 0.7 : 1)) % (k ? 190 : 140))}px)`, WebkitMaskImage: 'linear-gradient(180deg, #000 0 80%, transparent)', maskImage: 'linear-gradient(180deg, #000 0 80%, transparent)' }} />)}</>;
}

// ---------- type on things
/** An LED wall clock or counter: red digits with glow (the newsroom clock). */
export function Led({ text, size = 120, color = C.red, dim = false, style }: { text: string; size?: number; color?: string; dim?: boolean; style?: CSSProperties }) {
  return <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: '.06em', color: dim ? 'rgba(255,90,54,.18)' : color, textShadow: dim ? 'none' : `0 0 ${size * 0.25}px ${color}, 0 0 ${size * 0.6}px rgba(255,90,54,.45)`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', direction: 'ltr', unicodeBidi: 'isolate', ...style }}>{text}</span>;
}
/** A split-flap board line. `at` is the frame the line flips from `from` to `text`: each card flips in turn. */
export function Flap({ text, from = '', at = -1, size = 56, w, color = C.paper, bg = '#15130F', per = 1.2, len = 24 }: { text: string; from?: string; at?: number; size?: number; w?: number; color?: string; bg?: string; per?: number; len?: number }) {
  const { f } = useStage();
  const a = Array.from(text.padEnd(len).slice(0, len)), b = Array.from(from.padEnd(len).slice(0, len));
  const cw = w || size * 0.72;
  return <span style={{ display: 'inline-flex', gap: Math.round(size * 0.07), direction: 'ltr', unicodeBidi: 'isolate' }}>{a.map((ch, i) => {
    const t0 = at + i * per, p = at < 0 ? 1 : k01(f, t0, t0 + 6, EASE.inOut);
    const half = p < 0.5, s = Math.abs(Math.cos(p * Math.PI));
    return <span key={i} style={{ width: cw, height: size * 1.3, borderRadius: size * 0.08, background: bg, color, fontFamily: F.cond, fontStretch: '80%', fontWeight: 800, fontSize: size, lineHeight: `${size * 1.3}px`, textAlign: 'center', textTransform: 'uppercase', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)', transform: `scaleY(${p >= 1 || at < 0 ? 1 : Math.max(0.06, s)})`, position: 'relative', overflow: 'hidden' }}>
      {half ? b[i] : ch}<i style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,.7)' }} />
    </span>;
  })}</span>;
}
/** A TV ticker: a strip of the accent colour and the line scrolling through it. */
export function Ticker({ text, w, h = 70, speed = 9, accent = C.red, label, rtl }: { text: string; w: number; h?: number; speed?: number; accent?: string; label?: string; rtl?: boolean }) {
  const { f } = useStage();
  const x = (f * speed) % (w + 1600);
  return <div style={{ width: w, height: h, background: C.ink, color: C.paper, display: 'flex', alignItems: 'stretch', overflow: 'hidden', fontFamily: F.mono, fontSize: h * 0.42 }}>
    {label && <span style={{ flex: 'none', background: accent, color: C.paper, display: 'grid', placeItems: 'center', padding: `0 ${h * 0.3}px`, fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, letterSpacing: '.08em', fontSize: h * 0.5, zIndex: 1 }}>{label}</span>}
    <span style={{ flex: 1, position: 'relative', overflow: 'hidden' }}><span style={{ position: 'absolute', top: 0, height: '100%', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', left: 0, transform: `translateX(${rtl ? x - 1600 : w - x}px)` }}>{Array(3).fill(text).join('   ·   ')}</span></span>
  </div>;
}
/** A text cursor, blinking on the 30 fps grid (12 on, 12 off). */
export const Cursor = ({ h = 60, w = 8, color = C.ink, phase = 0 }: { h?: number; w?: number; color?: string; phase?: number }) => {
  const { f } = useStage();
  return <span style={{ display: 'inline-block', width: w, height: h, background: color, verticalAlign: 'text-bottom', marginInlineStart: 6, opacity: Math.floor((f + phase) / 12) % 2 ? 0 : 1 }} />;
};
/** A big number rolling from `from` to `to` (followers, points), with thousands separators. */
export function Roll({ from, to, at, dur = 40, style }: { from: number; to: number; at: number; dur?: number; style?: CSSProperties }) {
  const { f } = useStage();
  const n = Math.round(interpolate(f, [at, at + dur], [from, to], { ...clamp, easing: EASE.out }));
  return <span style={{ fontVariantNumeric: 'tabular-nums', direction: 'ltr', unicodeBidi: 'isolate', ...style }}>{n.toLocaleString('en')}</span>;
}

// ---------- objects
/** A phone on the desk. `on` 0..1 lights the screen; `buzz` shakes it. The screen is whatever you put in it. */
export function Phone({ x, y, w = 300, h = 620, rot = 0, on = 0, buzz = 0, accent = C.paper, z, children }: { x: number; y: number; w?: number; h?: number; rot?: number; on?: number; buzz?: number; accent?: string; z?: number; children?: ReactNode }) {
  const { f } = useStage();
  const bx = buzz ? noise(f * 3.3, 4) * 8 * buzz : 0, by = buzz ? noise(f * 2.9, 5) * 5 * buzz : 0;
  return <At x={x + bx} y={y + by} w={w} h={h} rot={rot + (buzz ? noise(f * 3.1, 6) * 1.5 * buzz : 0)} z={z}>
    <div style={{ position: 'absolute', left: -w * 0.6, top: -h * 0.25, width: w * 2.2, height: h * 1.5, borderRadius: '50%', background: `radial-gradient(ellipse, ${accent === C.paper ? 'rgba(220,230,255,.35)' : accent + '66'}, transparent 60%)`, opacity: on, pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.16, background: '#0A0A0C', boxShadow: '0 20px 40px rgba(0,0,0,.6), inset 0 0 0 3px #26262C' }} />
    <div style={{ position: 'absolute', inset: w * 0.045, borderRadius: w * 0.12, background: '#050507', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #14151C, #0B0B10)', opacity: on }} />
      <div style={{ position: 'absolute', inset: 0, opacity: on, color: C.paper, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <i style={{ position: 'absolute', left: '50%', top: w * 0.05, width: w * 0.28, height: w * 0.07, marginLeft: -w * 0.14, borderRadius: 99, background: '#0A0A0C' }} />
    </div>
  </At>;
}
/** A caller screen: the caller's name, a line under it, and the two answer pills. */
export function CallScreen({ name, sub, accent = C.done, at, w = 300 }: { name: string; sub: string; accent?: string; at: number; w?: number }) {
  const { f } = useStage();
  const p = k01(f, at, at + 8);
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: w * 0.06, padding: w * 0.1, textAlign: 'center', transform: `translateY(${(1 - p) * 30}px)` }}>
    <span style={{ width: w * 0.36, height: w * 0.36, borderRadius: '50%', background: '#2A2B33', boxShadow: `0 0 0 ${3 + 4 * Math.abs(Math.sin(f / 4))}px rgba(255,255,255,.08)` }} />
    <b style={{ fontFamily: F.text, fontWeight: 800, fontSize: w * 0.11, lineHeight: 1.1, direction: 'ltr' }}>{name}</b>
    <span style={{ fontFamily: F.mono, fontSize: w * 0.065, color: '#9EA0AC' }}>{sub}</span>
    <span style={{ marginTop: w * 0.16, display: 'flex', gap: w * 0.14 }}><i style={{ width: w * 0.2, height: w * 0.2, borderRadius: '50%', background: C.redDeep }} /><i style={{ width: w * 0.2, height: w * 0.2, borderRadius: '50%', background: accent, transform: `scale(${1 + 0.08 * Math.sin(f / 3)})` }} /></span>
  </div>;
}
/** A message on the phone: the sender line and the bubble. */
export function MessageScreen({ from, text, at, w = 300, accent = C.red }: { from: string; text: string; at: number; w?: number; accent?: string }) {
  const { f } = useStage();
  const p = spring({ frame: f - at, fps: 30, config: { damping: 14, stiffness: 180 } });
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: w * 0.05, padding: `${w * 0.28}px ${w * 0.08}px 0` }}>
    <span style={{ fontFamily: F.mono, fontSize: w * 0.06, color: '#9EA0AC', letterSpacing: '.06em', textTransform: 'uppercase', opacity: k01(f, at - 4, at) }}>{from}</span>
    <span style={{ alignSelf: 'flex-start', maxWidth: '92%', background: '#2A2B33', borderRadius: w * 0.07, padding: `${w * 0.05}px ${w * 0.07}px`, fontFamily: F.text, fontSize: w * 0.085, lineHeight: 1.25, transform: `scale(${0.6 + 0.4 * p}) translateY(${(1 - p) * 30}px)`, transformOrigin: '0 100%', opacity: Math.min(1, p * 2), boxShadow: `0 0 30px ${accent}55` }}>{text}</span>
  </div>;
}
/** A laptop, screen facing us. `lid` 1 = open, 0 = slammed shut. Whatever you put inside is on the screen. */
export function Laptop({ x, y, w = 900, lid = 1, glow = 1, z, children }: { x: number; y: number; w?: number; lid?: number; glow?: number; z?: number; children?: ReactNode }) {
  const h = w * 0.62, base = w * 0.06;
  const ang = interpolate(lid, [0, 1], [-88, 0], clamp);
  return <At x={x} y={y} w={w} h={h + base} z={z} style={{ perspective: 2400, perspectiveOrigin: '50% 100%' }}>
    <div style={{ position: 'absolute', left: -w * 0.04, bottom: 0, width: w * 1.08, height: base, borderRadius: `${base * 0.2}px ${base * 0.2}px ${base}px ${base}px`, background: 'linear-gradient(180deg, #4A4C55, #2A2B31)', boxShadow: '0 20px 40px rgba(0,0,0,.6)' }} />
    <div style={{ position: 'absolute', left: 0, bottom: base, width: w, height: h, transformOrigin: '50% 100%', transform: `rotateX(${ang}deg)`, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.02, background: '#1B1C22', boxShadow: `0 0 0 ${w * 0.012}px #2E2F37` }} />
      <div style={{ position: 'absolute', inset: w * 0.022, background: '#0A0B10', overflow: 'hidden', borderRadius: w * 0.006 }}>
        <div style={{ position: 'absolute', inset: 0, opacity: glow * Math.min(1, lid * 2), display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    </div>
    <div style={{ position: 'absolute', left: -w * 0.3, top: h * 0.2, width: w * 1.6, height: h * 1.3, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(200,215,255,.22), transparent 60%)', opacity: glow * lid, pointerEvents: 'none' }} />
  </At>;
}
/** A blog composer on a screen: masthead, the post's headline typing, a cursor. */
export function Composer({ masthead, headline, at, cpf = 1.2, w = 900, accent = C.red, rtl, children }: { masthead: string; headline: string; at: number; cpf?: number; w?: number; accent?: string; rtl?: boolean; children?: ReactNode }) {
  return <div style={{ flex: 1, background: C.paper, color: C.ink, display: 'flex', flexDirection: 'column', direction: rtl ? 'rtl' : 'ltr' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: w * 0.02, padding: `${w * 0.018}px ${w * 0.03}px`, borderBottom: `${w * 0.006}px solid ${C.ink}` }}>
      <i style={{ width: w * 0.03, height: w * 0.03, background: accent, borderRadius: 3 }} /><b style={{ fontFamily: F.display, fontWeight: 800, fontSize: w * 0.04 }}>{masthead}</b>
      <span style={{ marginInlineStart: 'auto', display: 'flex', gap: w * 0.01 }}>{[0, 1, 2].map((k) => <i key={k} style={{ width: w * 0.06, height: w * 0.018, background: C.paper3, borderRadius: 2 }} />)}</span>
    </div>
    <div style={{ padding: `${w * 0.035}px ${w * 0.04}px 0`, fontFamily: F.display, fontWeight: 800, fontSize: w * 0.066, lineHeight: 1.06, letterSpacing: '-.02em' }}><Typeset text={headline} at={at} cpf={cpf} />{headline && <Cursor h={w * 0.06} w={w * 0.008} />}</div>
    {children}
  </div>;
}
/** An empty cardboard box, flaps open. */
export function Box({ x, y, w = 520, rot = 0, z, label }: { x: number; y: number; w?: number; rot?: number; z?: number; label?: string }) {
  const h = w * 0.62;
  return <At x={x} y={y} w={w} h={h} rot={rot} z={z}>
    <svg viewBox="0 0 520 320" width={w} height={h} style={{ overflow: 'visible' }} aria-hidden="true">
      <path d="M40 120L90 300H430L480 120Z" fill="#7A5A36" stroke="#3A2A16" strokeWidth="6" strokeLinejoin="round" />
      <path d="M60 120L120 180H400L460 120Z" fill="#4A3620" />
      <path d="M40 120L-40 60L140 40L90 120Z" fill="#9A7448" stroke="#3A2A16" strokeWidth="6" strokeLinejoin="round" />
      <path d="M480 120L560 60L380 40L430 120Z" fill="#9A7448" stroke="#3A2A16" strokeWidth="6" strokeLinejoin="round" />
      <path d="M90 120L140 40H380L430 120Z" fill="#5C4227" stroke="#3A2A16" strokeWidth="6" strokeLinejoin="round" />
      <path d="M150 300L170 215H350L370 300" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="14" />
      {label && <text x="260" y="262" textAnchor="middle" fontFamily='"IBM Plex Mono", monospace' fontSize="30" fill="#3A2A16" letterSpacing="4">{label}</text>}
    </svg>
  </At>;
}
/** A press pass on its lanyard: byline, rank, the stamp. The game's identity object (Home's press pass). */
export function PressPass({ w = 620, byline, tier, kicker, press, stamp, stampAt, accent = C.gold, big = false, nameAt = -1, rtl }: { w?: number; byline: string; tier: string; kicker: string; press: string; stamp?: string; stampAt?: number; accent?: string; big?: boolean; nameAt?: number; rtl?: boolean }) {
  const h = w * 1.42;
  const gold = big ? `linear-gradient(135deg, #FFE08A, ${accent} 45%, ${C.goldDeep})` : accent;
  return <div style={{ position: 'relative', width: w, height: h, direction: rtl ? 'rtl' : 'ltr' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.05, background: gold, padding: w * 0.022, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }}>
      <div style={{ position: 'relative', height: '100%', borderRadius: w * 0.035, background: C.paper, color: C.ink, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: w * 0.035, padding: `${w * 0.07} ${w * 0.06}px`, boxSizing: 'border-box', textAlign: 'center' }}>
        <i style={{ marginTop: w * 0.05, width: w * 0.24, height: w * 0.05, borderRadius: 99, background: C.paper3, border: `${w * 0.006}px solid ${C.ink3}` }} />
        <span style={{ fontFamily: F.cond, fontStretch: '72%', fontWeight: 900, fontSize: w * 0.15, letterSpacing: '.16em', lineHeight: 1, background: C.ink, color: accent, padding: `${w * 0.015}px ${w * 0.05}px` }}>{press}</span>
        <div style={{ width: w * 0.36, height: w * 0.36, borderRadius: '50%', background: C.ink, color: accent, display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 800, fontSize: w * 0.2, border: `${w * 0.016}px solid ${accent}` }}>{Array.from(byline)[0] || '?'}</div>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: w * 0.11, lineHeight: 1.05, maxWidth: '100%', overflowWrap: 'anywhere' }}>{nameAt >= 0 ? <Typeset text={byline} at={nameAt} cpf={0.9} /> : byline}</div>
        <div style={{ fontFamily: F.mono, fontSize: w * 0.042, color: C.ink2, letterSpacing: '.08em' }}>{kicker}</div>
        <div style={{ fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: w * 0.16, lineHeight: 1, textTransform: 'uppercase', color: accent === C.gold ? C.goldDeep : accent }}>{tier}</div>
        {stamp && stampAt != null && <div style={{ position: 'absolute', insetInlineEnd: w * 0.04, bottom: w * 0.06 }}><Stamp text={stamp} color={C.redDeep} at={stampAt} size={w * 0.12} rot={-12} /></div>}
      </div>
    </div>
  </div>;
}
/** The lanyard above a pass (a striped ribbon). */
export const Lanyard = ({ w = 40, h = 800, color = C.red }: { w?: number; h?: number; color?: string }) => <i style={{ position: 'absolute', left: '50%', top: -h + 10, width: w, marginLeft: -w / 2, height: h, background: `repeating-linear-gradient(180deg, ${color} 0 60px, ${C.redDeep} 60px 120px)` }} />;

/** The front page: masthead, kicker, the headline setting itself, your byline, columns of grey. */
export function FrontPage({ w, h, masthead, edition, dateline, kicker, headline, byline, hedAt, byAt, stamp, stampAt, accent = C.red, rtl }: { w: number; h: number; masthead: string; edition: string; dateline: string; kicker: string; headline: string; byline: string; hedAt: number; byAt: number; stamp?: string; stampAt?: number; accent?: string; rtl?: boolean }) {
  const { f } = useStage();
  const P = h > w * 1.2;
  return <div style={{ position: 'relative', width: w, height: h, direction: rtl ? 'rtl' : 'ltr' }}>
    <Paper lift={0.4}>
      <div style={{ padding: `${w * 0.05}px ${w * 0.06}px`, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: w * 0.024 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `${w * 0.006}px double ${C.ink}`, paddingBottom: w * 0.012, gap: 20 }}>
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: w * (P ? 0.11 : 0.09), letterSpacing: '-.02em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{masthead}</span>
          <span style={{ fontFamily: F.mono, fontSize: w * 0.026, color: C.ink2, textAlign: 'end', whiteSpace: 'nowrap' }}>{edition}<br />{dateline}</span>
        </div>
        <div style={{ background: accent, color: C.paper, fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: w * 0.04, letterSpacing: '.08em', padding: `${w * 0.008}px ${w * 0.02}px`, alignSelf: 'flex-start', textTransform: 'uppercase' }}>{kicker}</div>
        <h1 style={{ margin: 0, fontFamily: F.display, fontWeight: 800, fontSize: w * (P ? 0.115 : 0.1), lineHeight: 1.02, letterSpacing: '-.02em', color: C.ink, textWrap: 'balance' } as CSSProperties}><Typeset text={headline} at={hedAt} cpf={2.6} /></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: w * 0.02, opacity: k01(f, byAt, byAt + 8), transform: `translateX(${(1 - k01(f, byAt, byAt + 10)) * (rtl ? 40 : -40)}px)` }}>
          <i style={{ width: w * 0.014, height: w * 0.07, background: accent }} />
          <span style={{ fontFamily: F.text, fontWeight: 800, fontSize: w * 0.048 }}>{byline}</span>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: w * 0.024, minHeight: 0, overflow: 'hidden' }}>
          {[0, 1, 2].map((k) => <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: w * 0.013 }}>{Array.from({ length: 12 }, (_, j) => <i key={j} style={{ height: w * 0.013, width: `${70 + ((j * 13 + k * 7) % 30)}%`, background: C.paper3 }} />)}</div>)}
        </div>
      </div>
      {stamp && stampAt != null && <div style={{ position: 'absolute', insetInlineEnd: w * 0.05, bottom: w * 0.07 }}><Stamp text={stamp} color={C.redDeep} at={stampAt} size={w * 0.1} rot={-8} /></div>}
    </Paper>
  </div>;
}
/** The presses: two big rollers and the web of paper racing between them. `run` 0..1 is the speed; `turn` in degrees. */
export function Presses({ x = 0, y = 0, turn, accent = C.red, w = 1600 }: { x?: number; y?: number; turn: number; accent?: string; w?: number }) {
  const r = w * 0.14;
  const roller = (cx: number, cy: number, col: string, dir: number, i: number) => <div key={i} style={{ position: 'absolute', left: x + cx - r, top: y + cy - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `repeating-conic-gradient(${col} 0 14deg, ${col === accent ? C.redDeep : '#24221F'} 14deg 30deg)`, border: `${r * 0.05}px solid ${C.ink}`, boxShadow: '0 20px 50px rgba(0,0,0,.7), inset 0 0 0 26px rgba(0,0,0,.18)', transform: `rotate(${turn * dir}deg)` }}>
    <i style={{ position: 'absolute', inset: '38%', borderRadius: '50%', background: '#8C857A', border: `${r * 0.04}px solid ${C.ink}` }} />
  </div>;
  const web = (turn * 2.4) % (w * 0.3);
  return <div style={{ position: 'absolute', left: 0, top: 0, transform: 'rotate(-12deg)' }}>
    <div style={{ position: 'absolute', left: x - w, top: y - w * 0.07, width: w * 2, height: w * 0.14, background: C.paper, boxShadow: '0 30px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -w * 0.3, top: 0, width: w * 2.6, height: '100%', transform: `translateX(${-web}px)`, backgroundImage: `linear-gradient(180deg, ${accent} 0 12%, transparent 12% 20%, ${C.ink} 20% 30%, transparent 30% 36%, ${C.ink} 36% 44%, transparent 44% 56%, ${C.ink3} 56% 60%, transparent 60% 66%, ${C.ink3} 66% 70%, transparent 70%)`, backgroundSize: `${w * 0.3}px 100%`, backgroundRepeat: 'repeat-x', WebkitMaskImage: `repeating-linear-gradient(90deg, #000 0 ${w * 0.26}px, transparent ${w * 0.26}px ${w * 0.3}px)`, maskImage: `repeating-linear-gradient(90deg, #000 0 ${w * 0.26}px, transparent ${w * 0.26}px ${w * 0.3}px)`, opacity: 0.85 }} />
    </div>
    {[roller(-w * 0.38, -w * 0.2, accent, 1, 0), roller(w * 0.04, w * 0.2, '#3C3A36', -1, 1), roller(w * 0.44, -w * 0.2, '#3C3A36', 1, 2)]}
  </div>;
}
/** A city skyline at night, windows lit. `lit` 0..1 brings the windows up (phones lighting up across the city). */
export function City({ w = 3200, h = 700, lit = 0.6, glow = 0, accent = C.lamp, seed = 1, y = 0 }: { w?: number; h?: number; lit?: number; glow?: number; accent?: string; seed?: number; y?: number }) {
  const { f } = useStage();
  const n = 26, bw = w / n;
  return <div style={{ position: 'absolute', left: -w / 2, top: y - h, width: w, height: h, pointerEvents: 'none' }}>
    {Array.from({ length: n }, (_, i) => {
      const bh = h * (0.35 + (((i * 7919 + seed * 97) % 100) / 100) * 0.65), bx = i * bw;
      const wins = 4 + (i % 3);
      return <div key={i} style={{ position: 'absolute', left: bx, bottom: 0, width: bw - 8, height: bh, background: '#0D0C12', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.03)' }}>
        {Array.from({ length: wins }, (_, j) => { const on = ((i * 13 + j * 7 + seed) % 5) / 4 <= lit; return <i key={j} style={{ position: 'absolute', left: '18%', width: '64%', height: bh / (wins * 2.6), top: `${8 + j * (80 / wins)}%`, background: on ? accent : 'rgba(80,110,160,.12)', opacity: on ? 0.5 + 0.4 * noise(f / 14 + i + j, seed) : 1, boxShadow: on && glow ? `0 0 ${20 * glow}px ${accent}` : 'none' }} />; })}
      </div>;
    })}
  </div>;
}
/** A roller shutter, `down` 0..1 from up to the sill (transform only). */
export function Shutter({ w = 1400, h = 1200, down, color = '#5E5B55' }: { w?: number; h?: number; down: number; color?: string }) {
  return <div style={{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, overflow: 'hidden', pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: `repeating-linear-gradient(180deg, ${color} 0 44px, #2C2A27 44px 50px, #6E6B65 50px 54px, ${color} 54px 60px)`, boxShadow: 'inset 0 -20px 40px rgba(0,0,0,.6)', transform: `translateY(${(down - 1) * h}px)` }} />
    <i style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 26, background: '#1B1A18', boxShadow: '0 8px 20px rgba(0,0,0,.6)' }} />
  </div>;
}
/** Lift doors, `open` 0..1 (transform only). What's beyond is whatever you draw behind them. */
export function LiftDoors({ w = 1100, h = 1500, open }: { w?: number; h?: number; open: number }) {
  const d = (k: number) => <div key={k} style={{ position: 'absolute', left: k ? '50%' : 0, top: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, #6B6E78, #9A9DA8 40%, #5A5D66)', boxShadow: 'inset 0 0 0 4px rgba(0,0,0,.35)', transform: `translateX(${(k ? 1 : -1) * open * 100}%)` }} />;
  return <div style={{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, overflow: 'hidden', border: `24px solid #2B2C31`, boxSizing: 'border-box', pointerEvents: 'none' }}>{[0, 1].map(d)}</div>;
}
/** A wall calendar: a month grid; `struck` days are crossed through in ink, `to` is how many the pen has done so far. */
export function Calendar({ w = 720, month, days = 31, to, accent = C.red, rtl }: { w?: number; month: string; days?: number; to: number; accent?: string; rtl?: boolean }) {
  const cw = w / 7, rows = Math.ceil(days / 7);
  return <div style={{ position: 'relative', width: w, height: cw * rows + w * 0.2, direction: rtl ? 'rtl' : 'ltr' }}>
    <Paper lift={0.2}>
      <div style={{ height: w * 0.14, background: C.ink, color: C.paper, display: 'flex', alignItems: 'center', padding: `0 ${w * 0.04}px`, fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: w * 0.07, letterSpacing: '.1em', textTransform: 'uppercase' }}>{month}<i style={{ marginInlineStart: 'auto', width: w * 0.04, height: w * 0.04, borderRadius: '50%', background: accent }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: `${w * 0.03}px ${w * 0.02}px` }}>
        {Array.from({ length: days }, (_, i) => {
          const p = interpolate(to - i, [0, 1], [0, 1], clamp);
          return <div key={i} style={{ height: cw * 0.9, position: 'relative', display: 'grid', placeItems: 'center', fontFamily: F.mono, fontSize: cw * 0.34, color: p >= 1 ? C.ink3 : C.ink }}>
            {i + 1}
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: '10%', width: '80%', height: '80%', overflow: 'visible' }} aria-hidden="true"><path d="M12 86 L88 14" stroke={accent} strokeWidth="14" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} /></svg>
          </div>;
        })}
      </div>
    </Paper>
  </div>;
}
/** A masthead on a building: big type on a dark band, lit from below. `lit` 0..1. */
export function Masthead({ text, w = 1400, lit, accent = C.gold }: { text: string; w?: number; lit: number; accent?: string }) {
  return <div style={{ position: 'relative', width: w, height: w * 0.22, background: '#111', border: `${w * 0.008}px solid #2A2A2A`, display: 'grid', placeItems: 'center', overflow: 'hidden', boxShadow: `0 0 ${lit * 120}px ${accent}66` }}>
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(0deg, ${accent}33, transparent 60%)`, opacity: lit }} />
    <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: w * 0.12, letterSpacing: '-.02em', color: accent, opacity: 0.12 + lit * 0.88, textShadow: `0 0 ${lit * 40}px ${accent}`, whiteSpace: 'nowrap', maxWidth: '94%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
  </div>;
}
/** A TV screen (a black bezel with what you draw inside). `on` 0..1 is the picture coming up. */
export function TV({ w, h, on = 1, z, children }: { w: number; h: number; on?: number; z?: number; children?: ReactNode }) {
  return <div style={{ position: 'relative', width: w, height: h, zIndex: z }}>
    <div style={{ position: 'absolute', inset: -w * 0.02, background: '#0A0A0A', borderRadius: w * 0.02, boxShadow: '0 40px 90px rgba(0,0,0,.7)' }} />
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000', borderRadius: w * 0.008 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scaleY(${0.02 + 0.98 * Math.min(1, on)})`, opacity: Math.min(1, on * 1.5), display: 'flex', flexDirection: 'column' }}>{children}</div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 2px, transparent 2px 5px)' }} />
    </div>
  </div>;
}
/** A social post card: byline, the text typing, the counters. */
export function PostCard({ w, byline, handle, text, at, viral = 0, tag, rtl }: { w: number; byline: string; handle?: string; text: string; at: number; viral?: number; tag?: string; rtl?: boolean }) {
  const { f } = useStage();
  const k = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(n)));
  return <div style={{ width: w, background: C.paper, color: C.ink, borderRadius: w * 0.03, padding: `${w * 0.03}px ${w * 0.035}px`, boxSizing: 'border-box', direction: rtl ? 'rtl' : 'ltr', boxShadow: '0 20px 40px rgba(0,0,0,.4)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: w * 0.02 }}>
      <span style={{ width: w * 0.09, height: w * 0.09, borderRadius: '50%', background: C.ink, color: C.gold, display: 'grid', placeItems: 'center', fontFamily: F.display, fontWeight: 800, fontSize: w * 0.05 }}>{Array.from(byline)[0] || '?'}</span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><b style={{ fontFamily: F.text, fontSize: w * 0.042, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{byline}</b>{handle && <span style={{ fontFamily: F.mono, fontSize: w * 0.03, color: C.ink3 }}><bdi dir="ltr">{handle}</bdi></span>}</span>
      {tag && <span style={{ marginInlineStart: 'auto', background: C.red, color: C.paper, fontFamily: F.cond, fontStretch: '75%', fontWeight: 900, fontSize: w * 0.036, padding: `${w * 0.006}px ${w * 0.016}px`, letterSpacing: '.08em', opacity: k01(f, at + 10, at + 16) }}>{tag}</span>}
    </div>
    <p style={{ margin: `${w * 0.025}px 0`, fontFamily: F.text, fontSize: w * 0.046, lineHeight: 1.25, minHeight: w * 0.12 }}><Typeset text={text} at={at} cpf={2} /></p>
    <div style={{ display: 'flex', gap: w * 0.05, fontFamily: F.cond, fontStretch: '80%', fontWeight: 800, fontSize: w * 0.04, color: C.ink2 }}>
      <span>↩ {k(viral * 9100)}</span><span style={{ color: C.done }}>⟳ {k(viral * 48200)}</span><span style={{ color: C.redDeep }}>♥ {k(viral * 213000)}</span>
    </div>
  </div>;
}
/** A reply that piles in: a small card with a handle and a line. `at` is when it lands. */
export function Reply({ handle, text, at, w = 520, tone = C.paper2 }: { handle: string; text: string; at: number; w?: number; tone?: string }) {
  const { f } = useStage();
  if (f < at) return null;
  const s = spring({ frame: f - at, fps: 30, config: { damping: 13, stiffness: 220 } });
  return <div style={{ width: w, background: tone, color: C.ink, borderRadius: w * 0.03, padding: `${w * 0.025}px ${w * 0.035}px`, boxSizing: 'border-box', boxShadow: '0 10px 24px rgba(0,0,0,.35)', transform: `translateY(${(1 - s) * 120}px) scale(${0.85 + 0.15 * s})`, opacity: Math.min(1, s * 2), fontFamily: F.text, fontSize: w * 0.05, lineHeight: 1.2 }}>
    <b style={{ fontFamily: F.mono, fontSize: w * 0.04, color: C.ink3, display: 'block', marginBottom: 4 }}><bdi dir="ltr">{handle}</bdi></b>{text}
  </div>;
}
/** Steam off coffee: three soft wisps rising (transform + opacity only). */
export function Steam({ x, y, on = 1 }: { x: number; y: number; on?: number }) {
  const { f } = useStage();
  return <>{[0, 1, 2].map((i) => { const t = ((f / 40 + i * 0.33) % 1); return <i key={i} style={{ position: 'absolute', left: x - 20 + i * 24, top: y - t * 160, width: 30, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,.35)', filter: 'blur(10px)', opacity: on * (1 - t) * 0.7, transform: `translateX(${Math.sin(f / 9 + i) * 12}px) scale(${0.6 + t})` }} />; })}</>;
}
/** A coffee cup from above (a ring, a disc of coffee), with a saucer. */
export function Cup({ x, y, r = 90, band = C.red }: { x: number; y: number; r?: number; band?: string }) {
  return <At x={x} y={y} w={r * 2.6} h={r * 2.6}>
    <i style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#E9E2D3', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }} />
    <i style={{ position: 'absolute', inset: r * 0.3, borderRadius: '50%', background: C.paper, boxShadow: `inset 0 0 0 ${r * 0.08}px ${band}` }} />
    <i style={{ position: 'absolute', inset: r * 0.5, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #6B4A2E, #2A1A10 70%)' }} />
  </At>;
}
/** A phone screen for a phone lying flat: a feed of replies piling in. */
export function ReplyScreen({ replies, at, per = 5, w = 300 }: { replies: string[]; at: number; per?: number; w?: number }) {
  const { f } = useStage();
  const n = replies.length;
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: w * 0.03, padding: w * 0.06, overflow: 'hidden' }}>
    {replies.map((r, i) => {
      const t0 = at + i * per; if (f < t0) return null;
      const s = spring({ frame: f - t0, fps: 30, config: { damping: 14, stiffness: 240 } });
      return <div key={i} style={{ background: '#22232B', borderRadius: w * 0.05, padding: `${w * 0.035}px ${w * 0.05}px`, fontFamily: F.text, fontSize: w * 0.062, lineHeight: 1.2, color: '#E6E3DA', transform: `translateY(${(1 - s) * 60}px)`, opacity: Math.min(1, s * 2) * (i < n - 6 ? 0.4 : 1) }}>{r}</div>;
    })}
  </div>;
}
