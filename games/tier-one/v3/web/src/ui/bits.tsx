import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';
import { crestSVG, portraitSVG, tallySVG } from '../lib/kit';
import type { WClub } from '../lib/engine';
import { sfx, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { onToasts } from '../lib/meta';
import { useT, fmtDate } from '../lib/i18n';
import { Icon, GBtn, haptic } from './game';

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
