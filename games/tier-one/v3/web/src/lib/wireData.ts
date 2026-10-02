// The Transfer Market's data (LAUNCH_BRIEF §18–§19, spec I): rumours from /api/data/rumours (the data snapshot, real or
// fictional names per its switch) joined with our own layer (Market price, the room's split, my calls, the player's
// roster status) from /api/tier-one/v3, plus the server-managed transfer calendar (windows, deadline days, flags,
// Market availability). No date is typed in the client: calendar.mjs is the build-time fallback, `wire.calendar` and
// `wire.board` replace it on boot, and the last good copy is kept in localStorage for the next cold start.
import { useEffect, useState } from 'react';
import { data, v3 } from './api';
import { getSave } from './save';
import { recordWireResolution } from './byline';
import { applyWireCalendar, type WireWindowDef } from './season';
import { noteRumourMoves } from './notes';
import * as CAL from '../../../../../../api/tier-one/v3/_lib/calendar.mjs';
import * as WRM from '../../../../../../api/tier-one/v3/_lib/wire.mjs';

export interface Rumour {
  id: string; playerId: string; playerName: string; currentClubId: string; currentClubName: string; linked: { clubId: string | null; name: string; stage: string }[];
  fee: { min: number; max: number; currency: string } | null; window: string; fact: string | null; outlets: { name?: string; tier: number; date?: string }[];
  credibility: string; firstSeen: string; lastSeen: string; status: string; heat: number;
}
export interface WirePartsView { main?: number; lose?: number; where?: number; fee?: number; lead?: number; late?: boolean }
export interface WireCall { rid: string; yes: boolean; s: number; club: string | null; fee: string | null; m: number; c: number; at: number; cRoom?: number | null; corrected?: boolean; done?: boolean; outcome?: string; outClub?: string | null; outFee?: string | null; pts?: number; right?: boolean | null; parts?: WirePartsView; room?: 'beat' | 'lost' | null; paper?: number; frozen?: boolean; mNow?: number; player?: string; from?: string }
export type PlayerStatus = 'club' | 'loan' | 'free' | 'unknown';
export interface BoardItem { market: number; state: string; split: { yes: number; no: number }; mine: WireCall | null; ps?: PlayerStatus; loanFrom?: string | null }
export interface WireWindow { id: string; key: 'winter' | 'summer'; opens: string; closes: string; deadline: string; leagues?: Record<string, { closes: string; deadline?: string }> }
export interface MarketAvail { open: boolean; why: '' | 'paused' | 'flag'; note: string }
export interface Calendar { v: number; asOf: string; source: 'default' | 'override'; now: number; settleGraceH: number; windows: WireWindow[]; closed: WireWindow[]; flags: { ddLive: boolean; market: boolean }; market: MarketAvail; current: WireWindow | null; deadlineDays: Record<string, string> }
export interface FreeAgent { id: string; n: string; since: string; lastClub: string | null; lastClubId: string | null }
export interface WireLimits { daily: number; open: number; correctMin: number }
export interface WireMine { calls: WireCall[]; cred: number; hitRate: number; resolved: number; beat?: number; season?: string }
export interface WireState { rumours: Rumour[] | null; asOf: string; names: string; board: Record<string, BoardItem>; callsToday: number; mine: WireMine | null; online: boolean; loading: boolean; window: WireWindow; calendar: Calendar; market: MarketAvail; freeAgents: FreeAgent[]; limits: WireLimits }

// ---------- the rules the client prints (read from the server module itself, never retyped)
type WireRules = { DAILY_CALLS: number; OPEN_CALLS: number; CORRECT_MIN: number; LATE_HOURS: number; LEAD_X: number; LEAD_DAYS: number; MIN_RIGHT: number; DEST_RIGHT: number; DEST_WRONG: number; FEE_RIGHT: number; FEE_WRONG: number; ROOM_X: number; ROOM_MIN: number; FEE_BANDS: string[] };
const W = WRM as unknown as { WIRE: WireRules; marketOf(r: Rumour): number; stakeOf(yes: boolean, s: number, m: number): { c: number; win: number; lose: number } };
export const WIRE: WireRules = W.WIRE;
export const marketOf = (r: Rumour) => W.marketOf(r);
/** What a call stands to win or lose at this price (before the lead bonus and extras). */
export const stakeOf = (yes: boolean, s: number, m: number) => W.stakeOf(yes, s, m);

