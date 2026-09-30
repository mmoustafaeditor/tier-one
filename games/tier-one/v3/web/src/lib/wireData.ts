// The Wire's data: rumours from /api/data/rumours (the Semba data service, real or fictional names per its switch)
// joined with our own layer (Market, crowd split, my calls) from /api/tier-one/v3.
import { useEffect, useState } from 'react';
import { data, v3 } from './api';
import { getSave } from './save';
import { recordWireResolution } from './byline';

export interface Rumour {
  id: string; playerId: string; playerName: string; currentClubId: string; currentClubName: string; linked: { clubId: string | null; name: string; stage: string }[];
  fee: { min: number; max: number; currency: string } | null; window: string; fact: string | null; outlets: { name?: string; tier: number; date?: string }[];
  credibility: string; firstSeen: string; lastSeen: string; status: string; heat: number;
}
export interface WireCall { rid: string; yes: boolean; s: number; club: string | null; fee: string | null; m: number; c: number; at: number; corrected?: boolean; done?: boolean; outcome?: string; outClub?: string | null; pts?: number; right?: boolean | null; heat?: number; paper?: number; mNow?: number; player?: string; from?: string }
export interface BoardItem { market: number; state: string; split: { yes: number; no: number }; mine: WireCall | null }
export interface WireState { rumours: Rumour[] | null; asOf: string; names: string; board: Record<string, BoardItem>; callsToday: number; mine: { calls: WireCall[]; cred: number; hitRate: number; resolved: number } | null; online: boolean; loading: boolean }

let cache: WireState = { rumours: null, asOf: '', names: 'real', board: {}, callsToday: 0, mine: null, online: true, loading: false };
const subs = new Set<(s: WireState) => void>();
const emit = () => subs.forEach((f) => f(cache));
let inflight: Promise<void> | null = null;

export function refreshWire(force = false): Promise<void> {
  if (inflight && !force) return inflight;
  cache = { ...cache, loading: true }; emit();
  inflight = (async () => {
    const s = getSave();
    const [rs, board, mine] = await Promise.all([
      data<{ ok: boolean; asOf: string; names: string; rumours: Rumour[] }>('rumours?limit=60'),
      v3<{ items: Record<string, BoardItem>; callsToday: number }>('wire.board', { dev: s.dev }),
      v3<{ calls: WireCall[]; cred: number; hitRate: number; resolved: number }>('wire.mine', { dev: s.dev, nick: s.nick }),
    ]);
    cache = {
      rumours: rs && rs.ok ? rs.rumours : cache.rumours, asOf: rs ? rs.asOf : cache.asOf, names: rs ? rs.names : cache.names,
      board: board.ok ? board.items : cache.board, callsToday: board.ok ? board.callsToday : cache.callsToday,
      mine: mine.ok ? { calls: mine.calls, cred: mine.cred, hitRate: mine.hitRate, resolved: mine.resolved } : cache.mine,
      online: !!(rs && rs.ok), loading: false,
    };
    if (cache.mine) { const rs2 = cache.rumours || []; recordWireResolution(cache.mine.calls, (rid) => rs2.find((r) => r.id === rid)?.playerName); }
    emit(); inflight = null;
  })();
  return inflight;
}
export function useWire(): WireState {
  const [s, set] = useState(cache);
  useEffect(() => { subs.add(set); if (!cache.rumours && !cache.loading) refreshWire(); return () => { subs.delete(set); }; }, []);
  return s;
}
export const gradeOf = (tier: number) => ['A', 'A', 'B', 'C', 'D'][Math.max(0, Math.min(4, tier))];
export const bestTier = (r: Rumour) => Math.min(4, ...r.outlets.map((o) => o.tier || 4));
export const stageOf = (r: Rumour) => { const order = ['interest', 'talks', 'bid', 'agreed']; return r.linked.reduce((m, l) => (order.indexOf(l.stage) > order.indexOf(m) ? l.stage : m), 'interest'); };
