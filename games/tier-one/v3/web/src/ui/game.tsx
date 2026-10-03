// Game-layer components (HYBRID.md): icons, kit shirts, chunky buttons, counters, confetti, top bar and tabs.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { WClub, WPlayer } from '../lib/engine';
import { sfx, haptic, type Sfx } from '../lib/sfx';
export { haptic, type Haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
export { prefersReducedMotion } from '../lib/motion';
// 3.8: the icon family lives in ui/bits.tsx (brief §43) and the top bar in ui/chrome.tsx (§28); both re-exported here.
import { Icon } from './bits';
export { Icon } from './bits';
export { TopBar } from './chrome';

// ---------- icons: see ui/bits.tsx (ICONS)
export const SRC_ICON: Record<string, string> = { kitman: 'shirt', barber: 'scissors', agent: 'briefcase', spotter: 'plane', physio: 'pulse', leak: 'fax' };
export function SrcIcon({ k, size = 44 }: { k: string; size?: number }) {
  return <span className={'g-src g-src--' + k} style={{ ['--sz' as string]: size + 'px' }}><Icon n={SRC_ICON[k] || 'phone'} /></span>;
}
export function Rel({ n }: { n: number }) { return <span className="g-rel" aria-hidden="true">{[1, 2, 3].map((k) => <i key={k} className={k <= n ? 'on' : ''} />)}</span>; }

// ---------- kit shirt: club colours, a pattern, and the player's initials or number. No faces, no badges.
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
function lum(hex: string) { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return .5; const n = parseInt(m[1], 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
let kid = 0;
export function kitSVG(club?: WClub, label = '', mystery = false) {
  const c1 = mystery ? '#20272C' : club?.c1 || '#777', c2raw = mystery ? '#384249' : club?.c2 || '#fff';
  const c2 = Math.abs(lum(c1) - lum(c2raw)) < .12 ? (lum(c1) > .5 ? '#15130F' : '#F4EFE4') : c2raw;
  const id = 'k' + ++kid, pat = club ? hash(club.id) % 5 : 0;
  const body = 'M22 8l-14 8 6 14 6-3v31h40V27l6 3 6-14-14-8c-2 6-8 9-18 9s-16-3-18-9z';
  let fill = `<rect width="100" height="100" fill="${c1}"/>`;
  if (!mystery) {
    if (pat === 1) fill += [34, 46, 58].map((x) => `<rect x="${x - 3}" width="6" height="100" fill="${c2}"/>`).join('');
    if (pat === 2) fill += `<rect x="50" width="50" height="100" fill="${c2}"/>`;
    if (pat === 3) fill += `<rect y="36" width="100" height="8" fill="${c2}"/><rect y="50" width="100" height="8" fill="${c2}"/>`;
    if (pat === 4) fill += `<path d="M10 70L70 0h14L24 70z" fill="${c2}"/>`;
  }
  const plated = !mystery && (pat === 1 || pat === 2 || pat === 3);
  const tx = mystery ? '#D8D0C0' : plated ? '#fff' : lum(c1) > .55 ? '#15130F' : '#fff';
  const plate = plated ? `<rect x="33" y="31" width="34" height="18" rx="3" fill="rgba(0,0,0,.55)"/>` : '';
  const txt = mystery ? '?' : label;
  return `<svg viewBox="0 0 100 70"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs><g clip-path="url(#${id})">${fill}<path d="M22 8c2 6 8 9 18 9s16-3 18-9" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>${plate}</g>`
    + `<path d="${body}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>`
    + `<text x="50" y="${mystery ? 50 : txt.length > 2 ? 45 : 46.5}" text-anchor="middle" font-size="${mystery ? 30 : txt.length > 2 ? 15 : 19}" fill="${tx}">${txt.replace(/[<&]/g, '')}</text></svg>`;
}
export const initials = (p?: WPlayer) => (p ? p.n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '');
export function Kit({ club, player, size = 56, mystery, style }: { club?: WClub; player?: WPlayer; size?: number; mystery?: boolean; style?: CSSProperties }) {
  return <i className="g-kit" style={{ ['--kit' as string]: size + 'px', ...style }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: kitSVG(club, player?.no ? String(player.no) : initials(player), mystery) }} />;
}

// ---------- the one button family (docs/DESIGN_SYSTEM.md): primary (red ink) · gold · dark · paper · green · ghost;
// sizes sm / md ('') / lg; loading (an ink sweep, never a spinner) and disabled; press-down + haptic on every tap.
// `primary` marks the screen's one primary action (Enter on a desktop fires it); `pick` numbers a card 1–5 for the keys.
export function GBtn({ kind = '', size = '', children, onClick, disabled, loading, sound = 'ui.tap', style, className = '', label, pulse, shine, type = 'button', primary, pick }: { kind?: '' | 'gold' | 'dark' | 'paper' | 'green' | 'ghost'; size?: '' | 'lg' | 'sm' | 'md'; children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; sound?: Sfx | null; style?: CSSProperties; className?: string; label?: string; pulse?: boolean; shine?: boolean; type?: 'button' | 'submit'; primary?: boolean; pick?: number }) {
  return <button type={type} aria-label={label} aria-busy={loading || undefined} disabled={disabled || loading} style={style} data-primary={primary ? '' : undefined} data-pick={pick} className={['g-btn', kind && 'g-btn--' + kind, size && size !== 'md' && 'g-btn--' + size, pulse && 'is-pulse', loading && 'is-loading', className].filter(Boolean).join(' ')} onClick={() => { if (sound) { sfx(sound); haptic('tap'); } onClick?.(); }}>{shine && <span className="shine" />}{children}</button>;
}
// ---------- a stamp never lands in the same place twice (GOTY.md §11.1): a deterministic angle per seed, −10°…+4°.
export function stampRot(seed: string | number): string {
  const h = hash(String(seed)); const a = (h % 15) - 10; // −10 … 4
  return (a > -3 && a < 2 ? a - 4 : a) + 'deg';
}

// ---------- numbers that count up
export function useCountUp(to: number, ms = 900, on = true, tick = false) {
  const [v, setV] = useState(on ? 0 : to);
  useEffect(() => {
    if (!on || prefersReducedMotion()) { setV(to); return; }
    let raf = 0; const t0 = performance.now(), from = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); setV(Math.round(from + (to - from) * e)); if (tick && k < 1) sfx('count'); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, ms, on]);
  return v;
}
export function CountUp({ to, ms, sign, tick }: { to: number; ms?: number; sign?: boolean; tick?: boolean }) {
  const v = useCountUp(to, ms, true, tick);
  return <>{v < 0 ? '−' + Math.abs(v) : (sign && v > 0 ? '+' : '') + v}</>;
}

// ---------- a rolling counter: each digit is a strip that spins to its value (GOTY.md §4, "numbers roll").
// <Roll n={credits} /> · <Roll n={pts} sign /> · <Roll n={x} format={num} />. Non-digits (commas, signs, locale digits) sit still.
// Digits are keyed from the right, so 99 → 100 rolls the tens and units and slides a new hundreds digit in.
export function Roll({ n, sign, format, className = '', from0 = true }: { n: number; sign?: boolean; format?: (n: number) => string; className?: string; from0?: boolean }) {
  const [armed, setArmed] = useState(() => !from0 || prefersReducedMotion());
  useEffect(() => { if (armed) return; const id = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true))); return () => cancelAnimationFrame(id); }, []);
  const body = format ? format(Math.abs(n)) : String(Math.abs(Math.round(n)));
  const str = (n < 0 ? '−' : sign && n > 0 ? '+' : '') + body;
  const chars = [...str];
  return <span className={'g-roll ' + className}>
    <span className="sr-only">{str}</span>
    <span className="g-roll__vis" aria-hidden="true">{chars.map((ch, i) => {
      const k = chars.length - i, d = ch >= '0' && ch <= '9' ? ch.charCodeAt(0) - 48 : -1;
      return d < 0 ? <span key={'s' + k} className="g-roll__s">{ch}</span>
        : <span key={'d' + k} className="g-roll__d" style={{ ['--k' as string]: k }}><span className="g-roll__col" style={{ ['--v' as string]: armed ? d : 0 }}>{DIGITS}</span></span>;
    })}</span>
  </span>;
}
const DIGITS = Array.from({ length: 10 }, (_, k) => <i key={k}>{k}</i>);

