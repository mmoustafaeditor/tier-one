// The Wire's data: rumours from /api/data/rumours (the Semba data service, real or fictional names per its switch)
// joined with our own layer (Market, crowd split, my calls) from /api/tier-one/v3.
import { useEffect, useState } from 'react';
import { data, v3 } from './api';
import { getSave, update, type Save } from './save';
import { recordWireResolution } from './byline';
import { currentWireWindow } from './season';
import { WORLD, WR } from './engine';
import { onWireRight } from './meta';
import { grantTip } from './tips';

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
    if (cache.mine) { const m = cache.mine; update((x) => { mk(x).profile = { cred: Math.round(m.cred), hit: m.hitRate, resolved: m.resolved, season: m.season || '', at: Date.now() }; }); }
    landed.push(...settleMarket(cache));
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

// ================================================================ The Market (CONCEPT4 §9): watch, pay, profile
// Everything below is the Market's own layer over the Wire data above. Watching is free from Level 1; calling opens at
// Level 2 (lib/economy.ts levelUnlocks.market). `save.market` holds the watchlist, the season profile and the paid marks.
export interface WatchSnap { at: number; m: number; state: string; status: string; stage: string; name: string }
export interface MarketSave { watch?: Record<string, WatchSnap>; profile?: { cred: number; hit: number; resolved: number; season: string; at: number }; seen?: Record<string, 1> }
type MarketHost = Save & { market?: MarketSave };
const mk = (s: Save): MarketSave => { const h = s as MarketHost; return (h.market = h.market || {}); };
export const marketOf = (s: Save): MarketSave => (s as MarketHost).market || {};

/** What a right Market call pays, by the player's star (0 unrated … 3): 15 / 25 / 40 / 70 coins (CONCEPT4 §9). */
export const MARKET_COINS = [15, 25, 40, 70] as const;
/** A market move worth a tray line: the same 15 points the server's Heat uses (wire.mjs WIRE.HEAT_MOVE). */
export const MARKET_MOVE: number = (WR.WIRE as unknown as { HEAT_MOVE?: number }).HEAT_MOVE ?? 0.15;
/** A Scoop-grade Market call: a right Drop against a market under 35%. */
export const SCOOP_GRADE = 0.35;
export const starOf = (r?: Pick<Rumour, 'playerId'> | null) => (r && WORLD.players.find((x) => x.id === r.playerId)?.star) || 0;
/** The market's number for a rumour, from the board when the server has it, else the data rule. */
export const marketNow = (r: Rumour, st: WireState = cache) => st.board[r.id]?.market ?? WR.marketOf(r);

// ---------------------------------------------------------------- the watchlist
const snapOf = (r: Rumour, st: WireState): WatchSnap => ({ at: Date.now(), m: marketNow(r, st), state: st.board[r.id]?.state || (r.status === 'open' ? 'open' : r.status), status: r.status, stage: stageOf(r), name: r.playerName });
export const isWatched = (s: Save, rid: string) => !!marketOf(s).watch?.[rid];
export const watchList = (s: Save) => Object.entries(marketOf(s).watch || {}).map(([rid, w]) => ({ rid, ...w })).sort((a, b) => b.at - a.at);
/** Watch or unwatch a rumour (free, no level gate). Returns the new state. */
export function toggleWatch(r: Rumour): boolean {
  let on = false;
  update((s) => { const m = mk(s); const w = (m.watch = m.watch || {}); if (w[r.id]) delete w[r.id]; else { w[r.id] = snapOf(r, cache); on = true; } });
  return on;
}
export type WatchEvent = { rid: string; name: string; kind: 'status' | 'move' | 'resolved'; from: number; to: number; stage: string; status: string };
/** Compares the watchlist with the latest data: a status change, a 15-point move, a resolution. Updates the snapshots. */
export function watchEvents(st: WireState = cache): WatchEvent[] {
  const s = getSave(), w = marketOf(s).watch;
  if (!w || !st.rumours) return [];
  const out: WatchEvent[] = [];
  const next: Record<string, WatchSnap> = {};
  for (const [rid, old] of Object.entries(w)) {
    const r = st.rumours.find((x) => x.id === rid);
    if (!r) { next[rid] = old; continue; } // out of the list for now: nothing to say
    const cur = snapOf(r, st);
    let fire: WatchEvent['kind'] | null = null;
    if (old.status === 'open' && cur.status !== 'open') fire = 'resolved';
    else if (cur.stage !== old.stage || cur.state !== old.state) fire = 'status';
    else if (Math.abs(cur.m - old.m) >= MARKET_MOVE) fire = 'move';
    if (fire) out.push({ rid, name: r.playerName, kind: fire, from: old.m, to: cur.m, stage: cur.stage, status: cur.status });
    // A move is measured from the last time we told you; the rest of the snapshot always follows the data.
    next[rid] = { ...cur, at: old.at, m: fire === 'move' || fire === 'resolved' ? cur.m : old.m };
  }
  update((x) => { const m = mk(x); if (m.watch) for (const k of Object.keys(next)) if (m.watch[k]) m.watch[k] = next[k]; });
  return out;
}

