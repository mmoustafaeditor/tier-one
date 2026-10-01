// One-screen pages (owner rule: good games don't scroll). Shared parts for every page that fits one viewport:
//   usePaged(list, per, resetKey?, startAt?) → { page, pages, rows, prev, next }, clamped when the list shrinks
//   <Pager p={...} />     → ‹ 2/5 › arrows (renders nothing for a single page)
//   <Tip id="home" />     → a first-time tip, one short line, closable (✕) and never shown again (localStorage)
//   resetTips()           → Settings › Show tips again
import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { Icon } from './game';

export function usePaged<T>(list: T[], per: number, resetKey?: unknown, startAt = 0) {
  const [page, setPage] = useState(startAt);
  const pages = Math.max(1, Math.ceil(list.length / per));
  useEffect(() => { setPage(startAt); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = Math.min(page, pages - 1);
  return {
    page: p, pages, rows: list.slice(p * per, p * per + per),
    prev: () => { sfx('ui.tap'); setPage(Math.max(0, p - 1)); },
    next: () => { sfx('ui.tap'); setPage(Math.min(pages - 1, p + 1)); },
  };
}
export function Pager({ p, className = '' }: { p: { page: number; pages: number; prev: () => void; next: () => void }; className?: string }) {
  const t = useT();
  if (p.pages <= 1) return null;
  return <div className={'fit-pager ' + className} role="group" aria-label={t('hub.page', { a: p.page + 1, b: p.pages })}>
    <button type="button" onClick={p.prev} disabled={p.page === 0} aria-label={t('hub.prev')}>‹</button>
    <span className="g-num">{p.page + 1}/{p.pages}</span>
    <button type="button" onClick={p.next} disabled={p.page >= p.pages - 1} aria-label={t('hub.next')}>›</button>
  </div>;
}

// ---------------------------------------------------------------- first-time tips
const TIP_KEY = 't1.tips.seen';
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(TIP_KEY) || '[]'); } catch { return []; } };
const listeners = new Set<() => void>();
export function resetTips() { try { localStorage.removeItem(TIP_KEY); } catch { /* storage blocked: tips just show */ } listeners.forEach((f) => f()); }
export function Tip({ id }: { id: 'home' | 'board' | 'player' | 'career' | 'market' }) {
  const t = useT();
  const [seen, setSeen] = useState(() => readSeen().includes(id));
  useEffect(() => { const f = () => setSeen(readSeen().includes(id)); listeners.add(f); return () => { listeners.delete(f); }; }, [id]);
  if (seen) return null;
  const close = () => {
    sfx('ui.tap'); setSeen(true);
    try { localStorage.setItem(TIP_KEY, JSON.stringify([...new Set([...readSeen(), id])])); } catch { /* storage blocked */ }
  };
  return <div className="fit-tip" role="note">
    <Icon n="help" size={16} />
    <span dir="auto">{t('hub.tip.' + id)}</span>
    <button type="button" onClick={close} aria-label={t('common.close')}><Icon n="x" size={16} /></button>
  </div>;
}