// ---------- the calendar
type CalMod = { CALENDAR_DEFAULT: unknown; mergeCalendar(b: unknown, o: unknown): unknown; publicCalendar(c: unknown, now: number): Calendar };
const C = CAL as unknown as CalMod;
const CAL_LS = 't1.cal.v1';
const builtIn = (): Calendar => C.publicCalendar(C.mergeCalendar(C.CALENDAR_DEFAULT, null), Date.now());
const readLS = (): Calendar | null => { try { const x = JSON.parse(localStorage.getItem(CAL_LS) || 'null'); return x && Array.isArray(x.windows) && x.windows.length ? (x as Calendar) : null; } catch { return null; } };
const toDefs = (cal: Calendar): WireWindowDef[] => cal.windows.map((w) => ({ id: w.id, key: w.key, opens: w.opens, closes: w.closes, deadline: w.deadline }));
/** The window the Market is framed for now: open, else next to open, else the last known. Pure; `now` for tests. */
export function currentWindowOf(cal: Calendar, now = Date.now()): WireWindow {
  const ws = cal.windows.slice().sort((a, b) => a.opens.localeCompare(b.opens));
  return ws.find((w) => now < Date.parse(w.closes)) || ws[ws.length - 1];
}
let calendarNow: Calendar = readLS() || builtIn();
applyWireCalendar(toDefs(calendarNow));
function takeCalendar(cal: Calendar | undefined | null) {
  if (!cal || !Array.isArray(cal.windows) || !cal.windows.length) return;
  calendarNow = cal;
  applyWireCalendar(toDefs(cal));
  try { localStorage.setItem(CAL_LS, JSON.stringify(cal)); } catch { /* storage blocked: the fetch still applied */ }
}
let calFetch: Promise<void> | null = null;
/** Fetches the server calendar once per session (the board refresh carries it too). Safe to call from anywhere. */
export function loadCalendar(): Promise<void> {
  if (!calFetch) calFetch = v3<{ calendar: Calendar }>('wire.calendar', {}, 7000).then((r) => { if (r.ok && r.calendar) { takeCalendar(r.calendar); cache = { ...cache, calendar: calendarNow, market: calendarNow.market, window: currentWindowOf(calendarNow) }; emit(); } else calFetch = null; }).catch(() => { calFetch = null; });
  return calFetch;
}
export const getCalendar = () => calendarNow;
export function useCalendar(): Calendar {
  const [s, set] = useState(cache);
  useEffect(() => { subs.add(set); loadCalendar(); return () => { subs.delete(set); }; }, []);
  return s.calendar;
}
if (typeof window !== 'undefined') setTimeout(() => { loadCalendar(); }, 1500); // after the first paint; nothing waits on it

