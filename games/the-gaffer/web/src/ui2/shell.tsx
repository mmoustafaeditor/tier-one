// The frame every office screen sits in: one navigation element with two shapes (floating tab bar on phones, a
// sticky rail on desktop with Career and Club Pass added), the top bar with the club and the Continue button, sheets
// and toasts. Matchday screens use the solo shell (no navigation, a match bar instead).
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import type { Club } from '../model/types';
import { Crest, I } from './kit';

export type Tab = 'today' | 'squad' | 'match' | 'transfers' | 'club' | 'career' | 'pass' | 'news' | 'settings';
const TABS: { id: Tab; icon: string; extra?: boolean }[] = [
  { id: 'today', icon: 'today' }, { id: 'squad', icon: 'squad' }, { id: 'match', icon: 'whistle' }, { id: 'transfers', icon: 'market' }, { id: 'club', icon: 'club' },
  { id: 'career', icon: 'history', extra: true }, { id: 'pass', icon: 'store', extra: true },
  { id: 'news', icon: 'news', extra: true }, { id: 'settings', icon: 'gear', extra: true },
];
// On phones the extra items aren't in the bar: the area that holds them is marked current instead (UI/UX pass).
const PARENT: Partial<Record<Tab, Tab>> = { career: 'club', pass: 'club', settings: 'club', news: 'today' };

export function Shell({ tab, club, labels, onTab, solo, children, badge }: {
  tab: Tab | null; club?: Club; labels: Record<Tab, string>; onTab: (t: Tab) => void; solo?: boolean; children: ReactNode; badge?: Partial<Record<Tab, number>>;
}) {
  return (
    <div className={`shell${solo ? ' solo' : ''}`}>
      {!solo && (
        <nav className="nav" aria-label={labels.today}>
          <span className="nav-brand" aria-hidden="true">{club && <Crest club={club} size={40} />}</span>
          {TABS.map((x, i) => (
            <Fragment key={x.id}>
              {i === 5 && <span className="nav-sep" />}
              <a href={`#${x.id}`} className={x.extra ? 'nav-extra' : tab && PARENT[tab] === x.id ? 'nav-parent' : undefined} aria-current={tab === x.id ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); onTab(x.id); }}>
                <I n={x.icon} />
                <span>{labels[x.id]}</span>
                {badge?.[x.id] ? <em className="nav-badge" aria-label={String(badge[x.id])}>{badge[x.id]}</em> : null}
              </a>
            </Fragment>
          ))}
        </nav>
      )}
      <main className="main"><div className="page">{children}</div></main>
    </div>
  );
}

export function Topbar({ club, title, sub, back, backLabel, right }: { club?: Club; title: ReactNode; sub?: ReactNode; back?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <header className="topbar on-ground">
      <div className="club">
        {back ? <button className="icon-btn" aria-label={backLabel} onClick={back}><I n="back" /></button> : club ? <Crest club={club} size={32} /> : null}
        <div className="grow"><b>{title}</b>{sub && <small>{sub}</small>}</div>
      </div>
      {right}
    </header>
  );
}

export function Panel({ children, className = '', i = 0, flat, tight, label, as = 'section' }: { children: ReactNode; className?: string; i?: number; flat?: boolean; tight?: boolean; label?: string; as?: 'section' | 'article' | 'div' }) {
  const Tag = as;
  return <Tag className={`panel${flat ? ' panel--flat on-ground' : ''}${tight ? ' panel--tight' : ''} ${className}`} style={{ ['--i' as string]: i }} aria-label={label}>{children}</Tag>;
}

export function PanelHead({ title, right, as = 'h2' }: { title: ReactNode; right?: ReactNode; as?: 'h2' | 'h3' }) {
  const H = as;
  return <div className="panel-h"><H className="h2">{title}</H>{right}</div>;
}

// Bottom sheet on phones, a centred card on desktop. Escape / Android back close the top one (App wires the scrims).
export function Sheet({ label, onClose, children, wide }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={`sheet v2sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        <button className="sheet-x icon-btn" aria-label="✕" onClick={onClose}><I n="x" size="sm" /></button>
        {children}
      </div>
    </>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label, onGround, className = '' }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; onGround?: boolean; className?: string }) {
  // A row wider than the screen keeps its chosen segment in view (UX-05).
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => { inView(row.current); }, [value]);
  return (
    <div ref={row} className={`seg${onGround ? ' on-ground-seg' : ''} ${className}`} role="group" aria-label={label}>
      {options.map((o) => <button key={String(o.v)} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

// Scrolls a horizontal row (segments, chips) so its pressed item is visible, without moving the page.
export function inView(rowEl: HTMLElement | null) {
  const b = rowEl?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if (!rowEl || !b || rowEl.scrollWidth <= rowEl.clientWidth) return;
  const r = rowEl.getBoundingClientRect(), q = b.getBoundingClientRect();
  if (q.left < r.left) rowEl.scrollLeft -= r.left - q.left + 16;
  else if (q.right > r.right) rowEl.scrollLeft += q.right - r.right + 16;
}

export function Steps<T extends number>({ value, options, onChange, was, label }: { value: T; options: string[]; onChange: (v: T) => void; was?: T; label: string }) {
  return (
    <div className="steps" style={{ ['--n' as string]: options.length }} role="group" aria-label={label}>
      {options.map((o, i) => <button key={o} aria-pressed={i === value} className={was === i && i !== value ? 'was' : undefined} onClick={() => onChange(i as T)}>{o}</button>)}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips chips--scroll" role="group" aria-label={label}>
      {options.map((o) => <button key={o.v} className="chip" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

export function Stepper({ value, onChange, step, min = 0, max = Infinity, format, label }: { value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; format: (v: number) => string; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button className="icon-btn" aria-label="−" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}><I n="minus" size="sm" /></button>
      <b className="num ltr">{format(value)}</b>
      <button className="icon-btn" aria-label="+" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}><I n="plus" size="sm" /></button>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return <div className="v2toast" role="status" aria-live="polite">{text}</div>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="sw" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}
