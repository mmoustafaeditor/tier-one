// Small game-layer pieces shared by the secondary screens (Wire, Friends, Practice, Pass, How to, Settings).
import type { CSSProperties, ReactNode } from 'react';
import { sfx } from '../lib/sfx';
import { Icon } from './game';

// A game toggle: big thumb, colour when on.
export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return <button type="button" className={'g-toggle' + (on ? ' is-on' : '')} role="switch" aria-checked={on} aria-label={label} onClick={() => { sfx('ui.tap'); onChange(); }}><span /></button>;
}

// An initials badge for a person. Colour is stable per name; never a face.
const HUES = ['#FF5A36', '#F7B928', '#2FBF71', '#35C3E6', '#9E7BFF', '#FF5A7A', '#FF9A1F', '#5B8CFF'];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
export const initialsOf = (name: string) => (name || '?').trim().split(/\s+/).filter(Boolean).map((w) => [...w][0]).join('').slice(0, 2).toUpperCase() || '?';
export function Avatar({ name, size = 34, me, style }: { name: string; size?: number; me?: boolean; style?: CSSProperties }) {
  return <span className={'g-ava' + (me ? ' is-me' : '')} style={{ ['--ava' as string]: HUES[hash(name || '?') % HUES.length], ['--sz' as string]: size + 'px', ...style }} aria-hidden="true">{initialsOf(name)}</span>;
}

// Heat meter: flame, number and a hot gradient bar.
export function HeatMeter({ v, label }: { v: number; label: string }) {
  return <span className={'g-heat' + (v >= 60 ? ' is-hot' : '')} aria-label={label + ' ' + v + '/100'}>
    <Icon n="flame" /><b className="g-num">{v}</b>
    <span className="g-heat__bar" aria-hidden="true"><i style={{ width: Math.max(4, Math.min(100, v)) + '%' }} /></span>
  </span>;
}

// Chunky segmented picker.
export function Seg<T extends string | number>({ value, options, onChange, label, className = '' }: { value: T; options: { v: T; label: ReactNode; sub?: ReactNode }[]; onChange: (v: T) => void; label: string; className?: string }) {
  return <div className={'g-seg ' + className} role="group" aria-label={label}>
    {options.map((o) => <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => { sfx('ui.tap'); onChange(o.v); }}><b>{o.label}</b>{o.sub != null && <small>{o.sub}</small>}</button>)}
  </div>;
}

// Screen hero: a mode-coloured card with a tilted icon tile.
export function Hero({ mode, icon, kicker, title, sub, children, style }: { mode: string; icon: string; kicker: ReactNode; title: ReactNode; sub?: ReactNode; children?: ReactNode; style?: CSSProperties }) {
  return <section className={'g-hero g-hero--' + mode} style={style}>
    <span className="g-hero__art" aria-hidden="true"><Icon n={icon} /></span>
    <span className="g-mono g-hero__k">{kicker}</span>
    <h1 className="g-hero__t">{title}</h1>
    {sub && <p className="g-hero__s">{sub}</p>}
    {children}
  </section>;
}