// ---------- pointer tilt (desktop): one delegated listener; any matching card leans toward the pointer, ±6°, with a sheen.
// Hero and collectible cards only (the addendum's rule): Today's five kits, earned trophies, the results scoop card, and
// anything a screen opts in with `g-tilt` / `g-card--tilt`. Ordinary list cards and buttons never tilt.
export const TILT_SEL = '.g-tilt, .g-card--tilt, .five__kit, .trophy.is-on, .vcard';
const TILT_MAX = 6;
export function installTilt(sel = TILT_SEL) {
  if (typeof window === 'undefined') return () => {};
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let cur: HTMLElement | null = null, raf = 0, x = 0, y = 0, target: Element | null = null;
  const reset = () => { if (!cur) return; cur.classList.remove('is-tilt'); cur.style.removeProperty('--rx'); cur.style.removeProperty('--ry'); cur = null; };
  const apply = () => {
    raf = 0;
    const el = (target?.closest?.(sel) as HTMLElement | null) || null;
    if (el !== cur) reset();
    if (!el || (el as HTMLButtonElement).disabled) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (x - r.left) / r.width)), py = Math.min(1, Math.max(0, (y - r.top) / r.height));
    el.style.setProperty('--rx', ((0.5 - py) * 2 * TILT_MAX).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((px - 0.5) * 2 * TILT_MAX).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    el.classList.add('is-tilt'); cur = el;
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !fine.matches || prefersReducedMotion()) { reset(); return; }
    x = e.clientX; y = e.clientY; target = e.target as Element;
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const out = (e: PointerEvent) => { if (!e.relatedTarget) { target = null; reset(); } };
  const down = () => reset();
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerout', out, { passive: true });
  document.addEventListener('pointerdown', down, { passive: true });
  window.addEventListener('scroll', down, { passive: true });
  return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerout', out); document.removeEventListener('pointerdown', down); window.removeEventListener('scroll', down); if (raf) cancelAnimationFrame(raf); reset(); };
}
// Per-element opt-in for screens that want it without the class: const ref = useTilt<HTMLDivElement>().
export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => { ref.current?.classList.add('g-tilt'); }, []);
  return ref;
}

