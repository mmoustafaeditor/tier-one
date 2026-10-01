// 4.1 first-time hints (UI41.md §Hints): one short tip per screen, shown the first time, closed with ✕ and never shown again.
// Settings › "Show tips again" calls resetHints().
import { useState } from 'react';
import './hint.css';

const KEY = 't1_hints_seen';
const seen = (): Record<string, 1> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
export const hintSeen = (id: string) => !!seen()[id];
export function markHint(id: string) { try { localStorage.setItem(KEY, JSON.stringify({ ...seen(), [id]: 1 })); } catch {} }
export function resetHints() { try { localStorage.removeItem(KEY); } catch {} }

export function Hint({ id, children, place = 'bottom' }: { id: string; children: React.ReactNode; place?: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(() => !hintSeen(id));
  if (!open) return null;
  return (
    <div className={'hint hint--' + place} role="note">
      <span className="hint__i" aria-hidden>i</span>
      <p>{children}</p>
      <button aria-label="Close tip" onClick={() => { markHint(id); setOpen(false); }}>✕</button>
    </div>
  );
}
