// Live (CONCEPT4 §2, RULES4 §2 Deadline Day): a 90-second stream. Any day it is a practice stream on a random seed;
// on a real deadline day (lib/season.ts DEADLINE_DAYS) it is DD Live: one ranked stream per player on the day's
// shared seed, played locally through lib/driver.ts makeDriver({ mode: 'deadline' }) and replayed on the server
// (api/tier-one/v3 live.dd.start / submit / results) under engine4 rulesFor('deadline'). No stake numbers live here:
// a call scores engine4 WIN / LOSS / SCOOP like everywhere else.
//
// `save.live` is this lane's slot in the save (optional; older saves load unchanged). Besides DD Live it still holds the
// desk's bookkeeping that lib/desk.ts reads and writes (welcome-back, streak stake, flair, idempotency keys).
import { getSave, update, type Save } from './save';
import { v3 } from './api';
import { E4 } from './engine';
import { makeDriver, randomSeed, lastWindow, liveWindow } from './driver';
import { onGain } from './economy';
import { DEADLINE_DAYS, deadlineDayAt, lastDeadlineDay, nextDeadlineDay, type DeadlineDay } from './season';

/** The stream's shape, read from the engine (never a number of ours): 6 stories, 6 DMs, 90 seconds. */
const DD_R = E4.rulesFor('deadline');
export const STREAM = { seconds: DD_R.CLOCK_S || E4.DEADLINE_SECONDS, stories: DD_R.STORIES, dms: DD_R.CALLS[0], contacts: E4.SRC.length } as const;
export const DD_RESULTS_DAYS = 3; // a deadline day's board stays on the Live lobby for three days after it closes

/** My ranked stream on one deadline day: the seed the server handed out, when it started, and what landed. */
export interface DDRun { seed: string; at: number; sent?: number; score?: number; tier?: string; row?: string; rank?: number; players?: number; err?: string }
export interface LiveSave {
  dd?: Record<string, { run?: DDRun; seen?: number; resultsSeen?: number }>;
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
// ?dd=<day>&ddres=1 shows the day's results. Production ignores both.
function devQuery(k: string): string | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(k);
}
export const ddOverride = (): DeadlineDay | null => { const d = devQuery('dd'); return d ? DEADLINE_DAYS.find((x) => x.day === d) || null : null; };
/** The deadline day whose ranked stream is open right now, or null. */
export function ddLiveActive(now = Date.now()): DeadlineDay | null {
  const o = ddOverride(); if (o) return devQuery('ddres') ? null : o;
  return deadlineDayAt(now);
}
/** A deadline day whose board is fresh (closed within DD_RESULTS_DAYS days), or null. */
export function ddResultsDue(now = Date.now()): DeadlineDay | null {
  const o = ddOverride(); if (o) return devQuery('ddres') ? o : null;
  const d = lastDeadlineDay(now);
  return d && now - d.closesAt < DD_RESULTS_DAYS * 864e5 ? d : null;
}
export const ddNext = (now = Date.now()) => nextDeadlineDay(now);
/** Time left on a deadline day's ranked board (it closes at midnight UTC). */
export function ddCountdown(dd: DeadlineDay, now = Date.now()): { ms: number; phase: 'board' | 'over' } {
  return now < dd.closesAt ? { ms: dd.closesAt - now, phase: 'board' } : { ms: 0, phase: 'over' };
}
export const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };

// ---------------------------------------------------------------- the server
export interface DDBoard { day: string; window: string; opensAt: number; closesAt: number; live: boolean; clockS: number; stories: number; players: number; started: { at: number; seed: string } | null; mine: { score: number; tier: string; row: string; scoops: number } | null }
export interface DDRow { nick: string; score: number; tier: string; row: string; me: boolean }
export interface DDMe { rank: number; players: number; score: number; tier: string; row: string; scoops: number }
export interface DDResults { day: string; window: string; opensAt: number; closesAt: number; final: boolean; rows: DDRow[]; players: number; me: DDMe | null }
const who = () => { const s = getSave(); return { dev: s.dev, nick: s.nick }; };
const dayArg = (day?: string) => (day ? { day } : {});
export const fetchDDBoard = (day?: string) => v3<DDBoard>('live.dd.board', { ...who(), ...dayArg(day) });
export const fetchDDResults = (day?: string) => v3<DDResults>('live.dd.results', { ...who(), ...dayArg(day) });
/** Presence (the Daily brief, the Live lobby): counts you in and returns how many players are on today right now. */
export const presence = () => v3<{ day: string; now: number }>('live.presence', { dev: getSave().dev }, 5000);

