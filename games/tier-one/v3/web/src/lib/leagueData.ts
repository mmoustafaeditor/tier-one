import { useEffect, useState } from 'react';
import { v3 } from './api';
import { getSave } from './save';

export interface LeagueRow { nick: string; pts: number; daily: number; wire: number; me: boolean }
export interface League { week: string; div: number; divs: string[]; up: number; down: number; size: number; rows: LeagueRow[]; last: { rank: number; size: number; from: number; to: number } | null }
let cache: League | null = null, at = 0;
export function useLeague(): League | null {
  const [l, set] = useState(cache);
  useEffect(() => {
    if (cache && Date.now() - at < 60000) return;
    const s = getSave();
    v3<League>('league.me', { dev: s.dev, nick: s.nick }).then((r) => { if (r.ok) { cache = r as unknown as League; at = Date.now(); set(cache); } });
  }, []);
  return l;
}
export const myRow = (l: League | null) => (l ? l.rows.findIndex((r) => r.me) : -1);
