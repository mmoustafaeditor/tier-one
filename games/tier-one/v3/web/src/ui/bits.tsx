import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { crestSVG, portraitSVG, tallySVG } from '../lib/kit';
import type { WClub } from '../lib/engine';
import { sfx, type Sfx } from '../lib/sfx';

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

export function Sheet({ open, onClose, children, label, wide }: { open: boolean; onClose: () => void; children: ReactNode; label: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="scrim" onClick={onClose}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={'sheet sheet--float' + (wide ? ' sheet--wide' : '')} onClick={(e) => e.stopPropagation()}>
      <div className="sheet__grip" />{children}
    </div>
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
