// Deadline Day Live (GOTY.md §7.1) and live presence (§7.3), client side. The real deadline days come from
// lib/season.ts (DEADLINE_DAYS); the shared board, the tally and the global table live on the server (live.* actions).
// `save.live` is the lane's slot in the save (optional, defaults safely; older saves load unchanged):
//   dd            per deadline day: my calls as filed, and which films/screens I've seen
//   paperDay      the morning papers were read today          briefDay   the Daily brief was read today
//   lastOpen/lastDay  when the desk last saw you (the welcome-back note after 3+ days away)
//   welcome       a pending welcome-back note                 streakLost the streak a rival "took" (the stake)
//   wireCredits   credits earned by a Daily Tier 1: each shields one wrong Wire call's followers (lib/byline.ts)
//   flair         the Career rank your Daily share card carries (a promotion changes it)
//   streakFilms   streak milestones whose film has played    keys       idempotency keys for the desk's consequences
import { getSave, update, type Save } from './save';
import { v3 } from './api';
import { DEADLINE_DAYS, deadlineDayAt, lastDeadlineDay, nextDeadlineDay, type DeadlineDay } from './season';

export const DD_OUT = ['done', 'hijack', 'stays'] as const;
export type DDOut = 0 | 1 | 2;
// Mirrors the server (api/tier-one/v3/index.js › DD_RIGHT / DD_WRONG / DD_EARLY_X) for the stake preview only.
export const DD_RIGHT = [10, 22, 40], DD_WRONG = [4, 12, 30], DD_EARLY_X = 1.25, DD_EARLY_H = 12;
export const DD_RESULTS_DAYS = 3; // results stay on the desk for three days after the board closes

export interface DDCall { rid: string; o: number; s: number; at: number; ut?: boolean; utAt?: number; from?: { o: number; s: number } }
export interface DDSaga { i: number; rid: string; player: string; playerId: string; from: string; fromId: string; to: { id: string; name: string; stage: string }; others: { id: string | null; name: string }[]; heat: number; market: number; fact: string | null }
export interface DDBoard { day: string; window: string; opensAt: number; closesAt: number; sagas: DDSaga[]; live: boolean; mine: Record<string, DDCall>; counts: Record<string, number[]>; players: number }
export interface DDTally { day: string; closesAt: number; counts: Record<string, number[]>; players: number }
export interface DDResultSaga extends DDSaga { out: number | null; outClub: string | null; pending: boolean }
export interface DDResults { day: string; window: string; opensAt: number; closesAt: number; final: boolean; settled: number; sagas: DDResultSaga[]; rows: { nick: string; pts: number; right: number; n: number; me: boolean }[]; players: number; me: { rank: number; pts: number; calls: Record<string, DDCall> } | null }

export interface LiveSave {
  dd?: Record<string, { calls?: Record<string, DDCall>; seen?: number; openFilm?: number; closeFilm?: number; resultsSeen?: number }>;
  paperDay?: string; briefDay?: string; lastOpen?: number; lastDay?: string;
  welcome?: { days: number; at: number; seen?: boolean } | null;
  streakLost?: { n: number; by: string; at: number; last: string; seen?: boolean } | null;
  wireCredits?: number; flair?: { rank: number; at: number } | null; streakFilms?: Record<string, number>; keys?: string[];
}
export type LiveHost = Save & { live?: LiveSave };
export const liveOf = (s: Save): LiveSave => (s as LiveHost).live || {};
export const liveDraft = (s: Save): LiveSave => { const h = s as LiveHost; return (h.live = h.live || {}); };

