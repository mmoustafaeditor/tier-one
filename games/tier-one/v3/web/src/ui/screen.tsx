// 4.1 "One screen" frame (games/tier-one/v3/UI41.md). Every page in the game renders inside <Screen>: a fixed header with a
// big back button and the page title, a body that fills the rest of the viewport and NEVER scrolls, and an optional footer
// for the page's one main action. Long lists use <Pager> (fixed rows per page + arrows), never a scrolling list.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import './screen.css';

export function Screen({ title, sub, onBack, right, footer, children, tone }: {
  title: ReactNode; sub?: ReactNode; onBack?: () => void; right?: ReactNode; footer?: ReactNode; children: ReactNode; tone?: string;
}) {
  useEffect(() => {
    if (!onBack) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onBack]);
  return (
    <section className="scr" data-tone={tone}>
      <header className="scr__head">
        {onBack ? <button className="scr__back" onClick={onBack} aria-label="Back"><span aria-hidden>‹</span><b>Back</b></button> : <span className="scr__back scr__back--none" />}
        <div className="scr__title"><h1>{title}</h1>{sub ? <p>{sub}</p> : null}</div>
        <div className="scr__right">{right}</div>
      </header>
      <div className="scr__body">{children}</div>
      {footer ? <footer className="scr__foot">{footer}</footer> : null}
    </section>
  );
}

// Paged list: `per` items a page, arrows + "2 / 5". Resets to page 1 when the item count changes (a filter applied).
export function Pager<T>({ items, per, render, empty }: { items: T[]; per: number; render: (x: T, i: number) => ReactNode; empty?: ReactNode }) {
  const [p, setP] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / per));
  useEffect(() => { setP(0); }, [items.length]);
  const page = useMemo(() => items.slice(p * per, p * per + per), [items, p, per]);
  if (!items.length) return <div className="pg pg--empty">{empty}</div>;
  return (
    <div className="pg">
      <div className="pg__list" style={{ ['--per' as string]: per }}>{page.map((x, i) => render(x, p * per + i))}</div>
      {pages > 1 && (
        <nav className="pg__nav">
          <button disabled={p === 0} onClick={() => setP(p - 1)} aria-label="Previous page">‹</button>
          <span>{p + 1} / {pages}</span>
          <button disabled={p >= pages - 1} onClick={() => setP(p + 1)} aria-label="Next page">›</button>
        </nav>
      )}
    </div>
  );
}

// Filter chips row (one line, no wrap; the selected chip is filled).
export function Chips<K extends string>({ value, options, onChange }: { value: K; options: { k: K; label: ReactNode }[]; onChange: (k: K) => void }) {
  return <div className="chips" role="tablist">{options.map((o) => <button key={o.k} role="tab" aria-selected={o.k === value} className={o.k === value ? 'on' : ''} onClick={() => onChange(o.k)}>{o.label}</button>)}</div>;
}
