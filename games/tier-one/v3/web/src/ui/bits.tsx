import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';
import { crestSVG, portraitSVG, tallySVG } from '../lib/kit';
import type { WClub } from '../lib/engine';
import { sfx, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { onToasts } from '../lib/meta';
import { useT, fmtDate } from '../lib/i18n';
import { GBtn, haptic } from './game';

// ---------------------------------------------------------------- the one icon family (brief §43)
// 24-unit grid, 2px round stroke, no fills, currentColor. Every destination and action in the game draws from this
// map and nowhere else (ui/game.tsx re-exports <Icon> so older imports keep working). Semantic names first; the
// older names (home, story, wire, friends, news, …) are kept as aliases of the same drawings so screens don't drift.
const ICONS: Record<string, string> = {
  // destinations (§43): desk · front page · press pass · transfer arrows · reporters · ID card
  desk: 'M3 13h18M5 13v7M19 13v7M9 13V9h6M8 6h8l-1 3H9zM12 3v3',
  daily: 'M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 9h4v4H7zM13 9h2M13 13h2M7 17h8',
  career: 'M7 7h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM10 7V4h4v3M12 13.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM9 18c0-1.4 1.3-2.4 3-2.4s3 1 3 2.4',
  market: 'M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3',
  rooms: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-7 7-7s7 3 7 7M17 11a3 3 0 1 0 0-6M19 14c2 1 3 3 3 6',
  card: 'M3 6h18v12H3zM9 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 16c0-1.6 1.4-2.6 3-2.6s3 1 3 2.6M14 10h4M14 13.5h4',
  // actions and states
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  exclusive: 'M13 2L4 14h7l-1 8 9-12h-7z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  evidence: 'M6 3h9l4 4v14H6zM15 3v4h4M9 14l2 2 4-4',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v1.5M12 15.5V17M14.5 10.2a2.5 2 0 0 0-5 0c0 2.4 5 1.6 5 4a2.5 2 0 0 1-5 0',
  credit: 'M12 2.5l8 4.5v10l-8 4.5-8-4.5V7zM14.6 9.6A3.4 3.4 0 1 0 14.6 14.4',
  shop: 'M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2',
  missions: 'M4 6h2M9 6h11M4 12h2M9 12h11M4 18h2M9 18h11',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  shield: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM9.5 12l2 2 3.5-4',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
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
  menu: 'M4 7h16M4 12h16M4 17h16',
  help: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14',
  gift: 'M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1c2-4 6-4 6-1s-6 1-6 1',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  uturn: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  ticket: 'M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z',
  reply: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z',
  repost: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  heart: 'M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.2 0 5.5 3 4.4 6.2C19.5 15.4 12 20 12 20z',
  language: 'M3 5h12M9 3v2M11.5 5c-.6 4.5-3 8-6.5 10M6 7c1 3 3.5 6 7 8M13 21l4-10 4 10M14.5 17h5',
  film: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14',
};
ICONS.home = ICONS.desk; ICONS.news = ICONS.daily; ICONS.story = ICONS.career; ICONS.wire = ICONS.market; ICONS.friends = ICONS.rooms; ICONS.me = ICONS.card;
export const ICON_NAMES = Object.keys(ICONS);
export function Icon({ n, size, style, className }: { n: string; size?: number; style?: CSSProperties; className?: string }) {
  return <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}><path d={ICONS[n] || ICONS.star} /></svg>;
}