// ---------------------------------------------------------------- the calendar
// Dev builds: ?dd=YYYY-MM-DD pretends today is that deadline day (the server honours it with T1_DD_PREVIEW), and
// ?dd=<day>&ddres=1 opens the day's results. Production ignores both.
function devQuery(k: string): string | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(k);
}
export const ddOverride = (): DeadlineDay | null => { const d = devQuery('dd'); return d ? DEADLINE_DAYS.find((x) => x.day === d) || null : null; };
/** The deadline day whose 24 h board is open right now, or null. */
export function ddLiveActive(now = Date.now()): DeadlineDay | null {
  const o = ddOverride(); if (o) return devQuery('ddres') ? null : o;
  return deadlineDayAt(now);
}
/** A deadline day whose results are fresh (closed within DD_RESULTS_DAYS days), or null. */
export function ddResultsDue(now = Date.now()): DeadlineDay | null {
  const o = ddOverride(); if (o) return devQuery('ddres') ? o : null;
  const d = lastDeadlineDay(now);
  return d && now - d.closesAt < DD_RESULTS_DAYS * 864e5 ? d : null;
}
export const ddNext = (now = Date.now()) => nextDeadlineDay(now);
/** 23:00 local on the deadline day (the real window shuts); after that, midnight UTC when the board closes. */
export function ddCountdown(dd: DeadlineDay, now = Date.now()): { ms: number; phase: 'window' | 'board' | 'over' } {
  const local23 = new Date(dd.day + 'T23:00:00').getTime(); // no zone: the player's own clock
  if (now < local23 && local23 <= dd.closesAt + 12 * 3600e3) return { ms: local23 - now, phase: 'window' };
  if (now < dd.closesAt) return { ms: dd.closesAt - now, phase: 'board' };
  return { ms: 0, phase: 'over' };
}
export const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
/** The stake of one call on the board (right / wrong points), mirroring the server. */
export function ddStake(s: number, at = Date.now(), opensAt?: number) {
  const early = opensAt != null && at < opensAt + DD_EARLY_H * 3600e3;
  return { win: Math.round(DD_RIGHT[s - 1] * (early ? DD_EARLY_X : 1)), lose: DD_WRONG[s - 1], early };
}
export const ddIsEarly = (opensAt: number, now = Date.now()) => now < opensAt + DD_EARLY_H * 3600e3;

// ---------------------------------------------------------------- the server
const who = () => { const s = getSave(); return { dev: s.dev, nick: s.nick }; };
const dayArg = (day?: string) => (day ? { day } : {});
export const fetchDDBoard = (day?: string) => v3<DDBoard>('live.dd.board', { ...who(), ...dayArg(day) });
export const fetchDDTally = (day?: string) => v3<DDTally>('live.dd.tally', dayArg(day), 6000);
export const fetchDDResults = (day?: string) => v3<DDResults>('live.dd.results', { ...who(), ...dayArg(day) });
export async function fileDDCall(rid: string, o: number, s: number, day?: string) {
  const r = await v3<{ day: string; call: DDCall; counts: Record<string, number[]>; players: number }>('live.dd.call', { ...who(), rid, o, s, ...dayArg(day) });
  if (r.ok) update((x) => { const l = liveDraft(x); const d = (l.dd = l.dd || {}); const e = (d[r.day] = d[r.day] || {}); e.calls = { ...(e.calls || {}), [rid]: r.call }; });
  return r;
}
/** Presence (§7.3): counts you in and returns how many reporters are on today's board right now. */
export const presence = () => v3<{ day: string; now: number }>('live.presence', { dev: getSave().dev }, 5000);

// ---------------------------------------------------------------- local marks
export function markDD(day: string, k: 'seen' | 'openFilm' | 'closeFilm' | 'resultsSeen') {
  update((x) => { const l = liveDraft(x); const d = (l.dd = l.dd || {}); (d[day] = d[day] || {})[k] = Date.now(); });
}
export const ddMark = (s: Save, day: string, k: 'seen' | 'openFilm' | 'closeFilm' | 'resultsSeen') => !!liveOf(s).dd?.[day]?.[k];
export const myDDCalls = (s: Save, day: string): Record<string, DDCall> => liveOf(s).dd?.[day]?.calls || {};
