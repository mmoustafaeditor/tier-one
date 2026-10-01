// Game-layer components (HYBRID.md): icons, kit shirts, chunky buttons, counters, confetti, top bar and tabs.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { WClub, WPlayer } from '../lib/engine';
import { sfx, haptic, type Sfx } from '../lib/sfx';
export { haptic, type Haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
export { prefersReducedMotion } from '../lib/motion';
import { useSave } from '../lib/save';
import { useT } from '../lib/i18n';
import { levelOfSave } from '../lib/progress';
import { Bell } from './connect';

// ---------- icons (24px line icons, currentColor)
const P: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  story: 'M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  wire: 'M3 17l5-6 4 4 5-7 4 5M3 21h18',
  friends: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-7 7-7s7 3 7 7M17 11a3 3 0 1 0 0-6M19 14c2 1 3 3 3 6',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-7 8-7s8 3 8 7',
  help: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  shirt: 'M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9L20 20M8.1 16.1L20 4',
  briefcase: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8V5h6v3M4 13h16',
  plane: 'M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4l8 2z',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  fax: 'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  flame: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-5 10-1-1-2-2-2-4-2 2-2 4-2 6 0 4 3 7 7 7z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  play: 'M8 5v14l11-7z',
  down: 'M6 9l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12h.01',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  news: 'M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14',
  gift: 'M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1c2-4 6-4 6-1s-6 1-6 1',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  uturn: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  ticket: 'M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z',
  reply: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z',
  repost: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  heart: 'M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.2 0 5.5 3 4.4 6.2C19.5 15.4 12 20 12 20z',
};
export function Icon({ n, size, style, className }: { n: string; size?: number; style?: CSSProperties; className?: string }) {
  return <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}><path d={P[n] || P.star} /></svg>;
}
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
  const c1 = mystery ? '#26221C' : club?.c1 || '#777', c2raw = mystery ? '#3A342A' : club?.c2 || '#fff';
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
  const tx = mystery ? '#FF5A36' : plated ? '#fff' : lum(c1) > .55 ? '#15130F' : '#fff';
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

// ---------- top bar
export function TopBar({ back, title, onHelp, onMenu, children }: { back?: { label: string; onClick: () => void }; title?: ReactNode; onHelp?: () => void; onMenu?: () => void; children?: ReactNode }) {
  const s = useSave(); const t = useT();
  const lv = levelOfSave(s); // the account level (lib/economy.ts), the same number the home screen shows
  return <header className="g-top">
    {back ? <button className="g-top__back" onClick={() => { sfx('ui.tap'); back.onClick(); }}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} />{back.label}</button>
      : <span className="g-top__logo">Tier One</span>}
    {title && <span className="g-top__title">{title}</span>}
    <span className="g-top__end">
      {children}
      <Bell />
      <span className="g-pill" aria-label={t('g.coins', { n: s.credits })}><span className="g-coin" /><Roll n={s.credits} from0={false} /></span>
      <span className="g-pill g-pill--lv" aria-label={t('g.level', { n: lv.n })}>{t('g.lv', { n: lv.n })}</span>
      {onHelp && <button className="g-icbtn" onClick={onHelp} aria-label={t('nav.howto')}><Icon n="help" /></button>}
      {onMenu && <button className="g-icbtn" onClick={onMenu} aria-label={t('common.settings')}><Icon n="menu" /></button>}
    </span>
  </header>;
}

export function Ring({ children, on = true, color }: { children: ReactNode; on?: boolean; color?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  return <span ref={ref} className={'g-ringwrap' + (on ? ' is-on' : '')} style={{ ['--rc' as string]: color }}>{children}</span>;
}