export function Crest({ club, size = 24, style }: { club?: WClub; size?: number; style?: CSSProperties }) {
  return <i className="crest" style={{ ['--size' as string]: size + 'px', ...style }} dangerouslySetInnerHTML={{ __html: crestSVG(club) }} />;
}
export function Portrait({ club, no, variant = '', who = '', className = '', children }: { club?: WClub; no: number | string; variant?: 'wide' | 'left' | ''; who?: string; className?: string; children?: ReactNode }) {
  return <figure className={'portrait ' + className} aria-hidden="true"><span className="portrait__art" dangerouslySetInnerHTML={{ __html: portraitSVG(club, no, variant, who) }} />{children}</figure>;
}
export function Route({ from, to, size = 18, dashed = false }: { from?: WClub; to?: WClub; size?: number; dashed?: boolean }) {
  return <div className="route route--short"><Crest club={from} size={size} /><span className={'route__arrow' + (dashed ? ' route__arrow--dash' : '')} /><Crest club={to} size={size} /></div>;
}
const STAMP_SFX: Record<string, Sfx> = { done: 'stamp.done', exclusive: 'stamp.exclusive', fake: 'stamp.fake', hijack: 'stamp.done', off: 'stamp.done', dead: 'stamp.wrong' };
export function Stamp({ kind = '', size = '', slam = false, flat = false, children, sound = true }: { kind?: string; size?: 'sm' | 'lg' | 'xl' | ''; slam?: boolean; flat?: boolean; children: ReactNode; sound?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!slam) return;
    if (sound) sfx(STAMP_SFX[kind] || 'stamp.done');
    const host = ref.current?.closest('.jolt-host');
    if (host) { host.classList.remove('jolt'); void (host as HTMLElement).offsetWidth; host.classList.add('jolt'); }
  }, [slam, kind, sound]);
  return <span ref={ref} className={['stamp', kind && 'stamp--' + kind, size && 'stamp--' + size, slam && 'is-slam', flat && 'stamp--flat'].filter(Boolean).join(' ')}>{children}</span>;
}
export function Flag({ title, aside, tight, id }: { title: ReactNode; aside?: ReactNode; tight?: boolean; id?: string }) {
  return <div className={'flag' + (tight ? ' flag--tight' : '')} id={id}><h2 className="flag__t">{title}</h2>{aside != null && <span className="flag__aside meta">{aside}</span>}</div>;
}
export function Heat({ v, label, lg }: { v: number; label?: string; lg?: boolean }) {
  const on = Math.round(v / 10);
  return <span className={'heat' + (v >= 70 ? ' is-hot' : '') + (lg ? ' heat--lg' : '')} aria-label={`Heat ${v} of 100`}>
    <span className="heat__n">{v}</span><span className="heat__bar" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</span>
    {label && <span className="heat__l">{label}</span>}
  </span>;
}
export function Tally({ n, label }: { n: number; label?: string }) {
  return <span className="tally" aria-label={label} dangerouslySetInnerHTML={{ __html: tallySVG(n) }} />;
}
// Outcome glyphs (from the mockups): always paired with the word.
export function Glyph({ o }: { o: number }) {
  const p = { viewBox: '0 0 26 26', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;
  if (o === 0) return <svg {...p}><circle cx="13" cy="13" r="11.5" /><path d="M7.5 13.5l3.6 3.6 7.4-8" strokeWidth="2.2" /></svg>;
  if (o === 1) return <svg {...p}><circle cx="13" cy="13" r="11.5" /><path d="M6 17h5c3.5 0 5.5-2 5.5-5.5V8" /><path d="M13.5 10.5l3-3 3 3" /><path d="M12 17h8" strokeDasharray="1.6 2" /></svg>;
  if (o === 2) return <svg {...p}><circle cx="13" cy="13" r="11.5" /><path d="M8.5 8.5l9 9M17.5 8.5l-9 9" /></svg>;
  return <svg {...p}><circle cx="13" cy="13" r="11.5" strokeDasharray="3 2.6" /><path d="M9.8 10.2a3.3 3.3 0 1 1 4.7 3c-1 .5-1.5 1.1-1.5 2.1v.7" /><circle cx="13" cy="19" r=".9" fill="currentColor" /></svg>;
}
export function Btn({ kind = 'primary', children, onClick, disabled, sound = 'ui.tap', style, className = '', label, type }: { kind?: 'primary' | 'accent' | 'ghost' | 'quiet'; children: ReactNode; onClick?: () => void; disabled?: boolean; sound?: Sfx | null; style?: CSSProperties; className?: string; label?: string; type?: 'button' | 'submit' }) {
  return <button type={type || 'button'} aria-label={label} className={`btn btn--${kind} ${className}`} disabled={disabled} style={style} onClick={() => { if (sound) sfx(sound); onClick?.(); }}>{children}</button>;
}
export const Arr = () => <span className="arr" aria-hidden="true">→</span>;
export const BackArr = () => <span className="arr" aria-hidden="true">←</span>;

// ---------------------------------------------------------------- the one sheet (GOTY.md §10.3, §11.1)
// A sheet of paper slid up over the desk: the scrim is an ink wash that fades, the paper springs in from below (on a
// desk it settles in the middle), and on the way out it is pulled down and away. Drag the handle (grip + head) to
// dismiss on a phone; Esc closes; focus is trapped inside and handed back to whatever opened it. Every modal in the
// game is this one component; nothing is allowed its own scrim.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const OUT_MS = 260;
export function Sheet({ open, onClose, children, label, wide, accent, className = '' }: { open: boolean; onClose: () => void; children: ReactNode; label: string; wide?: boolean; accent?: string; className?: string }) {
  const [shown, setShown] = useState(open);
  const [out, setOut] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const drag = useRef({ on: false, y0: 0, dy: 0, t0: 0 });
  useEffect(() => {
    if (open) { opener.current = document.activeElement; setShown(true); setOut(false); return; }
    if (!shown) return;
    if (prefersReducedMotion()) { setShown(false); return; }
    setOut(true);
    const id = setTimeout(() => { setShown(false); setOut(false); }, OUT_MS);
    return () => clearTimeout(id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!shown || out) return;
    const ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const f = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
      if (!f.length) { e.preventDefault(); panel.current.focus(); return; }
      const first = f[0], last = f[f.length - 1], cur = document.activeElement;
      if (e.shiftKey && (cur === first || cur === panel.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', k, true);
    const raf = requestAnimationFrame(() => { const el = panel.current; if (!el) return; const auto = el.querySelector<HTMLElement>('[data-autofocus]'); (auto || el).focus({ preventScroll: true }); });
    return () => {
      document.removeEventListener('keydown', k, true); document.body.style.overflow = ov; cancelAnimationFrame(raf);
      const o = opener.current as HTMLElement | null; if (o && o.isConnected && typeof o.focus === 'function') o.focus({ preventScroll: true });
    };
  }, [shown, out, onClose]);
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const d = drag.current; d.on = true; d.y0 = e.clientY; d.dy = 0; d.t0 = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId); panel.current?.classList.add('is-drag');
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d.on) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    if (panel.current) panel.current.style.transform = `translateY(${d.dy}px)`;
    if (scrim.current) scrim.current.style.setProperty('--wash', String(Math.max(0, 1 - d.dy / 420)));
  };
  const up = () => {
    const d = drag.current; if (!d.on) return; d.on = false;
    const v = d.dy / Math.max(1, performance.now() - d.t0);
    panel.current?.classList.remove('is-drag');
    if (d.dy > 90 || v > 0.55) { sfx('whoosh'); onClose(); return; }
    if (panel.current) panel.current.style.transform = '';
    if (scrim.current) scrim.current.style.removeProperty('--wash');
  };
  if (!shown) return null;
  return <div ref={scrim} className={'scrim' + (out ? ' is-out' : '')} onClick={onClose}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={'sheet sheet--float' + (wide ? ' sheet--wide' : '') + (out ? ' is-out' : '') + (className ? ' ' + className : '')} style={accent ? { ['--sheet-c' as string]: accent } : undefined} onClick={(e) => e.stopPropagation()}>
      <div className="sheet__handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><span className="sheet__grip" aria-hidden="true" /></div>
      {children}
    </div>
  </div>;
}
/** The one head every sheet wears: the title, an aside (or today's dateline, a folio only a person would set) and close. */
export function SheetHead({ title, aside, onClose, kicker }: { title: ReactNode; aside?: ReactNode; onClose: () => void; kicker?: ReactNode }) {
  const t = useT();
  return <div className="sheet__head">
    <div className="sheet__ht">{kicker && <span className="g-mono sheet__k">{kicker}</span>}<b dir="auto">{title}</b><span className="g-mono sheet__aside">{aside ?? fmtDate(Date.now(), t.lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
    <button type="button" className="g-icbtn sheet__x" onClick={() => { sfx('ui.tap'); onClose(); }} aria-label={t('common.close')}><Icon n="x" /></button>
  </div>;
}

// ---------------------------------------------------------------- toasts: wire slips, stacked, swipe or tap to bin
const TOAST_IC: Record<string, string> = { ach: 'star', info: 'news', warn: 'x' };
export function Toasts() {
  const t = useT();
  const [list, setList] = useState<{ id: number; kind: string; title: string; body?: string }[]>([]);
  const [binned, setBinned] = useState<ReadonlySet<number>>(() => new Set());
  useEffect(() => onToasts(setList), []);
  const shown = list.filter((x) => !binned.has(x.id)).slice(-3);
  const dismissToast = (id: number) => setBinned((b) => new Set(b).add(id)); // binned locally; lib/meta expires it on its timer
  return <div className="toasts" aria-live="polite">{shown.map((x, k) => <ToastSlip key={x.id} x={x} depth={shown.length - 1 - k} label={t('common.close')} dismissToast={dismissToast} />)}</div>;
}
function ToastSlip({ x, depth, label, dismissToast }: { x: { id: number; kind: string; title: string; body?: string }; depth: number; label: string; dismissToast: (id: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const d = useRef({ on: false, x0: 0, dx: 0 });
  const bin = () => { el.current?.classList.add('is-out'); setTimeout(() => dismissToast(x.id), prefersReducedMotion() ? 0 : 180); };
  const down = (e: RPointerEvent<HTMLDivElement>) => { if (e.pointerType === 'mouse' && e.button !== 0) return; d.current = { on: true, x0: e.clientX, dx: 0 }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: RPointerEvent<HTMLDivElement>) => { if (!d.current.on || !el.current) return; d.current.dx = e.clientX - d.current.x0; el.current.style.transform = `translateX(${d.current.dx}px) rotate(${d.current.dx / 60}deg)`; el.current.style.opacity = String(Math.max(0.2, 1 - Math.abs(d.current.dx) / 200)); };
  const up = () => { if (!d.current.on || !el.current) return; d.current.on = false; if (Math.abs(d.current.dx) > 70) { bin(); return; } el.current.style.transform = ''; el.current.style.opacity = ''; };
  return <div ref={el} className={'toast toast--' + x.kind} style={{ ['--depth' as string]: depth }} role="status" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
    <span className="toast__ic" aria-hidden="true"><Icon n={TOAST_IC[x.kind] || 'news'} size={16} /></span>
    <span className="toast__b"><b dir="auto">{x.title}</b>{x.body && <span className="g-mono" dir="auto">{x.body}</span>}</span>
    <button type="button" className="toast__x" onClick={bin} aria-label={label}><Icon n="x" size={14} /></button>
  </div>;
}

// ---------------------------------------------------------------- the empty state: a note on the desk with the next thing to do
// `big` stacks it (icon, one line, one full-width primary button): the whole screen's first viewport when there's nothing yet.
export function Empty({ icon = 'news', title, body, action, card, big, style }: { icon?: string; title?: ReactNode; body?: ReactNode; action?: { label: ReactNode; onClick: () => void; icon?: string; kind?: '' | 'gold' | 'dark' | 'paper' | 'green' | 'ghost' }; card?: boolean; big?: boolean; style?: CSSProperties }) {
  return <div className={'g-empty' + (card ? ' g-empty--card' : '') + (big ? ' g-empty--big' : '')} style={style}>
    <span className="g-empty__ic" aria-hidden="true"><Icon n={icon} size={22} /></span>
    <div className="g-empty__b">{title && <b dir="auto">{title}</b>}{body && <p dir="auto">{body}</p>}</div>
    {action && <GBtn size={big ? '' : 'sm'} kind={action.kind ?? 'dark'} primary={big} sound="open" onClick={action.onClick}>{action.icon && <Icon n={action.icon} size={18} />}{action.label}</GBtn>}
  </div>;
}

export function useNow(ms = 1000, on = true) {
  const [now, set] = useState(Date.now());
  useEffect(() => { if (!on) return; const id = setInterval(() => set(Date.now()), ms); return () => clearInterval(id); }, [ms, on]);
  return now;
}
export function Lines({ n, max = 3, letters }: { n: number; max?: number; letters?: string[] }) {
  return <span className="lines" aria-hidden="true">{Array.from({ length: Math.max(max, n) }, (_, i) => <i key={i} className={i < n ? 'solid' : ''}>{letters ? letters[i] || '' : ''}</i>)}</span>;
}

// ---------------------------------------------------------------- the chip picker: one choice from a short list, as big chips
// (never a native <select>). A radiogroup: arrow keys move, the picked chip fills with the ink colour and pops.
export function Picks<V extends string>({ label, value, options, onChange }: { label: ReactNode; value: V; options: { v: V; label: ReactNode }[]; onChange: (v: V) => void }) {
  const pick = (v: V) => { if (v === value) return; sfx('ui.tap'); haptic('tap'); onChange(v); };
  const key = (e: RKeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
    e.preventDefault(); const i = options.findIndex((o) => o.v === value); const n = options[(i + d + options.length) % options.length];
    const row = e.currentTarget; pick(n.v); requestAnimationFrame(() => (row.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus());
  };
  return <div className="g-picks"><span className="g-picks__l g-mono">{label}</span>
    <div className="g-picks__row" role="radiogroup" onKeyDown={key}>{options.map((o) => <button key={o.v} type="button" role="radio" aria-checked={o.v === value} tabIndex={o.v === value ? 0 : -1}
      className="g-chip g-chip--pick" onClick={() => pick(o.v)}>{o.v === value && <Icon n="check" size={14} />}<span dir="auto">{o.label}</span></button>)}</div>
  </div>;
}

// ---------------------------------------------------------------- the catchphrase stamp (GOTY.md §12): the player's own line,
// slammed once on a Confirmed call that lands. The text is always the player's (a prop); the kit ships no default line.
export function CatchStamp({ line, slam = true, size = 'lg' }: { line: string; slam?: boolean; size?: 'sm' | 'lg' | 'xl' | '' }) {
  return <Stamp kind="catch" size={size} slam={slam}><span dir="auto">{line}</span></Stamp>;
}
