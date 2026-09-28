// Small shared pieces used by every screen.
import type { ReactNode } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Player, Position } from '../model/types';
import { FLAG } from '../data/names';
import { ageOf, money } from '../sim/world';
import backIcon from '../../../../../design/assets/icons/ui/back.svg?raw';

export const GROUP: Record<Position, number> = { GK: 0, CB: 1, LB: 1, RB: 1, CDM: 2, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 3 };

export const Icon = ({ svg }: { svg: string }) => <span aria-hidden="true" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: svg }} />;
export const Stars = ({ n }: { n: number }) => <span className="stars" aria-label={`${n}/5`}>{'★'.repeat(Math.floor(n))}{n % 1 ? '½' : ''}</span>;

export function AppBar({ back, backLabel, title, sub }: { back?: () => void; backLabel?: string; title: string; sub?: string }) {
  return (
    <header className="appbar">
      {back ? <button className="iconbtn" aria-label={backLabel} onClick={back}><Icon svg={backIcon} /></button> : <div />}
      <div className="ttl">{title}{sub && <small>{sub}</small>}</div>
      <div className="right" />
    </header>
  );
}

export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="g-stat">
      <span className="num"><span className="ltr">{value}</span>{unit && <small>{unit}</small>}</span>
      <small>{label}</small>
    </div>
  );
}

export function Line({ k, v, unit }: { k: string; v: string; unit?: string }) {
  return (
    <div className="cell">
      <span className="cmain"><span>{k}</span></span>
      <b className="num"><span className="ltr">{v}</span>{unit && <small className="muted">{unit}</small>}</b>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="card" style={{ marginTop: 'var(--s5)', textAlign: 'center' }}>
      <p className="muted" style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

// Result from the user's side: coloured W/D/L score.
export function Score({ f, me }: { f: [string, string, number, number]; me: string }) {
  const [mine, theirs] = f[0] === me ? [f[2], f[3]] : [f[3], f[2]];
  const cls = mine > theirs ? 'g-ok' : mine < theirs ? 'g-bad' : 'muted';
  return <b className={`num ${cls}`}>{mine}–{theirs}</b>;
}

// Injury / ban / listed / contract badges shown next to a player.
export function Badges({ p, t, season }: { p: Player; t: Strings; season: number }) {
  return (
    <>
      {p.injured > 0 && <span className="tag g-down">✚ {p.injured}</span>}
      {p.banned > 0 && <span className="tag g-down">▮ {p.banned}</span>}
      {p.listed && <span className="tag dd">{t.listed}</span>}
      {p.clubId !== 'free' && p.contractUntil <= season + 1 && <span className="tag g-warn">⏳</span>}
    </>
  );
}

export function PlayerRow({ p, lang, t, season, onClick, right, sub }: {
  p: Player; lang: Lang; t: Strings; season: number; onClick: () => void; right?: ReactNode; sub?: ReactNode;
}) {
  return (
    <button className="cell" onClick={onClick}>
      <span className="g-shirt num">{p.shirtNumber || '–'}</span>
      <span className="cmain">
        <b>{p.name[lang]} <Badges p={p} t={t} season={season} /></b>
        <span>{sub ?? <>{p.position} · {ageOf(p, season)} · {FLAG[p.nationality] ?? p.nationality} · <span className="num ltr">{money(p.marketValue)}</span></>}</span>
        <i className="g-fit" style={{ ['--f' as string]: `${p.fitness}%` }} />
      </span>
      {right ?? <span className="g-rating num">{p.rating}</span>}
    </button>
  );
}

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </>
  );
}

// − value + stepper for money and years.
export function Stepper({ value, onChange, step, min = 0, max = Infinity, format }: {
  value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; format: (v: number) => string;
}) {
  return (
    <div className="g-stepper">
      <button className="iconbtn solid" aria-label="−" disabled={value - step < min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <b className="num ltr">{format(value)}</b>
      <button className="iconbtn solid" aria-label="+" disabled={value + step > max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}