// ---------------------------------------------------------------- starting a stream
/** Is this seed a ranked DD Live seed (as handed out by the server and kept in the save)? */
export const isRankedSeed = (s: Save, seed: string) => Object.values(liveOf(s).dd || {}).some((d) => d.run?.seed === seed);
/** The ranked run on a deadline day, if one was started on this phone. */
export const myDDRun = (s: Save, day: string): DDRun | null => liveOf(s).dd?.[day]?.run || null;
/** lib/desk.ts reads this as "calls filed today"; in 4.0 it is 1 once the ranked stream has been played. */
export const myDDCalls = (s: Save, day: string): Record<string, number> => { const r = myDDRun(s, day); return r && r.sent ? { run: r.sent } : {}; };
/** A stream that is still running (or can be resumed) on this phone. */
export function liveStream(s: Save = getSave()) {
  const w = liveWindow('deadline', s);
  if (!w) return null;
  const end = w.clockAt ? w.clockAt + STREAM.seconds * 1000 : null;
  return { w, ranked: isRankedSeed(s, w.seed), end, over: end != null && Date.now() > end };
}
/**
 * Starts a stream and leaves it in the save (lib/driver.ts keeps `v4.live.deadline`); the caller then routes to the
 * play screen. `ranked`: today's DD Live, one run per player on the server's seed; otherwise a practice stream.
 */
export async function startStream(ranked: boolean, label?: string): Promise<{ ok: true; seed: string } | { ok: false; err: string }> {
  if (!ranked) {
    const d = makeDriver({ mode: 'deadline', seed: randomSeed(), resume: false, label });
    await d.start();
    return { ok: true, seed: d.seed };
  }
  const dd = ddLiveActive();
  if (!dd) return { ok: false, err: 'not live' };
  const r = await v3<{ day: string; seed: string; at: number; clockS: number }>('live.dd.start', { ...who(), day: dd.day });
  if (!r.ok) return { ok: false, err: r.error };
  // The run is remembered before the window opens, so the finished log goes to the server even after a reload.
  update((x) => { const l = liveDraft(x); const d = (l.dd = l.dd || {}); const e = (d[r.day] = d[r.day] || {}); e.run = { ...(e.run || {}), seed: r.seed, at: r.at }; });
  const left = r.at + r.clockS * 1000 - Date.now();
  if (left < 1000) return { ok: false, err: 'late' };
  const cur = liveWindow('deadline');
  const d = makeDriver({ mode: 'deadline', seed: r.seed, resume: !!cur && cur.seed === r.seed, label });
  await d.start();
  return { ok: true, seed: r.seed };
}

// ---------------------------------------------------------------- after the stream: the ranked log goes up
let sending = false;
/** Sends the finished ranked stream (if one is waiting) to the server. Idempotent; safe to call any time. */
export async function syncDDLive(): Promise<void> {
  if (sending) return;
  const s = getSave(), last = lastWindow('deadline', s);
  if (!last) return;
  const day = Object.entries(liveOf(s).dd || {}).find(([, d]) => d.run?.seed === last.seed && !d.run.sent)?.[0];
  if (!day) return;
  sending = true;
  try {
    const r = await v3<{ run?: { score: number; tier: string; row: string }; me?: DDMe | null }>('live.dd.submit', { ...who(), day, log: last.log });
    if (!r.ok && (r.error === 'net' || r.error === 'rate')) return; // try again on the next open
    const me = (r as { me?: DDMe | null }).me || null;
    update((x) => {
      const e = liveDraft(x).dd?.[day]; if (!e || !e.run) return;
      e.run.sent = Date.now();
      if (!r.ok) e.run.err = r.error;
      if (me) Object.assign(e.run, { score: me.score, tier: me.tier, row: me.row, rank: me.rank, players: me.players });
    });
  } finally { sending = false; }
}
let hooked = false;
/** Registers the settle hook once (ui/social.tsx SocialWatch calls it): a finished Deadline Day window → syncDDLive. */
export function installLiveHooks() {
  if (hooked) return; hooked = true;
  onGain((_g, mode) => { if (mode === 'deadline') setTimeout(() => { void syncDDLive(); }, 0); });
  void syncDDLive();
}

// ---------------------------------------------------------------- local marks
export function markDD(day: string, k: 'seen' | 'resultsSeen') {
  update((x) => { const l = liveDraft(x); const d = (l.dd = l.dd || {}); (d[day] = d[day] || {})[k] = Date.now(); });
}
export const ddMark = (s: Save, day: string, k: 'seen' | 'resultsSeen') => !!liveOf(s).dd?.[day]?.[k];