// ---------- the store
export const CURRENT_WINDOW: WireWindow = currentWindowOf(calendarNow);
let cache: WireState = { rumours: null, asOf: '', names: 'real', board: {}, callsToday: 0, mine: null, online: true, loading: false, window: CURRENT_WINDOW, calendar: calendarNow, market: calendarNow.market, freeAgents: [], limits: { daily: WIRE.DAILY_CALLS, open: WIRE.OPEN_CALLS, correctMin: WIRE.CORRECT_MIN } };
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
      v3<{ items: Record<string, BoardItem>; callsToday: number; window?: WireWindow; calendar?: Calendar; market?: MarketAvail; freeAgents?: FreeAgent[]; limits?: WireLimits; asOf?: string }>('wire.board', { dev: s.dev }),
      v3<WireMine>('wire.mine', { dev: s.dev, nick: s.nick }),
    ]);
    if (board.ok && board.calendar) takeCalendar(board.calendar);
    cache = {
      rumours: rs && rs.ok ? rs.rumours : cache.rumours, asOf: rs ? rs.asOf : board.ok && board.asOf ? board.asOf : cache.asOf, names: rs ? rs.names : cache.names,
      board: board.ok ? board.items : cache.board, callsToday: board.ok ? board.callsToday : cache.callsToday,
      mine: mine.ok ? { calls: mine.calls, cred: mine.cred, hitRate: mine.hitRate, resolved: mine.resolved, beat: mine.beat, season: mine.season } : cache.mine,
      online: !!(rs && rs.ok), loading: false, window: board.ok && board.window ? board.window : currentWindowOf(calendarNow),
      calendar: calendarNow, market: board.ok && board.market ? board.market : calendarNow.market,
      freeAgents: board.ok && board.freeAgents ? board.freeAgents : cache.freeAgents, limits: board.ok && board.limits ? board.limits : cache.limits,
    };
    if (cache.mine) { const rs2 = cache.rumours || []; recordWireResolution(cache.mine.calls, (rid) => rs2.find((r) => r.id === rid)?.playerName); }
    // The bell: a rumour you have an open call on moved a stage (lib/notes.ts).
    if (cache.mine && cache.rumours) { const rs3 = cache.rumours; noteRumourMoves(cache.mine.calls.filter((c) => !c.done).map((c) => { const r = rs3.find((x) => x.id === c.rid); if (!r) return null; const st = stageOf(r); return { rid: c.rid, stage: st, p: r.playerName, c: r.linked.find((l) => l.stage === st)?.name || r.linked[0]?.name || '' }; }).filter((x): x is { rid: string; stage: string; p: string; c: string } => !!x)); }
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

// ---------- ON THE WIRE (GOTY §1.6): which players in any mode are live on the Market right now.
// Only the rumours list is needed, so screens outside the Market fetch just that (once), never the calls or the board.
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
export const normName = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
export type WireKey = { id?: string; n?: string; name?: string; s?: string; playerName?: string };
function isLive(r: Rumour): boolean {
  if (r.status && r.status !== 'open') return false;
  const b = cache.board[r.id];
  return !b || b.state === 'open' || b.state === 'frozen';
}
/** The live Market rumour about this player, or null. Matches by player id, then by normalised full or short name. */
export function wireFor(player: WireKey | null | undefined, rumours: Rumour[] | null = cache.rumours): Rumour | null {
  if (!player || !rumours || !rumours.length) return null;
  const live = rumours.filter(isLive);
  if (player.id) { const r = live.find((x) => x.playerId === player.id); if (r) return r; }
  const names = [player.n, player.name, player.playerName, player.s].filter(Boolean).map((x) => normName(x!)).filter((x) => x.length > 3);
  if (!names.length) return null;
  return live.find((x) => names.includes(normName(x.playerName))) || null;
}
/** Hook form: subscribes to the Market cache and fetches the rumours list on first use. */
export function useWireFor(player: WireKey | null | undefined): Rumour | null {
  const [s, set] = useState(cache);
  useEffect(() => { subs.add(set); ensureRumours(); return () => { subs.delete(set); }; }, []);
  return wireFor(player, s.rumours);
}
/** '2027-01' → 'winter', '2027-summer' → 'summer' (for i18n keys), plus the year. */
export const windowParts = (w: string) => { const m = /^(\d{4})-(01|summer)$/.exec(w || ''); return m ? { k: m[2] === '01' ? 'winter' : 'summer', y: m[1] } : null; };
/** The countdown to the next window edge: opens / closes, from the live calendar. Null when the calendar has run out. */
export function windowLine(now: number, cal: Calendar = calendarNow): { k: 'opens' | 'closes'; d: number; h: number; m: number; w: WireWindow } | null {
  for (const w of cal.windows.slice().sort((a, b) => a.opens.localeCompare(b.opens))) {
    const o = Date.parse(w.opens), c = Date.parse(w.closes);
    if (now < o || now < c) { const ms = (now < o ? o : c) - now, d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4); return { k: now < o ? 'opens' : 'closes', d, h, m, w }; }
  }
  return null;
}