// ---------------------------------------------------------------- right calls pay into the account
export interface Landed { rid: string; name: string; right: boolean; pts: number; coins: number; tip: boolean; scoopGrade: boolean }
const landed: Landed[] = [];
/** Calls that settled since the last read (the tray lines); emptied by the read. */
export const takeLanded = (): Landed[] => landed.splice(0);
/** Right calls pay once: XP and coins by star (lib/meta.ts onWireRight, through credit()) and a Tip (hold 3). */
function settleMarket(st: WireState): Landed[] {
  if (!st.mine) return [];
  const s = getSave(), out: Landed[] = [];
  const fresh = st.mine.calls.filter((c) => c.done && c.outcome !== 'void' && (c.right === true || c.right === false) && !s.stats['wr:' + c.rid]);
  if (!fresh.length) return [];
  update((x) => { for (const c of fresh) x.stats['wr:' + c.rid] = 1; });
  for (const c of fresh) {
    const r = (st.rumours || []).find((x) => x.id === c.rid);
    const name = r?.playerName || c.player || '';
    if (!c.right) { out.push({ rid: c.rid, name, right: false, pts: c.pts || 0, coins: 0, tip: false, scoopGrade: false }); continue; }
    const g = onWireRight(MARKET_COINS[Math.max(0, Math.min(3, starOf(r)))], c.rid);
    let tip = false;
    update((x) => { tip = grantTip(x, 'market:' + c.rid); });
    out.push({ rid: c.rid, name, right: true, pts: c.pts || 0, coins: g.coins, tip, scoopGrade: c.s >= 3 && c.c < SCOOP_GRADE });
  }
  return out;
}

// ---------------------------------------------------------------- the profile line (Lens)
/** Market season Cred and hit rate for the profile, from the last refresh (works offline). */
export function marketProfile(s: Save = getSave()): { cred: number; hit: number | null; resolved: number; season: string } | null {
  const p = marketOf(s).profile;
  if (!p) return null;
  return { cred: p.cred, hit: p.resolved > 0 ? p.hit : null, resolved: p.resolved, season: p.season };
}
/** The deal a Market call states in one sentence: what it wins if right, what it loses if wrong (wire.mjs wirePoints,
 *  before the lead bonus and the where / fee extras). `s` is the backing 1 Hint · 2 Post · 3 Drop. */
export function marketDeal(moves: boolean, s: number, m: number) {
  const c = moves ? m : 1 - m, r1 = (x: number) => Math.round(x * 10) / 10;
  return { win: r1(s * (10 * (1 - c) + 2)), lose: r1(s * 10 * c), c };
}

// ================================================================ 4.1 (UI41 §Transfer Wire): filters and the home badge
/** The league a rumour belongs to: the player's current club's league (world ids like 'eng1'), or '' if unknown. */
export const leagueOf = (r: Rumour) => WORLD.clubs.find((c) => c.id === r.currentClubId)?.l || '';
/** Every club in a rumour: where he is and who's linked (ids where known, else the name). */
export const clubsOf = (r: Rumour) => [{ id: r.currentClubId, name: r.currentClubName }, ...r.linked.map((l) => ({ id: l.clubId || l.name, name: l.name }))];
/** Resolved calls you haven't looked at yet: the red dot on the Transfer Market tile. */
export function wireBadge(s: Save = getSave(), st: WireState = cache): number {
  const seen = marketOf(s).seen || {};
  return (st.mine?.calls || []).filter((c) => c.done && !seen[c.rid]).length;
}
/** Opening My calls clears the dot. */
export function markCallsSeen(calls: WireCall[]) {
  const ids = calls.filter((c) => c.done && !marketOf(getSave()).seen?.[c.rid]).map((c) => c.rid);
  if (ids.length) update((x) => { const m = mk(x); m.seen = m.seen || {}; for (const id of ids) m.seen[id] = 1; });
}