// ---------- confetti (canvas, 1.8 s)
export function confetti(colors = ['#FF5A36', '#F7B928', '#2FBF71', '#35C3E6', '#A77BFF', '#F4EFE4'], n = 140) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const cv = document.createElement('canvas'); cv.className = 'g-confetti'; document.body.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
  const x = cv.getContext('2d')!; x.scale(dpr, dpr);
  const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, c: colors[(Math.random() * colors.length) | 0] }));
  const t0 = performance.now();
  const step = (t: number) => {
    const k = (t - t0) / 1800; x.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.globalAlpha = Math.max(0, 1 - k * k); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); x.restore(); }
    if (k < 1) requestAnimationFrame(step); else cv.remove();
  };
  requestAnimationFrame(step);
}
export function shake(el?: Element | null) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('is-shaking'); void (el as HTMLElement).offsetWidth; el.classList.add('is-shaking');
}

// ---------- typed subtitle
export function useTyped(text: string, cps = 38, on = true) {
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on || prefersReducedMotion()) { setN(text.length); return; }
    setN(0); let i = 0; const id = setInterval(() => { i++; setN(i); if (i >= text.length) clearInterval(id); }, 1000 / cps);
    return () => clearInterval(id);
  }, [text, on]);
  return text.slice(0, n);
}

// ---------- top bar: see ui/chrome.tsx (TopBar, re-exported above)

export function Ring({ children, on = true, color }: { children: ReactNode; on?: boolean; color?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  return <span ref={ref} className={'g-ringwrap' + (on ? ' is-on' : '')} style={{ ['--rc' as string]: color }}>{children}</span>;
}
