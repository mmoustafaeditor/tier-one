// The Wire's data: rumours from /api/data/rumours (the Semba data service, real or fictional names per its switch)
// joined with our own layer (Market, crowd split, my calls) from /api/tier-one/v3.
import { useEffect, useState } from 'react';
import { data, v3 } from './api';
import { getSave } from './save';
import { recordWireResolution } from './byline';
import { currentWireWindow } from './season';

export interface Rumour {
  id: string; playerId: string; playerName: string; currentClubId: string; currentClubName: string; linked: { clubId: string | null; name: string; stage: string }[];
  fee: { min: number; max: number; currency: string } | null; window: string; fact: string | null; outlets: { name?: string; tier: number; date?: string }[];
  credibility: string; firstSeen: string; lastSeen: string; status: string; heat: number;
}
export interface WireCall { rid: string; yes: boolean; s: number; club: string | null; fee: string | null; m: number; c: number; at: number; corrected?: boolean; done?: boolean; outcome?: string; outClub?: string | null; pts?: number; right?: boolean | null; heat?: number; paper?: number; mNow?: number; player?: string; from?: string }
export interface BoardItem { market: number; state: string; split: { yes: number; no: number }; mine: WireCall | null }
export interface WireWindow { id: string; opens: string; closes: string }
export interface WireState { rumours: Rumour[] | null; asOf: string; names: string; board: Record<string, BoardItem>; callsToday: number; mine: { calls: WireCall[]; cred: number; hitRate: number; resolved: number; season?: string } | null; online: boolean; loading: boolean; window: WireWindow }

// The window the Wire is framed for (GOTY §5). The server sends its own (wire.mjs › WIRE.CURRENT); this is the fallback.
export const CURRENT_WINDOW: WireWindow = (() => { const w = currentWireWindow(); return { id: w.id, opens: w.opens, closes: w.closes }; })(); // lib/season.ts › WIRE_WINDOWS is the one list
let cache: WireState = { rumours: null, asOf: '', names: 'real', board: {}, callsToday: 0, mine: null, online: true, loading: false, window: CURRENT_WINDOW };
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
      v3<{ items: Record<string, BoardItem>; callsToday: number; window?: WireWindow }>('wire.board', { dev: s.dev }),
      v3<{ calls: WireCall[]; cred: number; hitRate: number; resolved: number; season?: string }>('wire.mine', { dev: s.dev, nick: s.nick }),
    ]);
    cache = {
      rumours: rs && rs.ok ? rs.rumours : cache.rumours, asOf: rs ? rs.asOf : cache.asOf, names: rs ? rs.names : cache.names,
      board: board.ok ? board.items : cache.board, callsToday: board.ok ? board.callsToday : cache.callsToday,
      mine: mine.ok ? { calls: mine.calls, cred: mine.cred, hitRate: mine.hitRate, resolved: mine.resolved, season: mine.season } : cache.mine,
      online: !!(rs && rs.ok), loading: false, window: board.ok && board.window ? board.window : cache.window,
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

// ---------- ON THE WIRE (GOTY §1.6): which players in any mode are live on the Wire right now.
// Only the rumours list is needed, so screens outside the Wire fetch just that (once), never the calls or the board.
let rumoursOnly: Promise<void> | null = null;
export function ensureRumours(): Promise<void> {
  if (cache.rumours) return Promise.resolve();
  if (inflight) return inflight;
  if (!rumoursOnly) rumoursOnly = (async () => {
    const rs = await data<{ ok: boolean; asOf: string; names: string; rumours: Rumour[] }>('rumours?limit=60');
    if (rs && rs.ok && !cache.rumours) { cache = { ...cache, rumours: rs.rumours, asOf: rs.asOf, names: rs.names }; emit(); }
    if (!rs || !rs.ok) rumoursOnly = null; // try again next time a chip mounts
  })();
  return rumoursOnly;
}
export const normName = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
export type WireKey = { id?: string; n?: string; name?: string; s?: string; playerName?: string };
function isLive(r: Rumour): boolean {
  if (r.status && r.status !== 'open') return false;
  const b = cache.board[r.id];
  return !b || b.state === 'open' || b.state === 'frozen';
}
/** The live Wire rumour about this player, or null. Matches by player id, then by normalised full or short name. */
export function wireFor(player: WireKey | null | undefined, rumours: Rumour[] | null = cache.rumours): Rumour | null {
  if (!player || !rumours || !rumours.length) return null;
  const live = rumours.filter(isLive);
  if (player.id) { const r = live.find((x) => x.playerId === player.id); if (r) return r; }
  const names = [player.n, player.name, player.playerName, player.s].filter(Boolean).map((x) => normName(x!)).filter((x) => x.length > 3);
  if (!names.length) return null;
  return live.find((x) => names.includes(normName(x.playerName))) || null;
}
/** Hook form: subscribes to the Wire cache and fetches the rumours list on first use. */
export function useWireFor(player: WireKey | null | undefined): Rumour | null {
  const [s, set] = useState(cache);
  useEffect(() => { subs.add(set); ensureRumours(); return () => { subs.delete(set); }; }, []);
  return wireFor(player, s.rumours);
}
/** '2027-01' → 'winter', '2027-summer' → 'summer' (for i18n keys), plus the year. */
export const windowParts = (w: string) => { const m = /^(\d{4})-(01|summer)$/.exec(w || ''); return m ? { k: m[2] === '01' ? 'winter' : 'summer', y: m[1] } : null; };
